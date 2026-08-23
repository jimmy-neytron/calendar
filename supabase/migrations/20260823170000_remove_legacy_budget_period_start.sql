-- This must be a new migration version: already-applied migrations are not
-- executed again when their SQL file is edited locally.
do $$
begin
  if to_regclass('public.budget_months') is null then
    return;
  end if;

  if exists (
    select 1
    from information_schema.columns
    where table_schema = 'public'
      and table_name = 'budget_months'
      and column_name = 'period_start'
  ) then
    if not exists (
      select 1
      from information_schema.columns
      where table_schema = 'public'
        and table_name = 'budget_months'
        and column_name = 'month'
    ) then
      alter table public.budget_months add column month date;
    end if;

    execute 'update public.budget_months
      set month = period_start::date
      where month is null and period_start is not null';

    if exists (select 1 from public.budget_months where month is null) then
      raise exception 'Cannot remove period_start: budget months without a period remain';
    end if;

    alter table public.budget_months alter column month set not null;
    alter table public.budget_months drop column period_start;
  end if;
end
$$;

notify pgrst, 'reload schema';
