begin;

-- Keep the server-side feature map aligned with the client subscription map.
create or replace function public.user_has_subscription_feature(
  user_id uuid,
  feature text
)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select coalesce((
    select case lower(coalesce($2, ''))
      when 'calendar' then true
      when 'budget' then true
      when 'birthdays' then true
      when 'ideas' then true
      when 'workspace' then profile.subscription_tier = 'pro'
      when 'analytics' then profile.subscription_tier = 'pro'
      when 'activity' then profile.subscription_tier = 'pro'
      when 'integrations' then profile.subscription_tier = 'pro'
      when 'extrasections' then profile.subscription_tier = 'pro'
      when 'timetracking' then profile.subscription_tier = 'pro'
      when 'sport' then profile.subscription_tier = 'pro'
      when 'movies' then profile.subscription_tier = 'pro'
      when 'knowledge' then profile.subscription_tier = 'pro'
      when 'meals' then profile.subscription_tier = 'pro'
      when 'investments' then profile.subscription_tier = 'pro'
      when 'coupons' then profile.subscription_tier = 'pro'
      else false
    end
    from public.profiles as profile
    where profile.id = $1
  ), false);
$$;

grant execute on function public.user_has_subscription_feature(uuid, text) to authenticated;

drop policy if exists knowledge_notes_select_own on public.knowledge_notes;
drop policy if exists knowledge_notes_insert_own on public.knowledge_notes;
drop policy if exists knowledge_notes_update_own on public.knowledge_notes;
drop policy if exists knowledge_notes_delete_own on public.knowledge_notes;
create policy knowledge_notes_select_own on public.knowledge_notes for select to authenticated
  using (user_id = auth.uid() and public.is_workspace_member(workspace_id) and public.user_has_subscription_feature(auth.uid(), 'knowledge'));
create policy knowledge_notes_insert_own on public.knowledge_notes for insert to authenticated
  with check (user_id = auth.uid() and public.is_workspace_member(workspace_id) and public.user_has_subscription_feature(auth.uid(), 'knowledge'));
create policy knowledge_notes_update_own on public.knowledge_notes for update to authenticated
  using (user_id = auth.uid() and public.is_workspace_member(workspace_id) and public.user_has_subscription_feature(auth.uid(), 'knowledge'))
  with check (user_id = auth.uid() and public.is_workspace_member(workspace_id) and public.user_has_subscription_feature(auth.uid(), 'knowledge'));
create policy knowledge_notes_delete_own on public.knowledge_notes for delete to authenticated
  using (user_id = auth.uid() and public.is_workspace_member(workspace_id) and public.user_has_subscription_feature(auth.uid(), 'knowledge'));

drop policy if exists meal_recipes_select_members on public.meal_recipes;
drop policy if exists meal_recipes_insert_members on public.meal_recipes;
drop policy if exists meal_recipes_update_members on public.meal_recipes;
drop policy if exists meal_recipes_delete_members on public.meal_recipes;
drop policy if exists meal_weeks_select_members on public.meal_weeks;
drop policy if exists meal_weeks_insert_members on public.meal_weeks;
drop policy if exists meal_weeks_update_members on public.meal_weeks;
drop policy if exists meal_weeks_delete_members on public.meal_weeks;
create policy meal_recipes_select_members on public.meal_recipes for select to authenticated
  using (public.is_workspace_member(workspace_id) and public.user_has_subscription_feature(auth.uid(), 'meals'));
create policy meal_recipes_insert_members on public.meal_recipes for insert to authenticated
  with check (public.can_write_workspace(workspace_id) and created_by = auth.uid() and public.user_has_subscription_feature(auth.uid(), 'meals'));
create policy meal_recipes_update_members on public.meal_recipes for update to authenticated
  using (public.can_write_workspace(workspace_id) and public.user_has_subscription_feature(auth.uid(), 'meals'))
  with check (public.can_write_workspace(workspace_id) and public.user_has_subscription_feature(auth.uid(), 'meals'));
create policy meal_recipes_delete_members on public.meal_recipes for delete to authenticated
  using (public.can_write_workspace(workspace_id) and public.user_has_subscription_feature(auth.uid(), 'meals'));
create policy meal_weeks_select_members on public.meal_weeks for select to authenticated
  using (public.is_workspace_member(workspace_id) and public.user_has_subscription_feature(auth.uid(), 'meals'));
create policy meal_weeks_insert_members on public.meal_weeks for insert to authenticated
  with check (public.can_write_workspace(workspace_id) and created_by = auth.uid() and public.user_has_subscription_feature(auth.uid(), 'meals'));
create policy meal_weeks_update_members on public.meal_weeks for update to authenticated
  using (public.can_write_workspace(workspace_id) and public.user_has_subscription_feature(auth.uid(), 'meals'))
  with check (public.can_write_workspace(workspace_id) and public.user_has_subscription_feature(auth.uid(), 'meals'));
create policy meal_weeks_delete_members on public.meal_weeks for delete to authenticated
  using (public.can_write_workspace(workspace_id) and public.user_has_subscription_feature(auth.uid(), 'meals'));

drop policy if exists coupons_select_member on public.coupons;
drop policy if exists coupons_insert_writer on public.coupons;
drop policy if exists coupons_update_writer on public.coupons;
drop policy if exists coupons_delete_writer on public.coupons;
create policy coupons_select_member on public.coupons for select to authenticated
  using (public.is_workspace_member(workspace_id) and public.user_has_subscription_feature(auth.uid(), 'coupons'));
create policy coupons_insert_writer on public.coupons for insert to authenticated
  with check (public.can_write_workspace(workspace_id) and public.user_has_subscription_feature(auth.uid(), 'coupons'));
create policy coupons_update_writer on public.coupons for update to authenticated
  using (public.is_workspace_member(workspace_id) and public.user_has_subscription_feature(auth.uid(), 'coupons'))
  with check (public.can_write_workspace(workspace_id) and public.user_has_subscription_feature(auth.uid(), 'coupons'));
create policy coupons_delete_writer on public.coupons for delete to authenticated
  using (public.can_write_workspace(workspace_id) and public.user_has_subscription_feature(auth.uid(), 'coupons'));

do $$
declare
  table_name text;
begin
  foreach table_name in array array['investment_sources', 'investment_holdings', 'investment_snapshots', 'investment_transactions']
  loop
    execute format('drop policy if exists %I_select_own on public.%I', table_name, table_name);
    execute format('drop policy if exists %I_insert_own on public.%I', table_name, table_name);
    execute format('drop policy if exists %I_update_own on public.%I', table_name, table_name);
    execute format('drop policy if exists %I_delete_own on public.%I', table_name, table_name);
    execute format('create policy %I_select_own on public.%I for select to authenticated using (user_id = auth.uid() and public.is_workspace_member(workspace_id) and public.user_has_subscription_feature(auth.uid(), ''investments''))', table_name, table_name);
    execute format('create policy %I_insert_own on public.%I for insert to authenticated with check (user_id = auth.uid() and public.can_write_workspace(workspace_id) and public.user_has_subscription_feature(auth.uid(), ''investments''))', table_name, table_name);
    execute format('create policy %I_update_own on public.%I for update to authenticated using (user_id = auth.uid() and public.is_workspace_member(workspace_id) and public.user_has_subscription_feature(auth.uid(), ''investments'')) with check (user_id = auth.uid() and public.can_write_workspace(workspace_id) and public.user_has_subscription_feature(auth.uid(), ''investments''))', table_name, table_name);
    execute format('create policy %I_delete_own on public.%I for delete to authenticated using (user_id = auth.uid() and public.can_write_workspace(workspace_id) and public.user_has_subscription_feature(auth.uid(), ''investments''))', table_name, table_name);
  end loop;
end;
$$;

commit;

notify pgrst, 'reload schema';
