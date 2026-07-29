create extension if not exists pg_cron with schema pg_catalog;

create or replace function public.prepare_budget_months(
  target_date date default null
)
returns jsonb
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  month_start date := date_trunc(
    'month',
    coalesce(target_date, timezone('Europe/Moscow', now())::date)
  )::date;
  workspace_record record;
  template_record record;
  rule_record record;
  month_id text;
  category_id text;
  payment_id text;
  event_id text;
  calendar_id text;
  due_date date;
  month_status text;
  apply_defaults boolean;
  payment_was_created boolean;
  created_months integer := 0;
  created_categories integer := 0;
  created_payments integer := 0;
  created_events integer := 0;
begin
  for workspace_record in
    select
      settings.workspace_id,
      settings.default_income,
      workspace.owner_id as created_by
    from public.budget_settings as settings
    join public.workspaces as workspace
      on workspace.id = settings.workspace_id
    left join public.workspace_features as features
      on features.workspace_id = settings.workspace_id
    where settings.setup_completed is true
      and coalesce(features.budget_enabled, true) is true
  loop
    perform pg_advisory_xact_lock(
      hashtextextended('budget-month:' || workspace_record.workspace_id || ':' || month_start::text, 0)
    );

    select budget_month.id, budget_month.status
      into month_id, month_status
    from public.budget_months as budget_month
    where budget_month.workspace_id = workspace_record.workspace_id
      and budget_month.month = month_start;

    if month_id is null then
      insert into public.budget_months (
        workspace_id,
        month,
        planned_income,
        status,
        created_by
      )
      values (
        workspace_record.workspace_id,
        month_start,
        workspace_record.default_income,
        'active',
        workspace_record.created_by
      )
      returning id into month_id;

      created_months := created_months + 1;
      apply_defaults := true;
    else
      apply_defaults := month_status = 'draft';

      if apply_defaults then
        update public.budget_months
        set planned_income = workspace_record.default_income,
            status = 'active',
            updated_at = now()
        where id = month_id;
      end if;
    end if;

    if apply_defaults then
      for template_record in
        select template.*
        from public.budget_category_templates as template
        where template.workspace_id = workspace_record.workspace_id
          and template.active is true
        order by template.sort_order, template.created_at
      loop
        if not exists (
          select 1
          from public.budget_categories as category
          where category.budget_month_id = month_id
            and (
              category.template_id = template_record.id
              or lower(category.name) = lower(template_record.name)
            )
        ) then
          insert into public.budget_categories (
            workspace_id,
            budget_month_id,
            name,
            planned_amount,
            color,
            sort_order,
            template_id
          )
          values (
            workspace_record.workspace_id,
            month_id,
            template_record.name,
            template_record.default_amount,
            template_record.color,
            template_record.sort_order,
            template_record.id
          );

          created_categories := created_categories + 1;
        end if;
      end loop;
    end if;

    for rule_record in
      select rule.*
      from public.budget_recurring_rules as rule
      where rule.workspace_id = workspace_record.workspace_id
        and rule.active is true
      order by rule.due_day, rule.created_at
    loop
      select category.id
        into category_id
      from public.budget_categories as category
      where category.budget_month_id = month_id
        and lower(category.name) = lower(rule_record.category_name)
      order by category.created_at
      limit 1;

      if category_id is null then
        insert into public.budget_categories (
          workspace_id,
          budget_month_id,
          name,
          planned_amount,
          color,
          sort_order
        )
        values (
          workspace_record.workspace_id,
          month_id,
          rule_record.category_name,
          0,
          '#f59e0b',
          -1
        )
        returning id into category_id;

        created_categories := created_categories + 1;
      end if;

      due_date := (
        month_start
        + (
          least(
            rule_record.due_day,
            extract(day from (month_start + interval '1 month - 1 day'))::integer
          ) - 1
        )
      )::date;

      insert into public.budget_payments (
        workspace_id,
        budget_month_id,
        category_id,
        recurring_rule_id,
        title,
        planned_amount,
        due_date,
        status,
        reminder,
        calendar_enabled,
        created_by
      )
      values (
        workspace_record.workspace_id,
        month_id,
        category_id,
        rule_record.id,
        rule_record.title,
        rule_record.default_amount,
        due_date,
        'planned',
        rule_record.reminder,
        rule_record.calendar_enabled,
        workspace_record.created_by
      )
      on conflict (budget_month_id, recurring_rule_id) do nothing
      returning id into payment_id;

      payment_was_created := payment_id is not null;

      if payment_was_created then
        created_payments := created_payments + 1;
      else
        select payment.id
          into payment_id
        from public.budget_payments as payment
        where payment.budget_month_id = month_id
          and payment.recurring_rule_id = rule_record.id;
      end if;

      if rule_record.calendar_enabled is true then
        select payment.calendar_event_id
          into event_id
        from public.budget_payments as payment
        where payment.id = payment_id;

        if event_id is null then
          select event.id
            into event_id
          from public.events as event
          where event.linked_entity_type = 'budget-payment'
            and event.linked_entity_id = payment_id
          order by event.created_at
          limit 1;
        end if;

        if event_id is null then
          select collection.id
            into calendar_id
          from public.calendar_collections as collection
          where collection.workspace_id = workspace_record.workspace_id
            and collection.visible is true
          order by collection.created_at
          limit 1;

          insert into public.events (
            workspace_id,
            title,
            date,
            start_time,
            end_time,
            calendar_id,
            category,
            notes,
            all_day,
            repeat,
            importance,
            reminder,
            linked_entity_type,
            linked_entity_id,
            created_by
          )
          values (
            workspace_record.workspace_id,
            rule_record.title,
            due_date,
            '09:00',
            '09:30',
            calendar_id,
            'home',
            trim(to_char(rule_record.default_amount, 'FM999999999990D00')) || ' ₽ · ' || rule_record.category_name,
            false,
            'none',
            'important',
            rule_record.reminder,
            'budget-payment',
            payment_id,
            workspace_record.created_by
          )
          returning id into event_id;

          created_events := created_events + 1;
        end if;

        update public.budget_payments
        set calendar_event_id = event_id,
            updated_at = now()
        where id = payment_id
          and calendar_event_id is distinct from event_id;
      end if;

      if payment_was_created then
        update public.budget_categories as category
        set planned_amount = greatest(
              category.planned_amount,
              (
                select coalesce(sum(payment.planned_amount), 0)
                from public.budget_payments as payment
                where payment.category_id = category.id
                  and payment.recurring_rule_id is not null
              )
            ),
            updated_at = now()
        where category.id = category_id;
      end if;

      payment_id := null;
      event_id := null;
      calendar_id := null;
      category_id := null;
      payment_was_created := false;
    end loop;

    month_id := null;
    month_status := null;
    apply_defaults := false;
  end loop;

  return jsonb_build_object(
    'month', month_start,
    'createdMonths', created_months,
    'createdCategories', created_categories,
    'createdPayments', created_payments,
    'createdEvents', created_events
  );
end;
$$;

revoke all on function public.prepare_budget_months(date) from public;
revoke all on function public.prepare_budget_months(date) from anon;
revoke all on function public.prepare_budget_months(date) from authenticated;

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
