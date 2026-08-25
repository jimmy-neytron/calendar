import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { clearExerciseCatalogCache, fetchHomeExerciseCatalog } from './wgerExercise.api'

const sourceExercise = {
  id: 20,
  uuid: 'exercise-uuid',
  category: { id: 13, name: 'Shoulders' },
  muscles: [{ id: 2, name: 'Anterior deltoid', name_en: 'Shoulders', image_url_main: 'muscle.svg', image_url_secondary: '' }],
  muscles_secondary: [],
  equipment: [{ id: 3, name: 'Dumbbell' }],
  images: [{ id: 1, image: 'exercise.webp', is_main: true, thumbnails: { medium: 'exercise-400.png' } }],
  translations: [
    { id: 1, name: 'Shoulder press', description: '<p>Press the weight.</p>', language: 2 },
    { id: 2, name: 'Жим гантелей вверх', description: '<ol><li>Держи корпус ровно</li><li>Подними вес</li></ol>', language: 5 },
  ],
  license: { short_name: 'CC-BY-SA 3', full_name: 'Creative Commons', url: 'license-url' },
  license_author: 'Author',
}

describe('wgerExercise api', () => {
  beforeEach(() => {
    const values = new Map<string, string>()
    vi.stubGlobal('localStorage', {
      getItem: (key: string) => values.get(key) ?? null,
      setItem: (key: string, value: string) => values.set(key, value),
      removeItem: (key: string) => values.delete(key),
      clear: () => values.clear(),
    })
    localStorage.clear()
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue({
      ok: true,
      json: () => Promise.resolve({ results: [sourceExercise] }),
    }))
  })

  afterEach(() => {
    clearExerciseCatalogCache()
    vi.unstubAllGlobals()
  })

  it('prefers Russian translation and maps remote media', async () => {
    const result = await fetchHomeExerciseCatalog()

    expect(result.exercises).toHaveLength(1)
    expect(result.exercises[0]).toMatchObject({
      title: 'Жим гантелей вверх',
      description: 'Держи корпус ровно. Подними вес.',
      category: 'Плечи',
      equipment: ['Гантели'],
      imageUrl: 'exercise-400.png',
    })
    expect(fetch).toHaveBeenCalledTimes(4)
  })

  it('reuses the catalog cache without another network request', async () => {
    await fetchHomeExerciseCatalog()
    vi.mocked(fetch).mockClear()

    const result = await fetchHomeExerciseCatalog()

    expect(result.fromCache).toBe(true)
    expect(fetch).not.toHaveBeenCalled()
  })
})
