export type InvestmentSourceType = 'wallet' | 'exchange' | 'cash' | 'bank' | 'broker' | 'other'
export type InvestmentAssetType = 'crypto' | 'fiat'
export type InvestmentExpenseCategory = 'purchase' | 'transfer' | 'fee' | 'other'

export interface InvestmentSource {
  id: string
  workspaceId: string
  userId: string
  name: string
  type: InvestmentSourceType
  color: string
  note: string
  createdAt: string
  updatedAt: string
}

export interface InvestmentHolding {
  id: string
  workspaceId: string
  userId: string
  sourceId: string
  assetType: InvestmentAssetType
  assetId: string
  name: string
  symbol: string
  network: string
  contractAddress: string
  quantity: number
  costAmount: number
  costCurrency: string
  createdAt: string
  updatedAt: string
}

export interface InvestmentSnapshotPosition {
  assetId: string
  symbol: string
  valueRub: number
  valueUsd: number
}

export interface InvestmentSnapshot {
  id: string
  workspaceId: string
  userId: string
  capturedOn: string
  totalRub: number
  totalUsd: number
  positions: InvestmentSnapshotPosition[]
  createdAt: string
  updatedAt: string
}

export interface InvestmentTransaction {
  id: string
  workspaceId: string
  userId: string
  holdingId: string
  sourceId: string
  assetId: string
  assetType: InvestmentAssetType
  name: string
  symbol: string
  quantity: number
  category: InvestmentExpenseCategory
  spentOn: string
  note: string
  valueRub: number
  valueUsd: number
  createdAt: string
  updatedAt: string
}

export interface CryptoAssetSearchResult {
  id: string
  name: string
  symbol: string
  rank: number
  type: string
}

export interface InvestmentQuote {
  price: number
  change24h: number
  updatedAt: string
}

export interface InvestmentPricePoint {
  timestamp: string
  priceUsd: number
}

export interface InvestmentPriceHistory {
  points: InvestmentPricePoint[]
  fetchedAt: string
  fromCache: boolean
}
