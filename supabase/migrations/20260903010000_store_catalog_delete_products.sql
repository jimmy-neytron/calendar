begin;

-- Explicit product deletion, including products no longer linked to a source.
-- Unlike source/category cleanup, selected products are removed from ALL sources.
create or replace function public.delete_store_catalog_products(p_workspace_id text, p_product_ids uuid[])
returns jsonb language plpgsql security invoker set search_path = public as $$
declare
  affected_sources uuid[];
  deleted_ids uuid[];
  source_rows jsonb;
begin
  if not coalesce(public.is_admin(auth.uid()), false) then
    raise exception 'Удаление товаров доступно только администратору.';
  end if;
  if p_workspace_id is null or btrim(p_workspace_id) = '' or coalesce(cardinality(p_product_ids), 0) = 0
    or array_position(p_product_ids, null) is not null then
    raise exception 'Выберите товары и рабочее пространство.';
  end if;
  -- Match the lock order used by source management and snapshot saving.
  perform id from public.store_catalog_sources where workspace_id = p_workspace_id order by id for update;
  if exists (select 1 from public.store_catalog_sources where workspace_id = p_workspace_id and status = 'syncing') then
    raise exception 'Дождитесь завершения синхронизации перед удалением товаров.';
  end if;
  perform pg_advisory_xact_lock(hashtextextended(p_workspace_id || ':magnit', 0));
  if exists (
    select 1 from unnest(p_product_ids) as selected(id)
    where not exists (select 1 from public.store_products p where p.id = selected.id and p.workspace_id = p_workspace_id)
  ) then raise exception 'Некоторые товары уже удалены или недоступны. Обновите каталог.'; end if;

  select coalesce(array_agg(distinct sp.source_id), '{}'::uuid[]) into affected_sources
    from public.store_source_products sp join public.store_catalog_sources s on s.id = sp.source_id
    where sp.product_id = any(p_product_ids) and s.workspace_id = p_workspace_id;
  with removed as (
    delete from public.store_products where workspace_id = p_workspace_id and id = any(p_product_ids) returning id
  ) select coalesce(array_agg(id), '{}'::uuid[]) into deleted_ids from removed;
  -- FK cascades remove only selected products' associations, history and ingredient links.
  update public.store_catalog_sources s set product_count = (
    select count(*) from public.store_source_products sp where sp.source_id = s.id
  ), updated_at = clock_timestamp()
    where s.workspace_id = p_workspace_id and s.id = any(affected_sources);
  select coalesce(jsonb_agg(to_jsonb(s)), '[]'::jsonb) into source_rows
    from public.store_catalog_sources s where s.workspace_id = p_workspace_id and s.id = any(affected_sources);
  return jsonb_build_object('deleted_product_ids', to_jsonb(deleted_ids), 'sources', source_rows);
end;
$$;

revoke all on function public.delete_store_catalog_products(text, uuid[]) from public, anon;
grant execute on function public.delete_store_catalog_products(text, uuid[]) to authenticated;

commit;
