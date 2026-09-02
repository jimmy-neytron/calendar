begin;

-- Keep previous values/history, but never treat old SEO imports as verified.
alter table public.store_products
  add column price_verified boolean not null default false,
  add column price_store_code text,
  add column price_store_type text,
  add column price_catalog_type text,
  add column price_source_id uuid references public.store_catalog_sources(id) on delete set null;

create or replace function public.save_store_catalog_snapshot(
  p_source_id uuid, p_store_code text, p_store_type text, p_catalog_type text,
  p_received_at timestamptz, p_products jsonb
) returns void language plpgsql security invoker set search_path = public as $$
declare
  source public.store_catalog_sources%rowtype;
begin
  select * into strict source from public.store_catalog_sources where id = p_source_id for update;
  perform pg_advisory_xact_lock(hashtextextended(source.workspace_id || ':' || source.store, 0));
  if not source.enabled or source.store_code <> p_store_code then
    raise exception 'Источник выключен или магазин изменился. Повторите загрузку.';
  end if;
  if exists (
    select 1 from public.store_catalog_sources s
    where s.workspace_id = source.workspace_id and s.store = source.store and s.enabled
      and (s.store_code <> p_store_code
        or substring(s.url from '[?&]shopType=([^&#]+)') is distinct from p_store_type
        or coalesce(substring(s.url from '[?&]catalogType=([^&#]+)'), '2') <> p_catalog_type)
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

  -- Preserve manual packaging. New history entries compare against the old snapshot.
  insert into public.store_product_price_history(product_id, store, price, old_price, received_at)
  select p.id, source.store, x.current_price, x.old_price, p_received_at
  from jsonb_to_recordset(p_products) as x(product_code text, current_price numeric, old_price numeric)
  join public.store_products p on p.workspace_id = source.workspace_id and p.store = source.store and p.product_code = x.product_code
  where x.current_price > 0 and (not p.price_verified or p.current_price is distinct from x.current_price or p.old_price is distinct from x.old_price);

  insert into public.store_products as p (
    workspace_id, store, product_code, name, normalized_name, image_url, product_url,
    package_amount, package_unit, current_price, old_price, price_updated_at,
    price_verified, price_store_code, price_store_type, price_catalog_type, price_source_id, updated_at
  ) select source.workspace_id, source.store, x.product_code, x.name, x.normalized_name, x.image_url, x.product_url,
    x.package_amount, x.package_unit, x.current_price, x.old_price, p_received_at,
    coalesce(x.current_price > 0, false), p_store_code, p_store_type, p_catalog_type, p_source_id, now()
  from jsonb_to_recordset(p_products) as x(product_code text, name text, normalized_name text, image_url text,
    product_url text, package_amount numeric, package_unit text, current_price numeric, old_price numeric)
  on conflict (workspace_id, store, product_code) do update set
    name = excluded.name, normalized_name = excluded.normalized_name, image_url = excluded.image_url, product_url = excluded.product_url,
    package_amount = case when p.package_is_manual then p.package_amount else excluded.package_amount end,
    package_unit = case when p.package_is_manual then p.package_unit else excluded.package_unit end,
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

revoke all on function public.save_store_catalog_snapshot(uuid,text,text,text,timestamptz,jsonb) from public, anon, authenticated;
grant execute on function public.save_store_catalog_snapshot(uuid,text,text,text,timestamptz,jsonb) to service_role;
commit;
notify pgrst, 'reload schema';
