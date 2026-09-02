import { parseCatalogContext, parseMagnitCatalogPage, type CatalogProduct } from './catalogParser.ts'

export async function fetchMagnitCatalog(source: { url: string; store_code: string }, request: typeof fetch = fetch) {
  const context = parseCatalogContext(source)
  const found = new Map<string, CatalogProduct>()
  const deadline = Date.now() + 90000
  const limit = 36
  let offset = 0
  for (let page = 0; page < 50; page += 1) {
    if (Date.now() >= deadline) throw new Error('Загрузка каталога заняла слишком долго. Повторите синхронизацию.')
    const response = await request('https://magnit.ru/webgate/v2/goods/search', {
      method: 'POST', redirect: 'error', signal: AbortSignal.timeout(Math.min(15000, deadline - Date.now())),
      headers: { 'content-type': 'application/json', accept: 'application/json', 'x-device-platform': 'Web', 'x-client-name': 'magnit', 'x-new-magnit': 'true' },
      body: JSON.stringify({
        storeCode: context.storeCode, storeType: context.storeType, catalogType: context.catalogType,
        categories: [context.categoryId], pagination: { limit, offset },
        sort: { order: 'desc', type: 'popularity' }, includeAdultGoods: true,
      }),
    })
    if (!response.ok) throw new Error(`API Магнита вернул HTTP ${response.status}. Цены не обновлены.`)
    const result = parseMagnitCatalogPage(await response.json(), context)
    if (result.offset !== offset) throw new Error('Магнит вернул неверную страницу каталога. Цены не обновлены.')
    const previousSize = found.size
    for (const product of result.products) found.set(product.code, product)
    if (!result.hasMore) {
      if (!found.size) throw new Error('В выбранном разделе магазина нет товаров.')
      return { context, products: [...found.values()] }
    }
    if (found.size === previousSize) throw new Error('Магнит повторяет страницу каталога. Цены не обновлены.')
    const nextOffset = result.nextOffset ?? offset + result.products.length
    if (typeof nextOffset !== 'number' || !Number.isSafeInteger(nextOffset) || nextOffset <= offset) throw new Error('Некорректная пагинация Магнита. Цены не обновлены.')
    offset = nextOffset
  }
  throw new Error('Раздел слишком большой для одной синхронизации. Добавьте его подразделы.')
}
