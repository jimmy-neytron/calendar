import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, 'Content-Type': 'application/json', 'Cache-Control': 'no-store' },
  })
}

Deno.serve(async (request) => {
  if (request.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders })
  if (request.method !== 'POST') return json({ error: 'Method not allowed' }, 405)

  try {
    const authorization = request.headers.get('Authorization') || ''
    const jwt = authorization.replace(/^Bearer\s+/i, '')
    if (!jwt) return json({ error: 'Войдите в приложение' }, 401)

    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') || '',
      Deno.env.get('SUPABASE_ANON_KEY') || '',
      { global: { headers: { Authorization: authorization } }, auth: { persistSession: false } },
    )
    const { data: authData, error: authError } = await supabase.auth.getUser(jwt)
    if (authError || !authData.user) return json({ error: 'Сессия истекла' }, 401)

    const body = await request.json().catch(() => ({}))
    const initialUrl = validatePublicUrl(String(body.url || ''))
    const { response, finalUrl } = await fetchWithSafeRedirects(initialUrl)
    if (!response.ok) throw new Error(`Магазин вернул ошибку ${response.status}`)

    const contentType = response.headers.get('content-type') || ''
    if (!contentType.includes('text/html')) throw new Error('По ссылке не найдена страница товара')
    const contentLength = Number(response.headers.get('content-length') || 0)
    if (contentLength > 2_000_000) throw new Error('Страница товара слишком большая')

    const html = (await response.text()).slice(0, 2_000_000)
    const preview = extractPreview(html, finalUrl)
    if (!preview.title && !preview.imageUrl && !preview.price) {
      throw new Error('Магазин не отдал данные товара. Ссылка сохранена — заполните название вручную.')
    }
    return json({ preview })
  } catch (error) {
    return json({ error: error instanceof Error ? error.message : 'Не удалось прочитать ссылку' }, 400)
  }
})

async function fetchWithSafeRedirects(initialUrl: URL) {
  let url = initialUrl
  const visited = new Set<string>()
  const maxRedirects = 8

  for (let redirect = 0; redirect <= maxRedirects; redirect += 1) {
    url.hash = ''
    const currentUrl = url.toString()
    if (visited.has(currentUrl)) {
      throw new Error('Магазин зациклил перенаправление. Попробуйте вставить полную ссылку из адресной строки товара.')
    }
    visited.add(currentUrl)

    const response = await fetch(url, {
      redirect: 'manual',
      signal: AbortSignal.timeout(10_000),
      headers: {
        Accept: 'text/html,application/xhtml+xml',
        'Accept-Language': 'ru-RU,ru;q=0.9,en;q=0.6',
        'User-Agent': 'Mozilla/5.0 (compatible; CalendarWishlist/1.0)',
      },
    })
    if (![301, 302, 303, 307, 308].includes(response.status)) return { response, finalUrl: url }
    const location = response.headers.get('location')
    if (!location) throw new Error('Магазин вернул некорректное перенаправление')
    await response.body?.cancel()
    const redirectUrl = validatePublicUrl(new URL(location, url).toString())
    url = redirectUrl
  }
  throw new Error(`Магазин выполнил больше ${maxRedirects} перенаправлений. Откройте товар в браузере и скопируйте его полный адрес.`)
}

function validatePublicUrl(value: string) {
  let url: URL
  try {
    url = new URL(value.trim())
  } catch {
    throw new Error('Укажите корректную ссылку на товар')
  }
  if (!['http:', 'https:'].includes(url.protocol)) throw new Error('Поддерживаются только HTTP-ссылки')
  if (url.username || url.password) throw new Error('Ссылки с авторизацией не поддерживаются')
  if (url.port && !['80', '443'].includes(url.port)) throw new Error('Порт в ссылке не поддерживается')
  const host = url.hostname.toLowerCase().replace(/^\[|\]$/g, '')
  if (isPrivateHost(host)) throw new Error('Этот адрес недоступен для импорта')
  return url
}

function isPrivateHost(host: string) {
  if (host === 'localhost' || host.endsWith('.local') || host.endsWith('.internal')) return true
  if (/^(127|10)\./.test(host) || /^192\.168\./.test(host)) return true
  const match = host.match(/^172\.(\d+)\./)
  if (match && Number(match[1]) >= 16 && Number(match[1]) <= 31) return true
  if (/^(0|169\.254)\./.test(host)) return true
  if (host === '::1' || host.startsWith('fc') || host.startsWith('fd') || host.startsWith('fe80:')) return true
  return false
}

function extractPreview(html: string, url: URL) {
  const product = findJsonLdProduct(html)
  const offer = asRecord(Array.isArray(product.offers) ? product.offers[0] : product.offers)
  const imageValue = product.image
  const productImage = Array.isArray(imageValue) ? imageValue[0] : imageValue
  const title = firstValue(
    String(product.name || ''),
    meta(html, 'property', 'og:title'),
    meta(html, 'name', 'twitter:title'),
    tagContent(html, 'title'),
  )
  const description = firstValue(
    String(product.description || ''),
    meta(html, 'property', 'og:description'),
    meta(html, 'name', 'description'),
  )
  const imageUrl = safeAbsoluteUrl(firstValue(
    String(productImage || ''),
    meta(html, 'property', 'og:image'),
    meta(html, 'name', 'twitter:image'),
  ), url)
  const priceText = firstValue(
    firstAttributeValue(html, ['product-price', 'data-product-price', 'data-sale-price', 'data-price']),
    String(offer.price || ''),
    String(offer.lowPrice || ''),
    meta(html, 'property', 'product:price:amount'),
    meta(html, 'property', 'og:price:amount'),
    meta(html, 'itemprop', 'price'),
  )
  const currency = detectCurrency(html, url, offer, priceText)

  return {
    title: cleanText(title).slice(0, 240),
    description: cleanText(description).slice(0, 1200),
    productUrl: url.toString(),
    imageUrl,
    source: sourceName(url.hostname),
    price: parsePrice(priceText),
    currency: /^[A-Z]{3}$/.test(currency) ? currency : 'RUB',
  }
}

function findJsonLdProduct(html: string): Record<string, unknown> {
  const scripts = html.matchAll(/<script[^>]+type=["']application\/ld\+json["'][^>]*>([\s\S]*?)<\/script>/gi)
  for (const match of scripts) {
    try {
      const parsed = JSON.parse(match[1].trim())
      const found = findProduct(parsed)
      if (found) return found
    } catch {
      // Some stores publish invalid optional JSON-LD; Open Graph remains a fallback.
    }
  }
  return {}
}

function findProduct(value: unknown): Record<string, unknown> | null {
  if (Array.isArray(value)) {
    for (const item of value) {
      const found = findProduct(item)
      if (found) return found
    }
    return null
  }
  const record = asRecord(value)
  const type = record['@type']
  if (type === 'Product' || (Array.isArray(type) && type.includes('Product'))) return record
  return findProduct(record['@graph'])
}

function meta(html: string, attribute: string, value: string) {
  const escaped = value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
  const direct = new RegExp(`<meta[^>]+${attribute}=["']${escaped}["'][^>]+content=["']([^"']*)["'][^>]*>`, 'i').exec(html)
  const reverse = new RegExp(`<meta[^>]+content=["']([^"']*)["'][^>]+${attribute}=["']${escaped}["'][^>]*>`, 'i').exec(html)
  return decodeEntities(direct?.[1] || reverse?.[1] || '')
}

function tagContent(html: string, tag: string) {
  return decodeEntities(new RegExp(`<${tag}[^>]*>([\\s\\S]*?)<\/${tag}>`, 'i').exec(html)?.[1] || '')
}

function attributeValue(html: string, attribute: string) {
  const escaped = attribute.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
  const match = new RegExp(`\\s${escaped}=["']([^"']+)["']`, 'i').exec(html)
  return decodeEntities(match?.[1] || '')
}

function firstAttributeValue(html: string, attributes: string[]) {
  for (const attribute of attributes) {
    const value = attributeValue(html, attribute)
    if (value.trim()) return value
  }
  return ''
}

function cleanText(value: string) {
  return decodeEntities(value).replace(/<[^>]*>/g, ' ').replace(/\s+/g, ' ').trim()
}

function decodeEntities(value: string) {
  return value
    .replace(/&quot;/gi, '"').replace(/&#34;/g, '"').replace(/&#39;|&apos;/gi, "'")
    .replace(/&amp;/gi, '&').replace(/&lt;/gi, '<').replace(/&gt;/gi, '>').replace(/&nbsp;/gi, ' ')
}

function safeAbsoluteUrl(value: string, base: URL) {
  if (!value) return ''
  try {
    const url = new URL(value, base)
    return ['http:', 'https:'].includes(url.protocol) ? url.toString() : ''
  } catch {
    return ''
  }
}

function sourceName(host: string) {
  return host.toLowerCase().replace(/^www\./, '')
}

function detectCurrency(html: string, url: URL, offer: Record<string, unknown>, priceText: string) {
  const explicit = firstValue(
    String(offer.priceCurrency || ''),
    meta(html, 'property', 'product:price:currency'),
    meta(html, 'property', 'og:price:currency'),
    meta(html, 'itemprop', 'priceCurrency'),
    firstAttributeValue(html, ['product-currency', 'data-currency', 'data-price-currency']),
  )
  const explicitCurrency = normalizeCurrency(explicit, true)
  if (explicitCurrency) return explicitCurrency

  const nearbyCurrency = currencyNearPrice(html, priceText, false)
  if (nearbyCurrency) return nearbyCurrency

  const domainCurrency = currencyFromDomain(url.hostname)
  if (domainCurrency) return domainCurrency

  return currencyNearPrice(html, priceText, true) || normalizeCurrency(priceText, true) || 'RUB'
}

function currencyNearPrice(html: string, priceText: string, allowAmbiguousSymbols: boolean) {
  if (!priceText) return ''
  const index = html.indexOf(priceText)
  if (index < 0) return ''
  return normalizeCurrency(html.slice(Math.max(0, index - 180), index + priceText.length + 180), allowAmbiguousSymbols)
}

function normalizeCurrency(value: string, allowAmbiguousSymbols: boolean) {
  const text = decodeEntities(String(value || '')).trim().toUpperCase()
  const code = text.match(/(?:^|[^A-Z])(RUB|BYN|KZT|UAH|USD|EUR|GBP|CNY|JPY|TRY|PLN|CHF|INR|AED|AMD|GEL|UZS|KGS|AZN|MDL|CAD|AUD|NZD)(?:[^A-Z]|$)/)?.[1]
  if (code) return code
  if (/₽|РОССИЙСК\w*\s+РУБ|\bРУБ(?:Л|\.|\s|$)/i.test(value)) return 'RUB'
  if (/₸|ТЕНГЕ/i.test(value)) return 'KZT'
  if (/₴|ГРИВЕН|\bГРН\b/i.test(value)) return 'UAH'
  if (/€/.test(value)) return 'EUR'
  if (/£/.test(value)) return 'GBP'
  if (/₺/.test(value)) return 'TRY'
  if (/ZŁ/i.test(value)) return 'PLN'
  if (/₹/.test(value)) return 'INR'
  if (/֏/.test(value)) return 'AMD'
  if (/₾/.test(value)) return 'GEL'
  if (/₼/.test(value)) return 'AZN'
  if (allowAmbiguousSymbols && /\$/.test(value)) return 'USD'
  if (allowAmbiguousSymbols && /¥/.test(value)) return 'CNY'
  return ''
}

function currencyFromDomain(host: string) {
  const normalized = host.toLowerCase().replace(/^www\./, '')
  const suffixes: Array<[string, string]> = [
    ['.ru', 'RUB'], ['.рф', 'RUB'], ['.by', 'BYN'], ['.kz', 'KZT'], ['.ua', 'UAH'],
    ['.uz', 'UZS'], ['.kg', 'KGS'], ['.am', 'AMD'], ['.ge', 'GEL'], ['.az', 'AZN'], ['.md', 'MDL'],
    ['.uk', 'GBP'], ['.co.uk', 'GBP'], ['.us', 'USD'], ['.ca', 'CAD'], ['.com.au', 'AUD'], ['.au', 'AUD'],
    ['.jp', 'JPY'], ['.cn', 'CNY'], ['.tr', 'TRY'], ['.pl', 'PLN'], ['.ch', 'CHF'], ['.in', 'INR'],
    ['.ae', 'AED'], ['.nz', 'NZD'], ['.de', 'EUR'], ['.fr', 'EUR'], ['.it', 'EUR'], ['.es', 'EUR'],
    ['.pt', 'EUR'], ['.nl', 'EUR'], ['.be', 'EUR'], ['.at', 'EUR'], ['.fi', 'EUR'], ['.ie', 'EUR'],
    ['.gr', 'EUR'], ['.sk', 'EUR'], ['.si', 'EUR'], ['.ee', 'EUR'], ['.lv', 'EUR'], ['.lt', 'EUR'], ['.eu', 'EUR'],
  ]
  return suffixes.find(([suffix]) => normalized.endsWith(suffix))?.[1] || ''
}

function parsePrice(value: string) {
  const normalized = value.replace(/[^\d.,]/g, '').replace(/\s/g, '').replace(',', '.')
  const price = Number.parseFloat(normalized)
  return Number.isFinite(price) && price >= 0 ? price : 0
}

function firstValue(...values: string[]) {
  return values.find((value) => value.trim()) || ''
}

function asRecord(value: unknown): Record<string, unknown> {
  return value && typeof value === 'object' ? value as Record<string, unknown> : {}
}
