import { describe, expect, it } from 'vitest'
import { aggregateInvestmentAssets, calculatePortfolioDayChange, calculatePortfolioValueChange, type ValuedHolding } from './investmentPortfolio'

const holding = (overrides: Partial<ValuedHolding>): ValuedHolding => ({
  id: crypto.randomUUID(), workspaceId: 'w', userId: 'u', sourceId: 's', sourceName: 'Кошелёк', sourceColor: '#000',
  assetType: 'crypto', assetId: 'btc-bitcoin', name: 'Bitcoin', symbol: 'BTC', network: '', contractAddress: '', quantity: 1,
  costAmount: 0, costCurrency: 'RUB', priceRub: 100, priceUsd: 1, valueRub: 100, valueUsd: 1, costRub: 0, costUsd: 0,
  change24h: 10, createdAt: '', updatedAt: '', ...overrides,
})

describe('investment portfolio calculations', () => {
  it('combines the same asset from different sources', () => {
    const assets = aggregateInvestmentAssets([holding({ quantity: 1, valueRub: 100 }), holding({ sourceId: 's2', quantity: 2, valueRub: 200 })])
    expect(assets).toHaveLength(1)
    expect(assets[0]).toMatchObject({ quantity: 3, valueRub: 300 })
    expect(assets[0].positions).toHaveLength(2)
  })

  it('calculates weighted daily portfolio change', () => {
    const assets = aggregateInvestmentAssets([holding({ valueUsd: 110, change24h: 10 })])
    const change = calculatePortfolioDayChange(assets, 'USD')
    expect(change.amount).toBeCloseTo(10)
    expect(change.percent).toBeCloseTo(10)
  })

  it('calculates portfolio change from the first snapshot', () => {
    expect(calculatePortfolioValueChange(150, 100)).toEqual({ amount: 50, percent: 50 })
    expect(calculatePortfolioValueChange(75, 100)).toEqual({ amount: -25, percent: -25 })
  })

  it('does not produce an invalid percent without a baseline value', () => {
    expect(calculatePortfolioValueChange(150, 0)).toEqual({ amount: 150, percent: 0 })
  })
})
