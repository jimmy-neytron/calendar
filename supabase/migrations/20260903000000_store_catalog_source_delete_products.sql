begin;

-- Reuse the scoped, admin-only cleanup rules, including shared-product safety.
-- Both calls run in the same transaction and hold the source/workspace locks
-- until commit. A failure rolls back the cleanup as well as source deletion.
create or replace function public.delete_store_catalog_source(
  p_workspace_id text, p_source_id uuid, p_delete_products boolean default true
) returns jsonb language plpgsql security invoker set search_path = public as $$
declare
  deleted_ids jsonb := '[]'::jsonb;
  result jsonb;
begin
  if p_delete_products is null then raise exception 'Укажите, нужно ли удалить товары источника.'; end if;
  if p_delete_products then
    result := public.manage_store_catalog_source(p_workspace_id, p_source_id, 'clear_products');
    deleted_ids := result->'deleted_product_ids';
  end if;
  result := public.manage_store_catalog_source(p_workspace_id, p_source_id, 'delete');
  return result || jsonb_build_object('deleted_product_ids', deleted_ids);
end;
$$;

revoke all on function public.delete_store_catalog_source(text, uuid, boolean) from public, anon;
grant execute on function public.delete_store_catalog_source(text, uuid, boolean) to authenticated;

commit;
