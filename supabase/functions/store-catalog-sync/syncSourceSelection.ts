interface SourceQuery<T> {
  eq(column: string, value: string | boolean): T
  lte(column: string, value: string): T
  order(column: string): T
  limit(count: number): T
}

// Only an authenticated user's explicit source selection is a manual run.
// A cron request (even with sourceId) must respect the schedule and auto flag.
export function selectSyncSource<T extends SourceQuery<T>>(query: T, sourceId: string | undefined, isCron: boolean, now: string) {
  const isManual = Boolean(sourceId) && !isCron
  if (sourceId) query = query.eq('id', sourceId)
  if (!isManual) query = query.eq('enabled', true).lte('next_sync_at', now).order('next_sync_at').limit(1)
  return { query, isManual }
}

// Compare-and-set: a cleanup/edit after selection must cancel the stale run.
export function guardSyncClaim<T extends { eq(column: string, value: string): T; neq(column: string, value: string): T }>(
  query: T, source: { id: string; updated_at: string },
) {
  return query.eq('id', source.id).eq('updated_at', source.updated_at).neq('status', 'syncing')
}
