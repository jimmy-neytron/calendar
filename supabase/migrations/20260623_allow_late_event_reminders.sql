do $migration$
declare
  function_definition text;
begin
  select pg_get_functiondef(
    'public.enqueue_hourly_event_reminders()'::regprocedure
  )
  into function_definition;

  function_definition := regexp_replace(
    function_definition,
    E'\\s+AND reminder\\.reminder_at >= \\( SELECT settings\\.now_at\\s+FROM settings\\)',
    '',
    'i'
  );

  function_definition := replace(
    function_definition,
    'and reminder.reminder_at >= (select now_at from settings)',
    ''
  );

  function_definition := replace(
    function_definition,
    'AND reminder.reminder_at >= ( SELECT settings.now_at FROM settings)',
    ''
  );

  execute function_definition;
end;
$migration$;
