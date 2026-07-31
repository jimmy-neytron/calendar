begin;

update public.personal_parameters
set category = 'other', updated_at = now()
where category in ('home', 'devices', 'vehicle');

alter table public.personal_parameters
  drop constraint if exists personal_parameters_category_check;

alter table public.personal_parameters
  add constraint personal_parameters_category_check
  check (category in ('clothes', 'personal', 'other'));

commit;

