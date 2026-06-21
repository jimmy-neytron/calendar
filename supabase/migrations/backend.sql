-- WARNING: This schema is for context only and is not meant to be run.
-- Table order and constraints may not be valid for execution.

CREATE TABLE public.profiles (
  id uuid NOT NULL,
  email text NOT NULL DEFAULT ''::text,
  name text NOT NULL DEFAULT ''::text,
  avatar text NOT NULL DEFAULT ''::text,
  color text NOT NULL DEFAULT '#60a5fa'::text,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now(),
  CONSTRAINT profiles_pkey PRIMARY KEY (id),
  CONSTRAINT profiles_id_fkey FOREIGN KEY (id) REFERENCES auth.users(id)
);
CREATE TABLE public.workspaces (
  id text NOT NULL DEFAULT (gen_random_uuid())::text,
  name text NOT NULL CHECK (char_length(TRIM(BOTH FROM name)) > 0),
  owner_id uuid NOT NULL,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now(),
  CONSTRAINT workspaces_pkey PRIMARY KEY (id),
  CONSTRAINT workspaces_owner_id_fkey FOREIGN KEY (owner_id) REFERENCES public.profiles(id)
);
CREATE TABLE public.workspace_members (
  workspace_id text NOT NULL,
  user_id uuid NOT NULL,
  role text NOT NULL DEFAULT 'member'::text CHECK (role = ANY (ARRAY['owner'::text, 'admin'::text, 'member'::text, 'viewer'::text])),
  joined_at timestamp with time zone NOT NULL DEFAULT now(),
  CONSTRAINT workspace_members_pkey PRIMARY KEY (workspace_id, user_id),
  CONSTRAINT workspace_members_workspace_id_fkey FOREIGN KEY (workspace_id) REFERENCES public.workspaces(id),
  CONSTRAINT workspace_members_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.profiles(id)
);
CREATE TABLE public.workspace_invites (
  id text NOT NULL DEFAULT (gen_random_uuid())::text,
  workspace_id text NOT NULL,
  code text NOT NULL UNIQUE,
  invited_email text NOT NULL DEFAULT ''::text,
  created_by uuid NOT NULL,
  accepted_by uuid,
  status text NOT NULL DEFAULT 'active'::text CHECK (status = ANY (ARRAY['active'::text, 'accepted'::text, 'revoked'::text])),
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  accepted_at timestamp with time zone,
  CONSTRAINT workspace_invites_pkey PRIMARY KEY (id),
  CONSTRAINT workspace_invites_workspace_id_fkey FOREIGN KEY (workspace_id) REFERENCES public.workspaces(id),
  CONSTRAINT workspace_invites_created_by_fkey FOREIGN KEY (created_by) REFERENCES public.profiles(id),
  CONSTRAINT workspace_invites_accepted_by_fkey FOREIGN KEY (accepted_by) REFERENCES public.profiles(id)
);
CREATE TABLE public.calendar_collections (
  id text NOT NULL DEFAULT (gen_random_uuid())::text,
  workspace_id text NOT NULL,
  name text NOT NULL,
  color text NOT NULL DEFAULT '#60a5fa'::text,
  visible boolean NOT NULL DEFAULT true,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now(),
  CONSTRAINT calendar_collections_pkey PRIMARY KEY (id),
  CONSTRAINT calendar_collections_workspace_id_fkey FOREIGN KEY (workspace_id) REFERENCES public.workspaces(id)
);
CREATE TABLE public.events (
  id text NOT NULL DEFAULT (gen_random_uuid())::text,
  workspace_id text NOT NULL,
  title text NOT NULL,
  date date NOT NULL,
  start_time text NOT NULL DEFAULT ''::text,
  end_time text NOT NULL DEFAULT ''::text,
  member_ids ARRAY NOT NULL DEFAULT '{}'::uuid[],
  calendar_id text,
  responsible_id uuid,
  attendee_responses jsonb NOT NULL DEFAULT '{}'::jsonb,
  comments jsonb NOT NULL DEFAULT '[]'::jsonb,
  category text NOT NULL DEFAULT 'other'::text,
  location text NOT NULL DEFAULT ''::text,
  notes text NOT NULL DEFAULT ''::text,
  all_day boolean NOT NULL DEFAULT false,
  repeat text NOT NULL DEFAULT 'none'::text,
  repeat_until date,
  repeat_end_type text NOT NULL DEFAULT 'never'::text,
  repeat_count integer NOT NULL DEFAULT 0,
  repeat_interval integer NOT NULL DEFAULT 1,
  repeat_unit text NOT NULL DEFAULT 'week'::text,
  repeat_weekdays ARRAY NOT NULL DEFAULT '{}'::integer[],
  importance text NOT NULL DEFAULT 'normal'::text,
  reminder text NOT NULL DEFAULT 'none'::text,
  created_by uuid DEFAULT auth.uid(),
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now(),
  CONSTRAINT events_pkey PRIMARY KEY (id),
  CONSTRAINT events_workspace_id_fkey FOREIGN KEY (workspace_id) REFERENCES public.workspaces(id),
  CONSTRAINT events_calendar_id_fkey FOREIGN KEY (calendar_id) REFERENCES public.calendar_collections(id),
  CONSTRAINT events_responsible_id_fkey FOREIGN KEY (responsible_id) REFERENCES public.profiles(id),
  CONSTRAINT events_created_by_fkey FOREIGN KEY (created_by) REFERENCES public.profiles(id)
);
CREATE TABLE public.ideas (
  id text NOT NULL DEFAULT (gen_random_uuid())::text,
  workspace_id text NOT NULL,
  author_id uuid DEFAULT auth.uid(),
  title text NOT NULL,
  type text NOT NULL DEFAULT 'other'::text,
  note text NOT NULL DEFAULT ''::text,
  planned_event_id text,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now(),
  CONSTRAINT ideas_pkey PRIMARY KEY (id),
  CONSTRAINT ideas_workspace_id_fkey FOREIGN KEY (workspace_id) REFERENCES public.workspaces(id),
  CONSTRAINT ideas_author_id_fkey FOREIGN KEY (author_id) REFERENCES public.profiles(id),
  CONSTRAINT ideas_planned_event_id_fkey FOREIGN KEY (planned_event_id) REFERENCES public.events(id)
);
CREATE TABLE public.birthdays (
  id text NOT NULL DEFAULT (gen_random_uuid())::text,
  workspace_id text NOT NULL,
  name text NOT NULL,
  birth_date date NOT NULL,
  reminder_days integer NOT NULL DEFAULT 0,
  note text NOT NULL DEFAULT ''::text,
  gift_ideas jsonb NOT NULL DEFAULT '[]'::jsonb,
  event_id text,
  reminder_event_id text,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now(),
  CONSTRAINT birthdays_pkey PRIMARY KEY (id),
  CONSTRAINT birthdays_workspace_id_fkey FOREIGN KEY (workspace_id) REFERENCES public.workspaces(id),
  CONSTRAINT birthdays_event_id_fkey FOREIGN KEY (event_id) REFERENCES public.events(id),
  CONSTRAINT birthdays_reminder_event_id_fkey FOREIGN KEY (reminder_event_id) REFERENCES public.events(id)
);
CREATE TABLE public.sport_exercises (
  id text NOT NULL DEFAULT (gen_random_uuid())::text,
  workspace_id text NOT NULL,
  weekday integer NOT NULL CHECK (weekday >= 0 AND weekday <= 6),
  title text NOT NULL,
  sets text NOT NULL DEFAULT ''::text,
  reps text NOT NULL DEFAULT ''::text,
  note text NOT NULL DEFAULT ''::text,
  order bigint NOT NULL DEFAULT 0,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now(),
  CONSTRAINT sport_exercises_pkey PRIMARY KEY (id),
  CONSTRAINT sport_exercises_workspace_id_fkey FOREIGN KEY (workspace_id) REFERENCES public.workspaces(id)
);
CREATE TABLE public.sport_completions (
  id text NOT NULL DEFAULT (gen_random_uuid())::text,
  workspace_id text NOT NULL,
  exercise_id text NOT NULL,
  user_id uuid NOT NULL DEFAULT auth.uid(),
  date date NOT NULL,
  completed_at timestamp with time zone NOT NULL DEFAULT now(),
  CONSTRAINT sport_completions_pkey PRIMARY KEY (id),
  CONSTRAINT sport_completions_workspace_id_fkey FOREIGN KEY (workspace_id) REFERENCES public.workspaces(id),
  CONSTRAINT sport_completions_exercise_id_fkey FOREIGN KEY (exercise_id) REFERENCES public.sport_exercises(id),
  CONSTRAINT sport_completions_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.profiles(id)
);
CREATE TABLE public.notifications (
  id text NOT NULL DEFAULT (gen_random_uuid())::text,
  workspace_id text NOT NULL,
  user_id uuid NOT NULL,
  payload jsonb NOT NULL DEFAULT '{}'::jsonb,
  read_at timestamp with time zone,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now(),
  CONSTRAINT notifications_pkey PRIMARY KEY (id),
  CONSTRAINT notifications_workspace_id_fkey FOREIGN KEY (workspace_id) REFERENCES public.workspaces(id),
  CONSTRAINT notifications_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.profiles(id)
);
CREATE TABLE public.activity_entries (
  id text NOT NULL DEFAULT (gen_random_uuid())::text,
  workspace_id text NOT NULL,
  actor_id uuid DEFAULT auth.uid(),
  action text NOT NULL,
  message text NOT NULL,
  metadata jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  CONSTRAINT activity_entries_pkey PRIMARY KEY (id),
  CONSTRAINT activity_entries_workspace_id_fkey FOREIGN KEY (workspace_id) REFERENCES public.workspaces(id),
  CONSTRAINT activity_entries_actor_id_fkey FOREIGN KEY (actor_id) REFERENCES public.profiles(id)
);
CREATE TABLE public.movie_watchlist (
  id text NOT NULL,
  workspace_id text NOT NULL,
  tmdb_id integer NOT NULL,
  media_type text NOT NULL CHECK (media_type = ANY (ARRAY['movie'::text, 'tv'::text])),
  title text NOT NULL,
  original_title text NOT NULL DEFAULT ''::text,
  overview text NOT NULL DEFAULT ''::text,
  poster_path text NOT NULL DEFAULT ''::text,
  backdrop_path text NOT NULL DEFAULT ''::text,
  release_date date,
  vote_average numeric NOT NULL DEFAULT 0,
  vote_count integer NOT NULL DEFAULT 0,
  popularity numeric NOT NULL DEFAULT 0,
  genre_ids integer[] NOT NULL DEFAULT '{}'::integer[],
  planned_event_id text,
  added_at timestamp with time zone NOT NULL DEFAULT now(),
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now(),
  CONSTRAINT movie_watchlist_pkey PRIMARY KEY (id),
  CONSTRAINT movie_watchlist_workspace_id_fkey FOREIGN KEY (workspace_id) REFERENCES public.workspaces(id),
  CONSTRAINT movie_watchlist_planned_event_id_fkey FOREIGN KEY (planned_event_id) REFERENCES public.events(id)
);
