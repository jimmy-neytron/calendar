import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

type HoldingRow = {
  workspace_id: string
  user_id: string
  asset_type: 'crypto' | 'fiat'
  asset_id: string
  symbol: string
  quantity: number | string
}

type SnapshotRow = {
  id: string
  workspace_id: string
  user_id: string
  captured_on: string
  created_at: string
}

type MarketPrice = { rub: number; usd: number }
type SnapshotPosition = { assetId: string; symbol: string; valueRub: number; valueUsd: number }
type GroupedSnapshotPosition = SnapshotPosition & { portfolioId: string }

const coinPaprikaApi = 'https://api.coinpaprika.com/v1'
const frankfurterApi = 'https://api.frankfurter.dev/v2'
const supabaseUrl = Deno.env.get('SUPABASE_URL') || ''
const serviceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') || ''
const cronSecret = Deno.env.get('INVESTMENT_SNAPSHOT_CRON_SECRET') || Deno.env.get('DIGEST_CRON_SECRET') || ''
const supabase = createClient(supabaseUrl, serviceRoleKey)

Deno.serve(async (request) => {
  if (request.method !== 'POST') return json({ ok: false, error: 'Method not allowed' }, 405)
  if (!cronSecret || request.headers.get('x-cron-secret') !== cronSecret) return json({ ok: false, error: 'Unauthorized' }, 401)
  if (!supabaseUrl || !serviceRoleKey) return json({ ok: false, error: 'Missing Supabase function secrets' }, 500)

  const capturedOn = getMoscowDate()
  const { data: holdingRows, error: holdingsError } = await loadAllHoldings()
  if (holdingsError) return json({ ok: false, error: holdingsError.message }, 500)
  const holdings = (holdingRows || []) as HoldingRow[]
  if (!holdings.length) return json({ ok: true, capturedOn, snapshots: 0, holdings: 0, marketRequests: 0 })

  const cryptoIds = [...new Set(holdings.filter((item) => item.asset_type === 'crypto').map((item) => item.asset_id))]
  const fiatCodes = [...new Set(holdings.filter((item) => item.asset_type === 'fiat').map((item) => item.symbol.toUpperCase()))]
  const marketRequestCount = cryptoIds.length + fiatCodes.filter((code) => code !== 'RUB' && code !== 'USD').length * 2
  const [cryptoPrices, fiatPrices] = await Promise.all([loadCryptoPrices(cryptoIds), loadFiatPrices(fiatCodes)])
  const prices = new Map([...cryptoPrices, ...fiatPrices])
  const portfolios = buildPortfolios(holdings, prices)

  const { data: existingRows, error: existingError } = await loadExistingSnapshots(capturedOn)
  if (existingError) return json({ ok: false, error: existingError.message }, 500)
  const existing = new Map(((existingRows || []) as SnapshotRow[]).map((item) => [portfolioKey(item), item]))
  const now = new Date().toISOString()
  const snapshots = [...portfolios.values()].filter((portfolio) => portfolio.totalRub > 0 || portfolio.totalUsd > 0).map((portfolio) => {
    const current = existing.get(portfolio.key)
    return {
      id: current?.id || crypto.randomUUID(),
      workspace_id: portfolio.workspaceId,
      user_id: portfolio.userId,
      captured_on: capturedOn,
      total_rub: roundMoney(portfolio.totalRub),
      total_usd: roundMoney(portfolio.totalUsd),
      positions: portfolio.positions.map((position) => ({ ...position, valueRub: roundMoney(position.valueRub), valueUsd: roundMoney(position.valueUsd) })),
      created_at: current?.created_at || now,
      updated_at: now,
    }
  })

  if (!snapshots.length) return json({ ok: true, capturedOn, snapshots: 0, holdings: holdings.length, marketRequests: marketRequestCount, missingPrices: holdings.length })

  const upsertError = await upsertSnapshots(snapshots)
  if (upsertError) return json({ ok: false, error: upsertError.message }, 500)
  const missingPrices = holdings.filter((holding) => { const price = prices.get(priceKey(holding)); return !price || price.rub <= 0 && price.usd <= 0 }).length
  return json({
    ok: true,
    capturedOn,
    snapshots: snapshots.length,
    holdings: holdings.length,
    uniqueCryptoAssets: cryptoIds.length,
    uniqueFiatAssets: fiatCodes.length,
    marketRequests: marketRequestCount,
    databaseWriteBatches: Math.ceil(snapshots.length / 500),
    missingPrices,
  })
})

async function loadAllHoldings() {
  const data: HoldingRow[] = []
  for (let from = 0; ; from += 1000) {
    const result = await supabase
      .from('investment_holdings')
      .select('workspace_id,user_id,asset_type,asset_id,symbol,quantity')
      .gt('quantity', 0)
      .range(from, from + 999)
    if (result.error) return { data, error: result.error }
    const page = (result.data || []) as HoldingRow[]
    data.push(...page)
    if (page.length < 1000) return { data, error: null }
  }
}

async function loadExistingSnapshots(capturedOn: string) {
  const data: SnapshotRow[] = []
  for (let from = 0; ; from += 1000) {
    const result = await supabase
      .from('investment_snapshots')
      .select('id,workspace_id,user_id,captured_on,created_at')
      .eq('captured_on', capturedOn)
      .range(from, from + 999)
    if (result.error) return { data, error: result.error }
    const page = (result.data || []) as SnapshotRow[]
    data.push(...page)
    if (page.length < 1000) return { data, error: null }
  }
}

async function upsertSnapshots(snapshots: Array<Record<string, unknown>>) {
  for (let from = 0; from < snapshots.length; from += 500) {
    const { error } = await supabase
      .from('investment_snapshots')
      .upsert(snapshots.slice(from, from + 500), { onConflict: 'workspace_id,user_id,captured_on' })
    if (error) return error
  }
  return null
}

function buildPortfolios(holdings: HoldingRow[], prices: Map<string, MarketPrice>) {
  const portfolios = new Map<string, { key: string; workspaceId: string; userId: string; totalRub: number; totalUsd: number; positions: SnapshotPosition[] }>()
  const positions = new Map<string, GroupedSnapshotPosition>()

  for (const holding of holdings) {
    const portfolioId = portfolioKey(holding)
    const portfolio = portfolios.get(portfolioId) || { key: portfolioId, workspaceId: holding.workspace_id, userId: holding.user_id, totalRub: 0, totalUsd: 0, positions: [] }
    const price = prices.get(priceKey(holding)) || { rub: 0, usd: 0 }
    const quantity = Math.max(0, Number(holding.quantity) || 0)
    const valueRub = quantity * price.rub
    const valueUsd = quantity * price.usd
    const positionId = `${portfolioId}:${holding.asset_type}:${holding.asset_id}`
    const position = positions.get(positionId) || { portfolioId, assetId: holding.asset_id, symbol: holding.symbol.toUpperCase(), valueRub: 0, valueUsd: 0 }
    position.valueRub += valueRub
    position.valueUsd += valueUsd
    positions.set(positionId, position)
    portfolio.totalRub += valueRub
    portfolio.totalUsd += valueUsd
    portfolios.set(portfolioId, portfolio)
  }

  for (const position of positions.values()) {
    const { portfolioId, ...snapshotPosition } = position
    portfolios.get(portfolioId)?.positions.push(snapshotPosition)
  }
  return portfolios
}

async function loadCryptoPrices(assetIds: string[]) {
  const settled = await mapWithConcurrency(assetIds, 6, async (assetId) => {
    const response = await fetch(`${coinPaprikaApi}/tickers/${encodeURIComponent(assetId)}?quotes=RUB,USD`)
    if (!response.ok) throw new Error(`CoinPaprika ${response.status}: ${assetId}`)
    const data = await response.json() as { quotes?: Record<string, { price?: number }> }
    return [`crypto:${assetId}`, { rub: Math.max(0, Number(data.quotes?.RUB?.price || 0)), usd: Math.max(0, Number(data.quotes?.USD?.price || 0)) }] as const
  })
  return settled.flatMap((item) => item.status === 'fulfilled' ? [item.value] : [])
}

async function loadFiatPrices(codes: string[]) {
  const entries: Array<readonly [string, MarketPrice]> = []
  for (const code of codes) {
    const [rub, usd] = await Promise.all([loadFiatRate(code, 'RUB'), loadFiatRate(code, 'USD')])
    entries.push([`fiat:${code}`, { rub, usd }])
  }
  return entries
}

async function loadFiatRate(base: string, quote: string) {
  if (base === quote) return 1
  try {
    const response = await fetch(`${frankfurterApi}/rate/${encodeURIComponent(base)}/${encodeURIComponent(quote)}`)
    if (!response.ok) return 0
    const data = await response.json() as { rate?: number }
    return Math.max(0, Number(data.rate || 0))
  } catch {
    return 0
  }
}

async function mapWithConcurrency<T, R>(items: T[], concurrency: number, mapper: (item: T) => Promise<R>) {
  const results: PromiseSettledResult<R>[] = new Array(items.length)
  let cursor = 0
  async function worker() {
    while (cursor < items.length) {
      const index = cursor++
      try { results[index] = { status: 'fulfilled', value: await mapper(items[index]) } }
      catch (reason) { results[index] = { status: 'rejected', reason } }
    }
  }
  await Promise.all(Array.from({ length: Math.min(concurrency, items.length) }, worker))
  return results
}

function portfolioKey(item: { workspace_id: string; user_id: string }) { return `${item.workspace_id}:${item.user_id}` }
function priceKey(item: HoldingRow) { return `${item.asset_type}:${item.asset_type === 'fiat' ? item.symbol.toUpperCase() : item.asset_id}` }
function roundMoney(value: number) { return Math.round((Number(value) || 0) * 1000000) / 1000000 }
function getMoscowDate() {
  const parts = new Intl.DateTimeFormat('en-CA', { timeZone: 'Europe/Moscow', year: 'numeric', month: '2-digit', day: '2-digit' }).formatToParts(new Date())
  const value = (type: 'year' | 'month' | 'day') => parts.find((part) => part.type === type)?.value || ''
  return `${value('year')}-${value('month')}-${value('day')}`
}
function json(payload: Record<string, unknown>, status = 200) { return Response.json(payload, { status }) }
