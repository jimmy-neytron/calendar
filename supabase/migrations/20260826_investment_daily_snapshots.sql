create extension if not exists pg_cron with schema pg_catalog;
create extension if not exists pg_net with schema extensions;

-- The Edge Function is scheduled after its URL and request secret are placed in Vault.
-- Keeping these values in Vault prevents project credentials from entering migrations.
-- See supabase/functions/README-investment-snapshots.md for the two setup commands.
