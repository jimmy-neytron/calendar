export type PurchaseCategory = 'tools' | 'electronics' | 'home' | 'clothes' | 'hobby' | 'other'
export type PurchaseStatus = 'wanted' | 'thinking' | 'bought'

export interface PurchaseItem {
  id: string
  workspaceId: string
  title: string
  description: string
  category: PurchaseCategory
  status: PurchaseStatus
  productUrl: string
  imageUrl: string
  source: string
  currentPrice: number
  targetPrice: number
  currency: string
  priority: number
  createdAt: string
  updatedAt: string
}

export interface ProductLinkPreview {
  title: string
  description: string
  productUrl: string
  imageUrl: string
  source: string
  price: number
  currency: string
}
