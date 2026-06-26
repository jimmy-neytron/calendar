update public.events as event
set
  linked_entity_type = 'birthday',
  linked_entity_id = birthday.id,
  updated_at = now()
from public.birthdays as birthday
where event.id = birthday.event_id
  and (
    event.linked_entity_type is distinct from 'birthday'
    or event.linked_entity_id is distinct from birthday.id
  );

update public.events as event
set
  linked_entity_type = 'birthday-reminder',
  linked_entity_id = birthday.id,
  updated_at = now()
from public.birthdays as birthday
where event.id = birthday.reminder_event_id
  and (
    event.linked_entity_type is distinct from 'birthday-reminder'
    or event.linked_entity_id is distinct from birthday.id
  );
