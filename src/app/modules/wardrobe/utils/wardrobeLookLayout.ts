import type { WardrobeItem, WardrobeLookPlacement } from '../../../types/wardrobe'

const defaults: Record<WardrobeItem['category'], Pick<WardrobeLookPlacement, 'x'|'y'|'width'>> = {
  top: { x: 50, y: 25, width: 54 },
  outerwear: { x: 50, y: 27, width: 64 },
  onepiece: { x: 50, y: 45, width: 62 },
  bottom: { x: 50, y: 57, width: 52 },
  shoes: { x: 50, y: 83, width: 44 },
  accessory: { x: 78, y: 35, width: 28 },
}

export function createDefaultPlacement(item: WardrobeItem, index: number): WardrobeLookPlacement {
  const base = defaults[item.category]
  const offset = index % 2 === 0 ? -3 : 3
  return { itemId:item.id, x:clamp(base.x+offset,5,95), y:clamp(base.y+(index%3)*2,5,95), width:base.width, rotation:0, zIndex:index+1 }
}

export function reconcileLookLayout(items: WardrobeItem[], layout: WardrobeLookPlacement[] = []): WardrobeLookPlacement[] {
  const stored = new Map((Array.isArray(layout) ? layout : []).map(placement => [placement.itemId, placement]))
  return items.map((item,index) => normalizePlacement(stored.get(item.id) || createDefaultPlacement(item,index),item.id,index))
}

export function normalizeLookLayout(value: unknown): WardrobeLookPlacement[] {
  if (!Array.isArray(value)) return []
  return value.flatMap((entry,index) => {
    if (!entry || typeof entry !== 'object') return []
    const placement = entry as Partial<WardrobeLookPlacement>
    if (!placement.itemId) return []
    return [normalizePlacement(placement,String(placement.itemId),index)]
  }).slice(0,30)
}

function normalizePlacement(value: Partial<WardrobeLookPlacement>, itemId: string, index: number): WardrobeLookPlacement {
  return {
    itemId,
    x: clamp(number(value.x,50),5,95),
    y: clamp(number(value.y,50),5,95),
    width: clamp(number(value.width,50),8,90),
    rotation: clamp(number(value.rotation,0),-25,25),
    zIndex: Math.max(1,Math.round(number(value.zIndex,index+1))),
  }
}

function number(value: unknown, fallback: number) { const parsed=Number(value);return Number.isFinite(parsed)?parsed:fallback }
export function clamp(value:number,min:number,max:number){return Math.min(max,Math.max(min,value))}
