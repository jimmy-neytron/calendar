export type StorePackage = { amount: number | null; unit: 'g' | 'ml' | 'piece' | null }

export function extractPackage(name: string): StorePackage {
  const value = name.toLocaleLowerCase('ru-RU').replace(/,/g, '.')
  if (/\d+(?:\.\d+)?\s*(?:кг|г|мл|л|шт)?\s*[-–—/]\s*\d+(?:\.\d+)?\s*(кг|г|мл|л|шт)/.test(value)) return { amount: null, unit: null }
  const multiplied = [...value.matchAll(/(\d+(?:\.\d+)?)\s*[xх×]\s*(\d+(?:\.\d+)?)\s*(кг|г|мл|л|шт)/g)].at(-1)
  const simple = [...value.matchAll(/(\d+(?:\.\d+)?)\s*(кг|г|мл|л|шт)(?=\.|\s|$|[,;])/g)].at(-1)
  const match = multiplied || simple
  if (!match) return { amount: null, unit: null }
  const count = multiplied ? Number(match[1]) : 1
  const amount = Number(multiplied ? match[2] : match[1])
  const rawUnit = multiplied ? match[3] : match[2]
  const total = Math.round(count * amount * (rawUnit === 'кг' || rawUnit === 'л' ? 1000 : 1) * 100) / 100
  if (!Number.isFinite(total) || total <= 0) return { amount: null, unit: null }
  return { amount: total, unit: rawUnit === 'л' || rawUnit === 'мл' ? 'ml' : rawUnit === 'шт' ? 'piece' : 'g' }
}
