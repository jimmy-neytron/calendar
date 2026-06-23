do $migration$
declare
  function_definition text;
begin
  select pg_get_functiondef(
    'public.enqueue_hourly_event_reminders()'::regprocedure
  )
  into function_definition;

  function_definition := replace(
    function_definition,
    'now() AS current_time',
    'now() AS now_at'
  );
  function_definition := replace(
    function_definition,
    'now() as current_time',
    'now() as now_at'
  );
  function_definition := replace(
    function_definition,
    'SELECT settings.current_time',
    'SELECT settings.now_at'
  );
  function_definition := replace(
    function_definition,
    'select current_time from settings',
    'select now_at from settings'
  );
  function_definition := replace(
    function_definition,
    'current_time',
    'now_at'
  );
  function_definition := replace(
    function_definition,
    'event.reminder = ANY (ARRAY[''15m''::text, ''1h''::text, ''1d''::text])',
    'event.reminder = ANY (ARRAY[''1h''::text, ''1d''::text])'
  );
  function_definition := replace(
    function_definition,
    'event.reminder in (''15m'', ''1h'', ''1d'')',
    'event.reminder in (''1h'', ''1d'')'
  );
  function_definition := replace(
    function_definition,
    'WHEN ''15m''::text THEN ''00:15:00''::interval',
    ''
  );
  function_definition := replace(
    function_definition,
    'when ''15m'' then interval ''15 minutes''',
    ''
  );

  execute function_definition;
end;
$migration$;
