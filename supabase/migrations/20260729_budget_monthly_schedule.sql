do $$
declare
  existing_job_id bigint;
begin
  select jobid
    into existing_job_id
  from cron.job
  where jobname = 'prepare-monthly-budgets';

  if existing_job_id is not null then
    perform cron.unschedule(existing_job_id);
  end if;

  perform cron.schedule(
    'prepare-monthly-budgets',
    '5 0 1 * *',
    'select public.prepare_budget_months();'
  );
end;
$$;
