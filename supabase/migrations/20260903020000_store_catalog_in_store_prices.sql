begin;

-- Support physical-store shopType=1/catalogType=1 without converting delivery
-- sources or changing existing products, links, history or schedules.
-- Retain the established locks, admin checks, cleanup and invalidation rules.
create or replace function public.save_store_catalog_snapshot(
  p_source_id uuid, p_store_code text, p_store_type text, p_catalog_type text,
  p_received_at timestamptz, p_products jsonb, p_manual boolean default false, p_weighted_pricing boolean default false
) returns void language plpgsql security invoker set search_path = public as $$
declare
  source public.store_catalog_sources%rowtype;
begin
  select * into strict source from public.store_catalog_sources where id = p_source_id for update;
  perform pg_advisory_xact_lock(hashtextextended(source.workspace_id || ':' || source.store, 0));
  if not coalesce(p_manual, false) and not source.enabled then
    raise exception 'Автообновление выключено. Для обновления используйте ручной запуск.';
  end if;
  if source.store_code <> p_store_code
    or substring(source.url from '[?&]shopType=([^&#]+)') is distinct from p_store_type
    or coalesce(substring(source.url from '[?&]catalogType=([^&#]+)'), case when substring(source.url from '[?&]shopType=([^&#]+)') = '1' then '1' else '2' end) <> p_catalog_type then
    raise exception 'Магазин или режим покупки изменился. Повторите загрузку.';
  end if;
  if exists (
    select 1 from public.store_catalog_sources s
    where s.workspace_id = source.workspace_id and s.store = source.store and s.enabled
      and (s.store_code <> p_store_code
        or substring(s.url from '[?&]shopType=([^&#]+)') is distinct from p_store_type
        or coalesce(substring(s.url from '[?&]catalogType=([^&#]+)'), case when substring(s.url from '[?&]shopType=([^&#]+)') = '1' then '1' else '2' end) <> p_catalog_type)
  ) then raise exception 'Источники должны относиться к одному магазину и режиму покупки.'; end if;
  if jsonb_typeof(p_products) <> 'array' or jsonb_array_length(p_products) = 0 then
    raise exception 'Пустой снимок каталога.';
  end if;
  if exists (select 1 from public.store_products where workspace_id = source.workspace_id
      and store = source.store and price_updated_at > p_received_at) then
    raise exception 'Уже сохранена более свежая загрузка. Повторите синхронизацию.';
  end if;

  -- After a store change, don't combine its prices with the previous store.
  update public.store_products set price_verified = false
  where workspace_id = source.workspace_id and store = source.store and price_verified
    and (price_store_code is distinct from p_store_code or price_store_type is distinct from p_store_type
      or price_catalog_type is distinct from p_catalog_type);

  if p_weighted_pricing and exists (
    select 1 from jsonb_to_recordset(p_products) as x(is_weighted boolean, current_price numeric,
      package_amount numeric, package_unit text, weight_step numeric, weight_minimum numeric, unit_price numeric)
    where x.is_weighted and x.current_price is not null
      and (coalesce(x.package_amount, 0) <= 0 or x.package_unit is distinct from 'g'
        or coalesce(x.weight_step, 0) <= 0 or coalesce(x.weight_minimum, 0) <= 0 or coalesce(x.unit_price, 0) <= 0)
  ) then raise exception 'Неполные данные цены весового товара.'; end if;

  -- Preserve manual packaging. New history entries compare against the old snapshot.
  insert into public.store_product_price_history(product_id, store, price, old_price, received_at)
  select p.id, source.store, x.current_price, x.old_price, p_received_at
  from jsonb_to_recordset(p_products) as x(product_code text, current_price numeric, old_price numeric)
  join public.store_products p on p.workspace_id = source.workspace_id and p.store = source.store and p.product_code = x.product_code
  where x.current_price > 0 and (not p.price_verified or p.current_price is distinct from x.current_price or p.old_price is distinct from x.old_price);

  insert into public.store_products as p (
    workspace_id, store, product_code, name, normalized_name, image_url, product_url,
    package_amount, package_unit, current_price, old_price, price_updated_at,
    is_weighted, weight_step, weight_minimum, unit_price,
    price_verified, price_store_code, price_store_type, price_catalog_type, price_source_id, updated_at
  ) select source.workspace_id, source.store, x.product_code, x.name, x.normalized_name, x.image_url, x.product_url,
    x.package_amount, x.package_unit, x.current_price, x.old_price, p_received_at,
    coalesce(x.is_weighted, false), x.weight_step, x.weight_minimum, x.unit_price,
    coalesce(x.current_price > 0, false), p_store_code, p_store_type, p_catalog_type, p_source_id, now()
  from jsonb_to_recordset(p_products) as x(product_code text, name text, normalized_name text, image_url text,
    product_url text, package_amount numeric, package_unit text, current_price numeric, old_price numeric,
    is_weighted boolean, weight_step numeric, weight_minimum numeric, unit_price numeric)
  on conflict (workspace_id, store, product_code) do update set
    name = excluded.name, normalized_name = excluded.normalized_name, image_url = excluded.image_url, product_url = excluded.product_url,
    package_amount = case when p.package_is_manual and not p.is_weighted and not excluded.is_weighted then p.package_amount else excluded.package_amount end,
    package_unit = case when p.package_is_manual and not p.is_weighted and not excluded.is_weighted then p.package_unit else excluded.package_unit end,
    package_is_manual = p.package_is_manual and not p.is_weighted and not excluded.is_weighted,
    is_weighted = excluded.is_weighted, weight_step = excluded.weight_step,
    weight_minimum = excluded.weight_minimum, unit_price = excluded.unit_price,
    current_price = excluded.current_price, old_price = excluded.old_price, price_updated_at = excluded.price_updated_at,
    price_verified = excluded.price_verified, price_store_code = excluded.price_store_code,
    price_store_type = excluded.price_store_type, price_catalog_type = excluded.price_catalog_type,
    price_source_id = excluded.price_source_id, updated_at = now();

  insert into public.store_product_price_history(product_id, store, price, old_price, received_at)
  select p.id, p.store, p.current_price, p.old_price, p_received_at from public.store_products p
  where p.workspace_id = source.workspace_id and p.store = source.store and p.price_source_id = p_source_id
    and p.price_updated_at = p_received_at and p.current_price > 0
    and not exists (select 1 from public.store_product_price_history h where h.product_id = p.id);

  insert into public.store_source_products(source_id, product_id, last_seen_at)
  select p_source_id, p.id, p_received_at from public.store_products p
  join jsonb_to_recordset(p_products) as x(product_code text) on x.product_code = p.product_code
  where p.workspace_id = source.workspace_id and p.store = source.store
  on conflict (source_id, product_id) do update set last_seen_at = excluded.last_seen_at;

  -- Missing products keep ingredient links/history, but lose price confirmation.
  update public.store_products p set price_verified = false
  where p.price_source_id = p_source_id
    and not exists (select 1 from jsonb_to_recordset(p_products) as x(product_code text) where x.product_code = p.product_code);

  update public.store_catalog_sources set status = 'success', last_error = '',
    product_count = jsonb_array_length(p_products), last_synced_at = p_received_at,
    next_sync_at = p_received_at + interval '12 hours', updated_at = now() where id = p_source_id;
end;
$$;

revoke all on function public.save_store_catalog_snapshot(uuid,text,text,text,timestamptz,jsonb,boolean,boolean) from public, anon, authenticated;
grant execute on function public.save_store_catalog_snapshot(uuid,text,text,text,timestamptz,jsonb,boolean,boolean) to service_role;

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
      or not (
        (coalesce(substring(p_url from '[?&]shopType=([^&#]+)'), '') = '1'
          and coalesce(substring(p_url from '[?&]catalogType=([^&#]+)'), '1') = '1')
        or (coalesce(substring(p_url from '[?&]shopType=([^&#]+)'), '') in ('express', 'dostavka')
          and coalesce(substring(p_url from '[?&]catalogType=([^&#]+)'), '2') in ('2', '3'))
      )
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
notify pgrst, 'reload schema';
