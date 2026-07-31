export type WardrobeCategory = 'top' | 'bottom' | 'outerwear' | 'shoes' | 'accessory' | 'onepiece'
export type WardrobeStatus = 'available' | 'laundry' | 'archived'
export type WardrobeVisibility = 'private' | 'shared'
export type WardrobeOccasion = 'everyday' | 'work' | 'outing' | 'sport' | 'home' | 'other'

export interface WardrobeLookPlacement {
  itemId: string
  x: number
  y: number
  width: number
  rotation: number
  zIndex: number
}

export interface WardrobeItem {
  id: string
  workspaceId: string
  ownerId: string
  name: string
  category: WardrobeCategory
  color: string
  seasons: string[]
  brand: string
  size: string
  note: string
  imagePath: string
  status: WardrobeStatus
  visibility: WardrobeVisibility
  favorite: boolean
  createdAt: string
  updatedAt: string
}

export interface WardrobeLook {
  id: string
  workspaceId: string
  ownerId: string
  title: string
  itemIds: string[]
  layout: WardrobeLookPlacement[]
  occasion: WardrobeOccasion
  note: string
  visibility: WardrobeVisibility
  favorite: boolean
  createdAt: string
  updatedAt: string
}
