import { afterEach, describe, expect, it, vi } from 'vitest'
import { searchOpenFoodFacts } from './openFoodFacts.api'

describe('Open Food Facts API', () => {
  afterEach(() => vi.unstubAllGlobals())

  it('получает продукт по штрихкоду напрямую через API v3', async () => {
    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({
        status: 'success',
        product: {
          code: '3017620422003',
          product_name: 'Nutella',
          brands: 'Ferrero',
          nutriments: {
            'energy-kcal_100g': 539,
            proteins_100g: 6.3,
            fat_100g: 30.9,
            carbohydrates_100g: 57.5,
          },
        },
      }),
    })
    vi.stubGlobal('fetch', fetchMock)

    const result = await searchOpenFoodFacts('3017620422003')

    expect(String(fetchMock.mock.calls[0][0])).toContain('/api/v3/product/3017620422003')
    expect(result).toEqual([{
      id: '3017620422003',
      name: 'Nutella',
      brand: 'Ferrero',
      source: 'openfoodfacts',
      nutritionPer100g: { calories: 539, protein: 6.3, fat: 30.9, carbs: 57.5 },
    }])
  })
})
