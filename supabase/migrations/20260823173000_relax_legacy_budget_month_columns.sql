-- Older deployments can contain required budget_months columns that are not
-- part of the current application contract. Once period_start is removed,
-- PostgreSQL can expose the next one (for example period_end). Preserve those
-- legacy values, but stop requiring current clients to populate unused fields.
do $$
declare
  legacy_column record;
begin
  if to_regclass('public.budget_months') is null then
    return;
  end if;

  for legacy_column in
    select column_name
    from information_schema.columns
    where table_schema = 'public'
      and table_name = 'budget_months'
      and is_nullable = 'NO'
      and column_name not in (
        'id',
        'workspace_id',
        'month',
        'planned_income',
        'status',
        'created_by',
        'created_at',
        'updated_at'
      )
  loop
    execute format(
      'alter table public.budget_months alter column %I drop not null',
      legacy_column.column_name
    );
  end loop;
end
$$;

notify pgrst, 'reload schema';
