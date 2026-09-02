import { beforeEach, describe, expect, it, vi } from 'vitest'
import { clearStoreSourceProducts, deleteStoreSource, deleteStoreProducts, updateStoreSource } from './storeCatalog.api'

const mock = vi.hoisted(() => ({ rpc: vi.fn() }))
vi.mock('../../../api/supabase/client.js', () => ({ requireSupabase: () => mock, requireAuthenticatedSupabase: () => mock }))
const draft = { name: ' Бакалея ', url: 'https://magnit.ru/catalog/64121-bakaleya?shopCode=780171&shopType=express', storeCode: '' }
beforeEach(() => mock.rpc.mockReset())
describe('source management API', () => {
  it('preserves physical-store context when editing a source', async () => {
    const url = draft.url.replace('shopType=express', 'shopType=1')
    mock.rpc.mockResolvedValue({ data: { source: { id: 's1', workspace_id: 'w1', store_code: '780171', url } } })
    await updateStoreSource('w1', 's1', { ...draft, url })
    expect(mock.rpc).toHaveBeenCalledWith('manage_store_catalog_source', expect.objectContaining({ p_url: url, p_store_code: '780171' }))
  })
  it('deletes an explicit deduplicated set of products in one workspace-scoped request', async () => {
    mock.rpc.mockResolvedValue({ data: { deleted_product_ids: ['p1'], sources: [{ id: 's1', workspace_id: 'w1', product_count: 3 }] } })
    expect(await deleteStoreProducts('w1', ['p1', 'p1'])).toMatchObject({ deletedProductIds: ['p1'], sources: [{ id: 's1', productCount: 3 }] })
    expect(mock.rpc).toHaveBeenCalledExactlyOnceWith('delete_store_catalog_products', { p_workspace_id: 'w1', p_product_ids: ['p1'] })
  })
  it('rejects empty or unscoped product deletions without a request', async () => {
    await expect(deleteStoreProducts('', ['p1'])).rejects.toThrow()
    await expect(deleteStoreProducts('w1', [])).rejects.toThrow()
    await expect(deleteStoreProducts('w1', [''])).rejects.toThrow()
    expect(mock.rpc).not.toHaveBeenCalled()
  })
  it('explains the required product deletion migration without falling back to partial deletion', async () => {
    mock.rpc.mockResolvedValue({ error: { code: 'PGRST202' } })
    await expect(deleteStoreProducts('w1', ['p1'])).rejects.toThrow('20260903010000_store_catalog_delete_products.sql')
    expect(mock.rpc).toHaveBeenCalledTimes(1)
  })
  it('normalizes edits and scopes them to the selected workspace and source', async () => {
    mock.rpc.mockResolvedValue({ data: { source: { id: 's1', workspace_id: 'w1', name: 'Бакалея', store_code: '780171', url: draft.url } } })
    expect(await updateStoreSource('w1', 's1', draft)).toMatchObject({ id: 's1', name: 'Бакалея', storeCode: '780171' })
    expect(mock.rpc).toHaveBeenCalledWith('manage_store_catalog_source', { p_workspace_id: 'w1', p_source_id: 's1', p_action: 'update', p_name: 'Бакалея', p_url: draft.url, p_store_code: '780171' })
  })
  it.each([{ ...draft, name: ' ' }, { ...draft, url: 'https://example.com/catalog/123' }, { ...draft, storeCode: '123456' }])('rejects invalid edits before sending requests', async invalid => {
    await expect(updateStoreSource('w1', 's1', invalid)).rejects.toThrow()
    expect(mock.rpc).not.toHaveBeenCalled()
  })
  it('atomically deletes the selected source and its unique products by default', async () => {
    mock.rpc.mockResolvedValue({ data: { source: null, deleted_product_ids: ['p1'] } })
    expect(await deleteStoreSource('w1', 's1')).toEqual(['p1'])
    expect(mock.rpc).toHaveBeenCalledExactlyOnceWith('delete_store_catalog_source', { p_workspace_id: 'w1', p_source_id: 's1', p_delete_products: true })
  })
  it('passes an explicit choice to keep products', async () => {
    mock.rpc.mockResolvedValue({ data: { source: null, deleted_product_ids: [] } })
    expect(await deleteStoreSource('w1', 's1', false)).toEqual([])
    expect(mock.rpc).toHaveBeenCalledExactlyOnceWith('delete_store_catalog_source', { p_workspace_id: 'w1', p_source_id: 's1', p_delete_products: false })
  })
  it('uses authoritative deletion IDs for category cleanup', async () => {
    mock.rpc.mockResolvedValue({ data: { source: { id: 's1', workspace_id: 'w1', enabled: false, product_count: 0 }, deleted_product_ids: ['p1'] } })
    expect(await clearStoreSourceProducts('w1', 's1')).toMatchObject({ source: { enabled: false, productCount: 0 }, deletedProductIds: ['p1'] })
    expect(mock.rpc).toHaveBeenCalledWith('manage_store_catalog_source', expect.objectContaining({ p_action: 'clear_products' }))
  })
  it('explains a missing migration and preserves server error messages', async () => {
    mock.rpc.mockResolvedValue({ error: { code: 'PGRST202' } })
    await expect(deleteStoreSource('w1', 's1')).rejects.toThrow('20260903000000_store_catalog_source_delete_products.sql')
    expect(mock.rpc).toHaveBeenCalledTimes(1)
    mock.rpc.mockResolvedValue({ error: { message: 'Дождитесь завершения синхронизации источника.' } })
    await expect(deleteStoreSource('w1', 's1')).rejects.toThrow('Дождитесь')
  })
  it('refuses an unscoped deletion', async () => {
    await expect(deleteStoreSource('', 's1')).rejects.toThrow()
    expect(mock.rpc).not.toHaveBeenCalled()
  })
})
