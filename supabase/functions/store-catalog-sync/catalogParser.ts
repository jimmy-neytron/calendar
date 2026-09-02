export type CatalogContext = { storeCode: string; storeType: string; catalogType: string; categoryId: number }
export type CatalogProduct = {
  code: string
  name: string
  imageUrl: string
  productUrl: string
  price: number | null
  oldPrice: number | null
  isWeighted: boolean
  shelfWeight: number | null
  weightStep: number | null
  weightMinimum: number | null
  unitPrice: number | null
}

type JsonRecord = Record<string, unknown>
function record(value: unknown): JsonRecord {
  return value && typeof value === 'object' && !Array.isArray(value) ? value as JsonRecord : {}
}

// HTML/JSON-LD is an SEO catalogue for a default store, not a price fallback.
export function parseCatalogContext(source: { url: string; store_code: string }): CatalogContext {
  const url = new URL(source.url)
  if (url.protocol !== 'https:' || url.hostname !== 'magnit.ru' || url.port || url.username || url.password) {
    throw new Error('Нужна ссылка https://magnit.ru/catalog/…')
  }
  const categoryId = Number(url.pathname.match(/^\/catalog\/(\d+)(?:-|\/|$)/)?.[1])
  if (!Number.isSafeInteger(categoryId) || categoryId <= 0) throw new Error('В ссылке не найден раздел каталога Магнита.')
  const queryCode = url.searchParams.get('shopCode')?.trim()
  const storeCode = source.store_code.trim() || queryCode || ''
  if (!/^\d{4,12}$/.test(storeCode)) throw new Error('Укажите корректный shopCode магазина.')
  if (queryCode && queryCode !== storeCode) throw new Error('Код магазина в ссылке отличается от указанного кода. Исправьте источник.')
  const storeType = url.searchParams.get('shopType') || ''
  // These shopType values refer to delivery; offline contexts must be explicit.
  const catalogType = url.searchParams.get('catalogType') || '2'
  if (!['express', 'dostavka'].includes(storeType) || !['2', '3'].includes(catalogType)) {
    throw new Error('Поддерживаются ссылки с shopType=express или dostavka и catalogType=2 (доставка) либо 3 (самовывоз).')
  }
  return { storeCode, storeType, catalogType, categoryId }
}

export function parseMagnitCatalogPage(payload: unknown, context: CatalogContext) {
  const root = record(payload)
  const pagination = record(root.pagination)
  if (!Array.isArray(root.items) || typeof pagination.hasMore !== 'boolean') {
    throw new Error('Магнит изменил формат каталога. Цены не обновлены.')
  }
  const products = root.items.map((value): CatalogProduct => {
    const item = record(value)
    if (String(item.storeCode ?? '') !== context.storeCode
      || item.service !== context.storeType || String(item.catalogType) !== context.catalogType) {
      throw new Error('Магнит вернул товар другого магазина или типа каталога. Цены не обновлены.')
    }
    const code = typeof item.id === 'string' ? item.id : ''
    const name = typeof item.name === 'string' ? item.name.trim() : ''
    if (!/^\d{4,20}$/.test(code) || name.length < 3 || /^\d+$/.test(name)) {
      throw new Error('Магнит вернул некорректный товар. Цены не обновлены.')
    }
    const weighted = record(item.weighted)
    const isWeighted = weighted.isWeighted !== false
    const weight = parseWeight(weighted)
    const available = typeof item.quantity === 'number' && item.quantity > 0 && item.isMissing !== true
    const rawPrice = minorUnits(item.price)
    // price is for shelfWeight grams, NOT for one kilogram. Keep the exact
    // shelf price (including the retailer's rounding) and its purchase step.
    const price = available && (!isWeighted || weight !== null) ? rawPrice : null
    const oldPrice = minorUnits(record(item.promotion).oldPrice)
    const image = (Array.isArray(item.gallery) ? item.gallery : []).map(record).find((entry) => entry.type === 'IMAGE')
    const url = new URL(`/product/${code}`, 'https://magnit.ru')
    url.searchParams.set('shopCode', context.storeCode)
    url.searchParams.set('shopType', context.storeType)
    url.searchParams.set('catalogType', context.catalogType)
    return {
      code, name, productUrl: url.toString(), imageUrl: safeImageUrl(image?.url), price,
      oldPrice: price != null && oldPrice != null && oldPrice > price ? oldPrice : null,
      isWeighted,
      shelfWeight: weight?.shelfWeight ?? null,
      weightStep: weight?.step ?? null,
      weightMinimum: weight?.minimum ?? null,
      unitPrice: weight?.unitPrice ?? null,
    }
  })
  return { products, hasMore: pagination.hasMore, offset: pagination.offset, nextOffset: pagination.nextOffset }
}

function parseWeight(weighted: JsonRecord) {
  if (weighted.isWeighted !== true) return null
  const { shelfWeight, step, minStep, unitLabel } = weighted
  if (typeof shelfWeight !== 'number' || !Number.isSafeInteger(shelfWeight) || shelfWeight <= 0
    || typeof step !== 'number' || !Number.isSafeInteger(step) || step <= 0
    || typeof minStep !== 'number' || !Number.isSafeInteger(minStep) || minStep <= 0
    || !Number.isSafeInteger(step * minStep)
    || typeof unitLabel !== 'string' || !/^1\s*кг$/i.test(unitLabel.trim())) return null
  const unitPrice = minorUnits(weighted.unitPrice)
  if (unitPrice == null) return null
  return { shelfWeight, step, minimum: step * minStep, unitPrice }
}

function minorUnits(value: unknown): number | null {
  if (value == null) return null
  if (typeof value !== 'number' || !Number.isSafeInteger(value) || value < 0) {
    throw new Error('Неизвестный формат цены Магнита. Цены не обновлены.')
  }
  // API v2 uses kopecks for ALL prices, including prices below 100 rubles.
  return value > 0 ? value / 100 : null
}

function safeImageUrl(value: unknown): string {
  if (typeof value !== 'string') return ''
  try { const url = new URL(value); return url.protocol === 'https:' ? url.toString() : '' }
  catch { return '' }
}
