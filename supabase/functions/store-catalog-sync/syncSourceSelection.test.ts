import { describe, expect, it } from 'vitest'
import { guardSyncClaim, selectSyncSource } from './syncSourceSelection'

const now = '2026-09-02T12:00:00Z'
const rows = [
  { id: 'manual', enabled: false, next_sync_at: '2026-09-10T12:00:00Z' },
  { id: 'auto', enabled: true, next_sync_at: '2026-09-01T12:00:00Z' },
  { id: 'later', enabled: true, next_sync_at: '2026-09-10T12:00:00Z' },
]
class Query {
  result = [...rows]
  eq(column: string, value: string | boolean): this {
    this.result = this.result.filter(row => row[column as keyof typeof row] === value)
    return this
  }
  lte(column: string, value: string): this {
    this.result = this.result.filter(row => String(row[column as keyof typeof row]) <= value)
    return this
  }
  order(column: string): this {
    this.result.sort((a, b) => String(a[column as keyof typeof a]).localeCompare(String(b[column as keyof typeof b])))
    return this
  }
  limit(count: number): this { this.result = this.result.slice(0, count); return this }
}

describe('manual versus scheduled source selection', () => {
  it('selects a manual source with auto off and a future next run', () => {
    const { query, isManual } = selectSyncSource(new Query(), 'manual', false, now)
    expect(isManual).toBe(true)
    expect(query.result).toEqual([rows[0]])
    expect(query.result[0].enabled).toBe(false)
  })
  it('allows a manual refresh even when an enabled source is not due', () => {
    expect(selectSyncSource(new Query(), 'later', false, now).query.result).toEqual([rows[2]])
  })
  it('cron only selects enabled, due sources', () => {
    const { query, isManual } = selectSyncSource(new Query(), undefined, true, now)
    expect(isManual).toBe(false)
    expect(query.result).toEqual([rows[1]])
  })
  it.each(['manual', 'later'])('a cron request with sourceId=%s cannot bypass auto/due checks', sourceId => {
    const { query, isManual } = selectSyncSource(new Query(), sourceId, true, now)
    expect(isManual).toBe(false)
    expect(query.result).toEqual([])
  })
  it('an admin request without an explicit source still respects the schedule', () => {
    const { query, isManual } = selectSyncSource(new Query(), undefined, false, now)
    expect(isManual).toBe(false)
    expect(query.result).toEqual([rows[1]])
  })
  it('does not substitute another source when a manually selected ID is missing', () => {
    expect(selectSyncSource(new Query(), 'deleted', false, now).query.result).toEqual([])
  })
})

describe('atomic sync claim', () => {
  class ClaimQuery {
    rows = [{ id: 's1', updated_at: 'v2', status: 'idle' }]
    eq(column: string, value: string): this { this.rows = this.rows.filter(row => row[column as keyof typeof row] === value); return this }
    neq(column: string, value: string): this { this.rows = this.rows.filter(row => row[column as keyof typeof row] !== value); return this }
  }
  it('rejects a source changed or cleared after selection', () => {
    expect(guardSyncClaim(new ClaimQuery(), { id: 's1', updated_at: 'v1' }).rows).toEqual([])
  })
  it('rejects an already running or deleted source', () => {
    const query = new ClaimQuery(); query.rows[0].status = 'syncing'
    expect(guardSyncClaim(query, { id: 's1', updated_at: 'v2' }).rows).toEqual([])
    expect(guardSyncClaim(new ClaimQuery(), { id: 'deleted', updated_at: 'v2' }).rows).toEqual([])
  })
  it('accepts an unchanged idle source', () => {
    expect(guardSyncClaim(new ClaimQuery(), { id: 's1', updated_at: 'v2' }).rows).toHaveLength(1)
  })
})
