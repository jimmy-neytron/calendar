import { parseCatalogContext, type CatalogContext } from '../../../../../supabase/functions/store-catalog-sync/catalogParser'
import type { StoreSourceDraft } from '../types/storeCatalog.types'

export function describeStoreSourceContext(context: CatalogContext): string {
  if (context.storeType === '1' && context.catalogType === '1') return 'В магазине · Цены на полке'
  return `${context.catalogType === '3' ? 'Самовывоз' : 'Доставка'} · ${context.storeType === 'express' ? 'Экспресс' : 'Обычная доставка'}`
}

export function inspectStoreSourceContext(url: string, storeCode = '') {
  try { return parseCatalogContext({ url: url.trim(), store_code: storeCode.trim() }) }
  catch { return null }
}

export function normalizeStoreSourceDraft(draft: StoreSourceDraft): StoreSourceDraft {
  const name = draft.name.trim()
  const url = draft.url.trim()
  if (!name || name.length > 120) throw new Error('Укажите название источника длиной до 120 символов.')
  let storeCode = draft.storeCode.trim()
  try { storeCode ||= new URL(url).searchParams.get('shopCode')?.trim() || '' }
  catch { throw new Error('Укажите корректную ссылку на раздел Магнита.') }
  parseCatalogContext({ url, store_code: storeCode })
  return { name, url, storeCode }
}
