// @vitest-environment jsdom
import { beforeEach, describe, expect, it, vi } from 'vitest'

const api = vi.hoisted(() => ({ list: vi.fn(), update: vi.fn() }))
vi.mock('../api/supabase/collections.api.js', () => ({ createCollectionApi: () => api }))
vi.mock('../config/featureFlags.js', () => ({ isSyncTableEnabled: () => true }))
vi.mock('./workspace.store.js', () => ({ workspaceStore: { activeWorkspaceId: { value: 'workspace' } } }))

import { couponStore } from './coupon.store'
import { queryClient } from '../query/queryClient.js'

const row = {
  id: 'coupon', workspace_id: 'workspace', title: 'Скидка', is_used: false,
  code_value: 'PROMO', code_type: 'promo', created_at: '2026-09-01T00:00:00Z',
}

beforeEach(async () => {
  vi.restoreAllMocks()
  vi.spyOn(navigator, 'onLine', 'get').mockReturnValue(true)
  localStorage.clear()
  queryClient.clear()
  api.list.mockResolvedValue({ data: [row], error: null })
  api.update.mockReset().mockImplementation(async (_id, payload) => ({
    error: 'secondary_code_value' in payload ? { message: 'Could not find the secondary_code_value column in the schema cache' } : null,
  }))
  await couponStore.loadWorkspace('workspace')
})

describe('отметка использования купона со старой схемой', () => {
  it('сохраняет отметку и возвращает купон в активные без дополнительных колонок', async () => {
    expect((await couponStore.update('coupon', { isUsed: true })).ok).toBe(true)
    expect(api.update).toHaveBeenLastCalledWith('coupon', { is_used: true, updated_at: expect.any(String) })
    expect(couponStore.items.value[0].isUsed).toBe(true)
    expect((await couponStore.update('coupon', { isUsed: false })).ok).toBe(true)
    expect(couponStore.items.value[0].isUsed).toBe(false)
    expect(couponStore.items.value[0].codeValue).toBe('PROMO')
  })

  it('откатывает отметку при отказе в доступе', async () => {
    vi.spyOn(console, 'error').mockImplementation(() => {})
    api.update.mockResolvedValue({ error: { message: 'permission denied' } })
    expect((await couponStore.update('coupon', { isUsed: true })).ok).toBe(false)
    expect(couponStore.items.value[0].isUsed).toBe(false)
  })

  it('отправляет явно очищенный второй штрихкод', async () => {
    api.update.mockResolvedValue({ error: null })
    await couponStore.update('coupon', { secondaryCodeValue: '' })
    expect(api.update).toHaveBeenLastCalledWith('coupon', { secondary_code_value: '', updated_at: expect.any(String) })
  })

  it('сохраняет полный снимок и точечное обновление в офлайн-очереди', async () => {
    vi.spyOn(navigator, 'onLine', 'get').mockReturnValue(false)
    expect(await couponStore.update('coupon', { isUsed: true })).toMatchObject({ ok: true, queued: true })
    expect(api.update).not.toHaveBeenCalled()
    const [operation] = JSON.parse(localStorage.getItem('workspace-calendar:sync-queue') || '[]')
    expect(operation.workspaceId).toBe('workspace')
    expect(operation.payload).toMatchObject({ title: 'Скидка', code_value: 'PROMO', is_used: true })
    expect(operation.updatePayload).toEqual({ is_used: true, updated_at: expect.any(String) })
    vi.spyOn(navigator, 'onLine', 'get').mockReturnValue(true)
    window.dispatchEvent(new Event('online'))
    await vi.waitFor(() => expect(api.update).toHaveBeenCalledWith('coupon', operation.updatePayload))
  })
})
