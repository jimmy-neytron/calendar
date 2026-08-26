import type { InvestmentHolding } from '../../types/investment'

export interface ValuedHolding extends InvestmentHolding {
  sourceName: string
  sourceColor: string
  priceRub: number
  priceUsd: number
  valueRub: number
  valueUsd: number
  costRub: number
  costUsd: number
  change24h: number
}

export interface AggregatedInvestmentAsset {
  key: string
  assetId: string
  assetType: InvestmentHolding['assetType']
  name: string
  symbol: string
  quantity: number
  valueRub: number
  valueUsd: number
  costRub: number
  costUsd: number
  change24h: number
  positions: ValuedHolding[]
}

export function aggregateInvestmentAssets(holdings: ValuedHolding[]): AggregatedInvestmentAsset[] {
  const assets = new Map<string, AggregatedInvestmentAsset>()
  holdings.forEach((holding) => {
    const key = `${holding.assetType}:${holding.assetId}`
    const current = assets.get(key) || {
      key, assetId: holding.assetId, assetType: holding.assetType, name: holding.name, symbol: holding.symbol,
      quantity: 0, valueRub: 0, valueUsd: 0, costRub: 0, costUsd: 0, change24h: 0, positions: [],
    }
    const previousValue = current.valueUsd
    current.quantity += holding.quantity
    current.valueRub += holding.valueRub
    current.valueUsd += holding.valueUsd
    current.costRub += holding.costRub
    current.costUsd += holding.costUsd
    current.change24h = current.valueUsd > 0 ? (current.change24h * previousValue + holding.change24h * holding.valueUsd) / current.valueUsd : 0
    current.positions.push(holding)
    assets.set(key, current)
  })
  return [...assets.values()].sort((left, right) => right.valueRub - left.valueRub)
}

export function calculatePortfolioDayChange(assets: AggregatedInvestmentAsset[], currency: 'RUB' | 'USD') {
  const field = currency === 'RUB' ? 'valueRub' : 'valueUsd'
  const current = assets.reduce((sum, asset) => sum + asset[field], 0)
  const previous = assets.reduce((sum, asset) => sum + asset[field] / Math.max(.0001, 1 + asset.change24h / 100), 0)
  return { amount: current - previous, percent: previous > 0 ? (current - previous) / previous * 100 : 0 }
}

export function calculatePortfolioValueChange(current: number, previous: number) {
  const amount = current - previous
  return { amount, percent: previous > 0 ? amount / previous * 100 : 0 }
}
