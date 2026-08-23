-- The application uses `month` as the canonical budget period. Some deployed
-- databases also have a legacy required `period_start` column, which rejects
-- valid inserts made by the current application.
do $$
begin
  if to_regclass('public.budget_months') is null then
    return;
  end if;

  if not exists (
    select 1
    from information_schema.columns
    where table_schema = 'public'
      and table_name = 'budget_months'
      and column_name = 'month'
  ) then
    alter table public.budget_months add column month date;
  end if;

  if exists (
    select 1
    from information_schema.columns
    where table_schema = 'public'
      and table_name = 'budget_months'
      and column_name = 'period_start'
  ) then
    execute 'update public.budget_months
      set month = period_start::date
      where month is null and period_start is not null';
    alter table public.budget_months alter column period_start drop not null;
  end if;

  if exists (select 1 from public.budget_months where month is null) then
    raise exception 'Cannot align budget_months: rows without a budget period remain';
  end if;

  alter table public.budget_months alter column month set not null;

  if not exists (
    select 1
    from information_schema.table_constraints as constraint_info
    join information_schema.key_column_usage as column_info
      on column_info.constraint_schema = constraint_info.constraint_schema
      and column_info.constraint_name = constraint_info.constraint_name
    where constraint_info.table_schema = 'public'
      and constraint_info.table_name = 'budget_months'
      and constraint_info.constraint_type = 'UNIQUE'
    group by constraint_info.constraint_name
    having string_agg(column_info.column_name, ',' order by column_info.ordinal_position)
      = 'workspace_id,month'
  ) then
    create unique index if not exists budget_months_workspace_month_unique_idx
      on public.budget_months (workspace_id, month);
  end if;
end
$$;
