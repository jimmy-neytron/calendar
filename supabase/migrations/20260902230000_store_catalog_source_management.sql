begin;

-- Source changes and invalidation belong to one transaction. Products shared
-- with another source are never deleted by category cleanup.
create or replace function public.manage_store_catalog_source(
  p_workspace_id text, p_source_id uuid, p_action text,
  p_name text default null, p_url text default null, p_store_code text default null
) returns jsonb language plpgsql security invoker set search_path = public as $$
declare
  source public.store_catalog_sources%rowtype;
  context_changed boolean;
  deleted_ids uuid[] := '{}';
begin
  if not coalesce(public.is_admin(auth.uid()), false) then
    raise exception 'Управление источниками доступно только администратору.';
  end if;
  if p_action is null or p_action not in ('update', 'delete', 'clear_products') then
    raise exception 'Неизвестное действие с источником.';
  end if;
  select * into source from public.store_catalog_sources
    where id = p_source_id and workspace_id = p_workspace_id for update;
  if not found then raise exception 'Источник не найден. Обновите список.'; end if;
  if source.status = 'syncing' then
    raise exception 'Дождитесь завершения синхронизации источника.';
  end if;
  -- Same lock order as save_store_catalog_snapshot: source, then workspace/store.
  perform pg_advisory_xact_lock(hashtextextended(source.workspace_id || ':' || source.store, 0));

  if p_action = 'update' then
    p_name := btrim(p_name); p_url := btrim(p_url); p_store_code := btrim(p_store_code);
    if coalesce(length(p_name), 0) not between 1 and 120
      or p_url is null or p_url !~ '^https://magnit\.ru/catalog/[0-9]+(-|/|\?|$)'
      or p_store_code is null or p_store_code !~ '^[0-9]{4,12}$'
      or coalesce(substring(p_url from '[?&]shopType=([^&#]+)'), '') not in ('express', 'dostavka')
      or coalesce(substring(p_url from '[?&]catalogType=([^&#]+)'), '2') not in ('2', '3')
      or coalesce(substring(p_url from '[?&]shopCode=([^&#]+)'), p_store_code) <> p_store_code then
      raise exception 'Проверьте название, ссылку и код магазина.';
    end if;
    context_changed := source.url is distinct from p_url or source.store_code is distinct from p_store_code;
    if context_changed then
      update public.store_products set price_verified = false
        where workspace_id = p_workspace_id and price_source_id = p_source_id;
    end if;
    update public.store_catalog_sources set name = p_name, url = p_url, store_code = p_store_code, updated_at = clock_timestamp(),
      status = case when context_changed then 'idle' else status end,
      last_error = case when context_changed then '' else last_error end,
      last_synced_at = case when context_changed then null else last_synced_at end,
      next_sync_at = case when context_changed then now() else next_sync_at end,
      product_count = case when context_changed then 0 else product_count end
      where id = p_source_id and workspace_id = p_workspace_id returning * into source;
  else
    update public.store_products set price_verified = false, price_source_id = null
      where workspace_id = p_workspace_id and price_source_id = p_source_id;
    if p_action = 'delete' then
      -- FK removes source associations, but products, history and ingredient links remain.
      delete from public.store_catalog_sources where id = p_source_id and workspace_id = p_workspace_id;
      return jsonb_build_object('source', null);
    end if;

    with removed as (
      delete from public.store_products p
      where p.workspace_id = p_workspace_id and p.store = source.store
        and exists (select 1 from public.store_source_products sp where sp.product_id = p.id and sp.source_id = p_source_id)
        and not exists (select 1 from public.store_source_products sp where sp.product_id = p.id and sp.source_id <> p_source_id)
      returning p.id
    ) select coalesce(array_agg(id), '{}'::uuid[]) into deleted_ids from removed;
    delete from public.store_source_products where source_id = p_source_id;
    -- Pause auto so cleanup is not immediately undone by the scheduler.
    update public.store_catalog_sources set enabled = false, status = 'idle', last_error = '', updated_at = clock_timestamp(),
      last_synced_at = null, next_sync_at = now(), product_count = 0
      where id = p_source_id and workspace_id = p_workspace_id returning * into source;
  end if;
  return jsonb_build_object('source', to_jsonb(source), 'deleted_product_ids', to_jsonb(deleted_ids));
end;
$$;

revoke all on function public.manage_store_catalog_source(text, uuid, text, text, text, text) from public, anon;
grant execute on function public.manage_store_catalog_source(text, uuid, text, text, text, text) to authenticated;

commit;
