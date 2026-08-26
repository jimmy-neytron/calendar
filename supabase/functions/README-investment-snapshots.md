# Daily investment snapshots

The `investment-daily-snapshot` Edge Function creates or updates one portfolio snapshot per Moscow calendar day for every user and workspace that has investment positions.

## Deploy

```bash
supabase functions deploy investment-daily-snapshot --no-verify-jwt
supabase secrets set INVESTMENT_SNAPSHOT_CRON_SECRET=replace-with-a-long-random-value
```

If the project already has `DIGEST_CRON_SECRET`, the function reuses it and a
separate `INVESTMENT_SNAPSHOT_CRON_SECRET` is not required.

`SUPABASE_URL` and `SUPABASE_SERVICE_ROLE_KEY` are available to hosted Edge Functions automatically. Never add the service role key to the Vite environment.

## Store cron configuration in Vault

Run in the Supabase SQL Editor. Use the same random value that was set as `INVESTMENT_SNAPSHOT_CRON_SECRET`:

```sql
select vault.create_secret('https://PROJECT_REF.supabase.co', 'project_url');
select vault.create_secret('replace-with-the-same-long-random-value', 'investment_snapshot_cron_secret');
```

## Schedule one invocation per day

The schedule below runs at 00:10 Moscow time (21:10 UTC). Re-running it with the same job name replaces the existing schedule.

```sql
select cron.schedule(
  'investment-daily-snapshot',
  '10 21 * * *',
  $$
  select net.http_post(
    url := (select decrypted_secret from vault.decrypted_secrets where name = 'project_url') || '/functions/v1/investment-daily-snapshot',
    headers := jsonb_build_object(
      'Content-Type', 'application/json',
      'x-cron-secret', (select decrypted_secret from vault.decrypted_secrets where name = 'investment_snapshot_cron_secret')
    ),
    body := jsonb_build_object('source', 'cron'),
    timeout_milliseconds := 15000
  );
  $$
);
```

## Invocation model

- Cron invokes the Edge Function once per day for the whole project.
- The function reads all positive holdings in one database request.
- Crypto quotes are requested once per unique CoinPaprika asset ID, not once per user.
- All daily snapshots are written in one bulk upsert.
- A browser refresh later on the same Moscow date updates the same snapshot because the database has a unique constraint on `(workspace_id, user_id, captured_on)`.
