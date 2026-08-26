import type { CryptoAssetSearchResult, InvestmentPriceHistory, InvestmentPricePoint, InvestmentQuote } from '../../../types/investment'

const COINPAPRIKA_API = 'https://api.coinpaprika.com/v1'
const FRANKFURTER_API = 'https://api.frankfurter.dev/v2'
const CACHE_TTL = 5 * 60 * 1000
const HISTORY_CACHE_TTL = 12 * 60 * 60 * 1000
const HISTORY_CACHE_PREFIX = 'investment:price-history:v1:'
const quoteCache = new Map<string, { expiresAt: number; quote: InvestmentQuote }>()
const fiatCache = new Map<string, { expiresAt: number; rate: number }>()

interface StoredPriceHistory {
  expiresAt: number
  fetchedAt: string
  points: InvestmentPricePoint[]
}

export async function searchCryptoAssets(query: string): Promise<CryptoAssetSearchResult[]> {
  const normalized = query.trim()
  if (normalized.length < 2) return []
  const response = await fetch(`${COINPAPRIKA_API}/search?q=${encodeURIComponent(normalized)}&c=currencies&limit=12`)
  if (!response.ok) throw new Error('Не удалось найти криптоактивы')
  const data = await response.json() as { currencies?: Array<Record<string, unknown>> }
  return (data.currencies || [])
    .filter((item) => item.is_active !== false)
    .map((item) => ({
      id: String(item.id || ''),
      name: String(item.name || ''),
      symbol: String(item.symbol || '').toUpperCase(),
      rank: Math.max(0, Number(item.rank || 0)),
      type: String(item.type || 'coin'),
    }))
}

export async function loadCryptoQuotes(assetIds: string[], currencies = ['RUB', 'USD']) {
  const settled = await Promise.allSettled(assetIds.map(async (assetId) => {
    const quotes = await loadCryptoTicker(assetId, currencies)
    return [assetId, quotes] as const
  }))
  const entries = settled.filter((item): item is PromiseFulfilledResult<readonly [string, Record<string, InvestmentQuote>]> => item.status === 'fulfilled').map((item) => item.value)
  if (assetIds.length && !entries.length) throw settled.find((item) => item.status === 'rejected')?.reason || new Error('Не удалось обновить криптокурсы')
  return Object.fromEntries(entries) as Record<string, Record<string, InvestmentQuote>>
}

export async function loadCryptoPriceHistory(assetId: string): Promise<InvestmentPriceHistory> {
  const cacheKey = `${HISTORY_CACHE_PREFIX}${assetId}`
  const cached = readPriceHistory(cacheKey)
  if (cached && cached.expiresAt > Date.now()) return { points: cached.points, fetchedAt: cached.fetchedAt, fromCache: true }

  // The free plan checks the rolling one-year boundary down to the exact second.
  // A one-day margin prevents a date-at-midnight request from falling outside it.
  const start = new Date(Date.now() - 364 * 24 * 60 * 60 * 1000).toISOString()
  try {
    const response = await fetch(`${COINPAPRIKA_API}/tickers/${encodeURIComponent(assetId)}/historical?start=${encodeURIComponent(start)}&interval=1d&quote=usd&limit=500`)
    if (!response.ok) throw new Error('Не удалось загрузить историю цены')
    const data = await response.json() as Array<Record<string, unknown>>
    const points = data
      .map((item) => ({ timestamp: String(item.timestamp || ''), priceUsd: Math.max(0, Number(item.price || 0)) }))
      .filter((item) => item.timestamp && item.priceUsd > 0)
      .sort((left, right) => left.timestamp.localeCompare(right.timestamp))
    if (!points.length) throw new Error('У токена пока нет истории цены')

    const fetchedAt = new Date().toISOString()
    writePriceHistory(cacheKey, { expiresAt: Date.now() + HISTORY_CACHE_TTL, fetchedAt, points })
    return { points, fetchedAt, fromCache: false }
  } catch (error) {
    if (cached?.points.length) return { points: cached.points, fetchedAt: cached.fetchedAt, fromCache: true }
    throw error
  }
}

function readPriceHistory(key: string): StoredPriceHistory | null {
  try {
    const raw = localStorage.getItem(key)
    if (!raw) return null
    const value = JSON.parse(raw) as Partial<StoredPriceHistory>
    if (!Array.isArray(value.points) || !value.fetchedAt || !Number.isFinite(value.expiresAt)) return null
    return value as StoredPriceHistory
  } catch {
    return null
  }
}

function writePriceHistory(key: string, value: StoredPriceHistory) {
  try { localStorage.setItem(key, JSON.stringify(value)) } catch { /* Memory-only fallback is unnecessary for historical data. */ }
}

async function loadCryptoTicker(assetId: string, currencies: string[]) {
  const result: Record<string, InvestmentQuote> = {}
  const missing = currencies.filter((currency) => {
    const cached = quoteCache.get(`${assetId}:${currency}`)
    if (cached && cached.expiresAt > Date.now()) { result[currency] = cached.quote; return false }
    return true
  })
  if (!missing.length) return result

  const response = await fetch(`${COINPAPRIKA_API}/tickers/${encodeURIComponent(assetId)}?quotes=${missing.join(',')}`)
  if (!response.ok) throw new Error(`Не удалось обновить курс ${assetId}`)
  const data = await response.json() as { last_updated?: string; quotes?: Record<string, Record<string, unknown>> }
  missing.forEach((currency) => {
    const raw = data.quotes?.[currency] || {}
    const quote = { price: Math.max(0, Number(raw.price || 0)), change24h: Number(raw.percent_change_24h || 0), updatedAt: String(data.last_updated || new Date().toISOString()) }
    result[currency] = quote
    quoteCache.set(`${assetId}:${currency}`, { expiresAt: Date.now() + CACHE_TTL, quote })
  })
  return result
}

export async function loadFiatRates(baseCurrencies: string[], quoteCurrencies = ['RUB', 'USD']) {
  const pairs = baseCurrencies.flatMap((base) => quoteCurrencies.map((quote) => [base.toUpperCase(), quote.toUpperCase()] as const))
  const settled = await Promise.allSettled(pairs.map(async ([base, quote]) => [`${base}:${quote}`, await loadFiatRate(base, quote)] as const))
  const entries = settled.filter((item): item is PromiseFulfilledResult<readonly [string, number]> => item.status === 'fulfilled').map((item) => item.value)
  return Object.fromEntries(entries) as Record<string, number>
}

async function loadFiatRate(base: string, quote: string) {
  if (base === quote) return 1
  const key = `${base}:${quote}`
  const cached = fiatCache.get(key)
  if (cached && cached.expiresAt > Date.now()) return cached.rate
  const response = await fetch(`${FRANKFURTER_API}/rate/${encodeURIComponent(base)}/${encodeURIComponent(quote)}`)
  if (!response.ok) throw new Error(`Нет курса ${base}/${quote}`)
  const data = await response.json() as { rate?: number }
  const rate = Math.max(0, Number(data.rate || 0))
  fiatCache.set(key, { expiresAt: Date.now() + CACHE_TTL, rate })
  return rate
}
