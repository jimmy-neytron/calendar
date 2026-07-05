-- Safe RLS hardening for the current Supabase schema.
-- Goal: reduce public/anon attack surface, protect admin/profile fields,
-- keep workspace-based access, and add indexes used by RLS/FK lookups.

begin;

-- 1) Keep schema usage, but remove direct anonymous table access.
-- RPC functions with SECURITY DEFINER and explicit execute grants keep working.
grant usage on schema public to anon, authenticated;

revoke all privileges on all tables in schema public from anon;

-- Authenticated users do not need dangerous table-level capabilities.
revoke truncate, references, trigger on all tables in schema public from authenticated;

-- 2) Re-grant normal client tables to authenticated users.
-- RLS policies still decide which rows are visible/mutable.
grant select, insert, update, delete on table
  public.workspaces,
  public.workspace_members,
  public.workspace_invites,
  public.workspace_features,
  public.calendar_collections,
  public.events,
  public.ideas,
  public.birthdays,
  public.sport_exercises,
  public.sport_completions,
  public.notifications,
  public.activity_entries,
  public.movie_watchlist,
  public.budget_months,
  public.budget_categories,
  public.budget_recurring_rules,
  public.budget_payments,
  public.time_projects,
  public.time_entries
to authenticated;

-- Profiles are readable through RLS, but users may only edit public profile fields.
-- Admin-only fields must be changed through admin_update_profile().
revoke insert, update, delete on table public.profiles from authenticated;
grant select on table public.profiles to authenticated;
grant update (name, avatar, color) on table public.profiles to authenticated;

-- App releases are read-only for authenticated app users.
revoke insert, update, delete on table public.app_releases from authenticated;
grant select on table public.app_releases to authenticated;

-- Admin/private tables should be managed through SECURITY DEFINER RPC only.
revoke all privileges on table public.admin_modals from anon, authenticated;
revoke all privileges on table public.admin_user_modal_overrides from anon, authenticated;
revoke all privileges on table public.landing_leads from anon, authenticated;

-- 3) Helper functions make policies shorter and consistent.
create or replace function public.can_write_workspace(target_workspace_id text)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select auth.uid() is not null and exists (
    select 1
    from public.workspace_members
    where workspace_id = target_workspace_id
      and user_id = auth.uid()
      and role in ('owner', 'admin', 'member')
  );
$$;

create or replace function public.can_admin_workspace(target_workspace_id text)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select auth.uid() is not null and exists (
    select 1
    from public.workspace_members
    where workspace_id = target_workspace_id
      and user_id = auth.uid()
      and role in ('owner', 'admin')
  );
$$;

grant execute on function public.can_write_workspace(text) to authenticated;
grant execute on function public.can_admin_workspace(text) to authenticated;

-- 4) Replace policies that were created for role "public" with authenticated-only policies.
-- This keeps the same workspace model, but removes anonymous policy participation.

drop policy if exists budget_months_select_members on public.budget_months;
drop policy if exists budget_months_write_members on public.budget_months;
create policy budget_months_select_members
  on public.budget_months for select to authenticated
  using (public.is_workspace_member(workspace_id));
create policy budget_months_insert_members
  on public.budget_months for insert to authenticated
  with check (public.can_write_workspace(workspace_id));
create policy budget_months_update_members
  on public.budget_months for update to authenticated
  using (public.can_write_workspace(workspace_id))
  with check (public.can_write_workspace(workspace_id));
create policy budget_months_delete_members
  on public.budget_months for delete to authenticated
  using (public.can_write_workspace(workspace_id));

drop policy if exists budget_categories_select_members on public.budget_categories;
drop policy if exists budget_categories_write_members on public.budget_categories;
create policy budget_categories_select_members
  on public.budget_categories for select to authenticated
  using (public.is_workspace_member(workspace_id));
create policy budget_categories_insert_members
  on public.budget_categories for insert to authenticated
  with check (public.can_write_workspace(workspace_id));
create policy budget_categories_update_members
  on public.budget_categories for update to authenticated
  using (public.can_write_workspace(workspace_id))
  with check (public.can_write_workspace(workspace_id));
create policy budget_categories_delete_members
  on public.budget_categories for delete to authenticated
  using (public.can_write_workspace(workspace_id));

drop policy if exists budget_payments_select_members on public.budget_payments;
drop policy if exists budget_payments_write_members on public.budget_payments;
create policy budget_payments_select_members
  on public.budget_payments for select to authenticated
  using (public.is_workspace_member(workspace_id));
create policy budget_payments_insert_members
  on public.budget_payments for insert to authenticated
  with check (public.can_write_workspace(workspace_id));
create policy budget_payments_update_members
  on public.budget_payments for update to authenticated
  using (public.can_write_workspace(workspace_id))
  with check (public.can_write_workspace(workspace_id));
create policy budget_payments_delete_members
  on public.budget_payments for delete to authenticated
  using (public.can_write_workspace(workspace_id));

drop policy if exists budget_rules_select_members on public.budget_recurring_rules;
drop policy if exists budget_rules_write_members on public.budget_recurring_rules;
create policy budget_rules_select_members
  on public.budget_recurring_rules for select to authenticated
  using (public.is_workspace_member(workspace_id));
create policy budget_rules_insert_members
  on public.budget_recurring_rules for insert to authenticated
  with check (public.can_write_workspace(workspace_id));
create policy budget_rules_update_members
  on public.budget_recurring_rules for update to authenticated
  using (public.can_write_workspace(workspace_id))
  with check (public.can_write_workspace(workspace_id));
create policy budget_rules_delete_members
  on public.budget_recurring_rules for delete to authenticated
  using (public.can_write_workspace(workspace_id));

drop policy if exists movie_watchlist_select_members on public.movie_watchlist;
drop policy if exists movie_watchlist_insert_members on public.movie_watchlist;
drop policy if exists movie_watchlist_update_members on public.movie_watchlist;
drop policy if exists movie_watchlist_delete_members on public.movie_watchlist;
create policy movie_watchlist_select_members
  on public.movie_watchlist for select to authenticated
  using (public.is_workspace_member(workspace_id));
create policy movie_watchlist_insert_members
  on public.movie_watchlist for insert to authenticated
  with check (public.can_write_workspace(workspace_id));
create policy movie_watchlist_update_members
  on public.movie_watchlist for update to authenticated
  using (public.can_write_workspace(workspace_id))
  with check (public.can_write_workspace(workspace_id));
create policy movie_watchlist_delete_members
  on public.movie_watchlist for delete to authenticated
  using (public.can_write_workspace(workspace_id));

drop policy if exists time_projects_select_members on public.time_projects;
drop policy if exists time_projects_write_members on public.time_projects;
create policy time_projects_select_members
  on public.time_projects for select to authenticated
  using (public.is_workspace_member(workspace_id));
create policy time_projects_insert_members
  on public.time_projects for insert to authenticated
  with check (public.can_write_workspace(workspace_id));
create policy time_projects_update_members
  on public.time_projects for update to authenticated
  using (public.can_write_workspace(workspace_id))
  with check (public.can_write_workspace(workspace_id));
create policy time_projects_delete_members
  on public.time_projects for delete to authenticated
  using (public.can_write_workspace(workspace_id));

drop policy if exists time_entries_select_members on public.time_entries;
drop policy if exists time_entries_write_members on public.time_entries;
create policy time_entries_select_members
  on public.time_entries for select to authenticated
  using (public.is_workspace_member(workspace_id));
create policy time_entries_insert_members
  on public.time_entries for insert to authenticated
  with check (public.can_write_workspace(workspace_id));
create policy time_entries_update_members
  on public.time_entries for update to authenticated
  using (public.can_write_workspace(workspace_id))
  with check (public.can_write_workspace(workspace_id));
create policy time_entries_delete_members
  on public.time_entries for delete to authenticated
  using (public.can_write_workspace(workspace_id));

drop policy if exists workspace_features_select_members on public.workspace_features;
drop policy if exists workspace_features_insert_admins on public.workspace_features;
drop policy if exists workspace_features_update_admins on public.workspace_features;
create policy workspace_features_select_members
  on public.workspace_features for select to authenticated
  using (public.is_workspace_member(workspace_id));
create policy workspace_features_insert_admins
  on public.workspace_features for insert to authenticated
  with check (
    public.can_admin_workspace(workspace_id)
    and (budget_enabled is not true or public.user_has_subscription_feature(auth.uid(), 'budget'))
  );
create policy workspace_features_update_admins
  on public.workspace_features for update to authenticated
  using (public.can_admin_workspace(workspace_id))
  with check (
    public.can_admin_workspace(workspace_id)
    and (budget_enabled is not true or public.user_has_subscription_feature(auth.uid(), 'budget'))
  );

drop policy if exists sport_exercises_select_own on public.sport_exercises;
drop policy if exists sport_exercises_insert_own on public.sport_exercises;
drop policy if exists sport_exercises_update_own on public.sport_exercises;
drop policy if exists sport_exercises_delete_own on public.sport_exercises;
create policy sport_exercises_select_own
  on public.sport_exercises for select to authenticated
  using (user_id = auth.uid() and public.is_workspace_member(workspace_id));
create policy sport_exercises_insert_own
  on public.sport_exercises for insert to authenticated
  with check (user_id = auth.uid() and public.can_write_workspace(workspace_id));
create policy sport_exercises_update_own
  on public.sport_exercises for update to authenticated
  using (user_id = auth.uid())
  with check (user_id = auth.uid() and public.can_write_workspace(workspace_id));
create policy sport_exercises_delete_own
  on public.sport_exercises for delete to authenticated
  using (user_id = auth.uid());

drop policy if exists sport_completions_select_own on public.sport_completions;
drop policy if exists sport_completions_insert_own on public.sport_completions;
drop policy if exists sport_completions_update_own on public.sport_completions;
drop policy if exists sport_completions_delete_own on public.sport_completions;
create policy sport_completions_select_own
  on public.sport_completions for select to authenticated
  using (user_id = auth.uid());
create policy sport_completions_insert_own
  on public.sport_completions for insert to authenticated
  with check (
    user_id = auth.uid()
    and exists (
      select 1
      from public.sport_exercises
      where sport_exercises.id = sport_completions.exercise_id
        and sport_exercises.user_id = auth.uid()
        and sport_exercises.workspace_id = sport_completions.workspace_id
    )
  );
create policy sport_completions_update_own
  on public.sport_completions for update to authenticated
  using (user_id = auth.uid())
  with check (
    user_id = auth.uid()
    and exists (
      select 1
      from public.sport_exercises
      where sport_exercises.id = sport_completions.exercise_id
        and sport_exercises.user_id = auth.uid()
        and sport_exercises.workspace_id = sport_completions.workspace_id
    )
  );
create policy sport_completions_delete_own
  on public.sport_completions for delete to authenticated
  using (user_id = auth.uid());

-- 5) Profile policy stays row-based; column grant above limits what can be changed.
drop policy if exists profiles_update_self on public.profiles;
create policy profiles_update_self
  on public.profiles for update to authenticated
  using (id = auth.uid())
  with check (id = auth.uid());

-- 6) Indexes for RLS, FK checks, admin stats and common workspace filters.
create index if not exists workspaces_owner_id_idx
  on public.workspaces (owner_id);

create index if not exists calendar_collections_workspace_id_idx
  on public.calendar_collections (workspace_id);

create index if not exists events_calendar_id_idx
  on public.events (calendar_id);

create index if not exists events_responsible_id_idx
  on public.events (responsible_id);

create index if not exists events_created_by_idx
  on public.events (created_by);

create index if not exists activity_entries_actor_id_idx
  on public.activity_entries (actor_id);

create index if not exists ideas_author_id_idx
  on public.ideas (author_id);

create index if not exists budget_payments_workspace_id_idx
  on public.budget_payments (workspace_id);

create index if not exists budget_payments_category_id_idx
  on public.budget_payments (category_id);

create index if not exists budget_payments_recurring_rule_id_idx
  on public.budget_payments (recurring_rule_id);

create index if not exists workspace_invites_workspace_id_idx
  on public.workspace_invites (workspace_id);

create index if not exists workspace_invites_created_by_idx
  on public.workspace_invites (created_by);

create index if not exists workspace_invites_accepted_by_idx
  on public.workspace_invites (accepted_by);

create index if not exists sport_completions_user_id_idx
  on public.sport_completions (user_id);

create index if not exists sport_exercises_user_id_idx
  on public.sport_exercises (user_id);

-- 7) Personal modal override must really override global audience and active status.
-- Admin can assign an inactive/draft modal to one user without enabling it globally.
create or replace function public.get_active_admin_modal()
returns public.admin_modals
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  selected_modal public.admin_modals;
begin
  select modal.*
  into selected_modal
  from public.admin_user_modal_overrides as override
  join public.admin_modals as modal on modal.id = override.modal_id
  where override.user_id = auth.uid()
  order by override.updated_at desc
  limit 1;

  if selected_modal.id is not null then
    selected_modal.audience := '{"mode":"all","userIds":[],"emails":[],"roles":[],"tiers":[]}'::jsonb;
    selected_modal.display_mode := 'always';
    return selected_modal;
  end if;

  select *
  into selected_modal
  from public.admin_modals
  where is_active = true
    and public.admin_modal_matches_audience(audience, auth.uid())
  order by
    case when coalesce(audience->>'mode', 'all') = 'targeted' then 0 else 1 end,
    updated_at desc
  limit 1;

  return selected_modal;
end;
$$;

-- 8) Keep important RPC executable. These grants are harmless without table grants
-- because each function performs its own auth/admin checks.
grant execute on function public.get_active_admin_modal() to anon, authenticated;
grant execute on function public.get_backend_status() to anon, authenticated;

commit;
