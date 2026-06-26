update public.events as event
set
  linked_entity_type = 'budget-payment',
  linked_entity_id = payment.id,
  updated_at = now()
from public.budget_payments as payment
where event.id = payment.calendar_event_id
  and (
    event.linked_entity_type is distinct from 'budget-payment'
    or event.linked_entity_id is distinct from payment.id
  );
