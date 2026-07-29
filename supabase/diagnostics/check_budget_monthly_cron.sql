select
  jobid,
  jobname,
  schedule,
  active,
  command
from cron.job
where jobname = 'prepare-monthly-budgets';

select
  status,
  start_time,
  end_time,
  return_message
from cron.job_run_details
where jobid = (
  select jobid
  from cron.job
  where jobname = 'prepare-monthly-budgets'
)
order by start_time desc
limit 10;

select
  budget_month.workspace_id,
  budget_month.month,
  budget_month.status,
  count(distinct payment.id) as required_payments,
  count(distinct event.id) as calendar_events
from public.budget_months as budget_month
left join public.budget_payments as payment
  on payment.budget_month_id = budget_month.id
 and payment.recurring_rule_id is not null
left join public.events as event
  on event.linked_entity_type = 'budget-payment'
 and event.linked_entity_id = payment.id
where budget_month.month = date_trunc(
  'month',
  timezone('Europe/Moscow', now())::date
)::date
group by budget_month.workspace_id, budget_month.month, budget_month.status
order by budget_month.workspace_id;
