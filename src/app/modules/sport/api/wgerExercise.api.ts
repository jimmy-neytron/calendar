import type {
  ExerciseCatalogResult,
  SportApiExercise,
  WgerExerciseInfo,
  WgerTranslation,
} from '../types/sportExerciseApi.types'

const API_URL = String(import.meta.env.VITE_WGER_API_URL || 'https://wger.de/api/v2').replace(/\/$/, '')
const CACHE_KEY = 'planera:sport:wger-exercises:v1'
const CACHE_TTL_MS = 12 * 60 * 60 * 1000
const RUSSIAN_LANGUAGE_ID = 5
const ENGLISH_LANGUAGE_ID = 2
const HOME_EQUIPMENT_IDS = [1, 3, 4, 7]

const EQUIPMENT_LABELS: Record<string, string> = {
  Barbell: 'Штанга',
  Dumbbell: 'Гантели',
  'Gym mat': 'Коврик',
  'none (bodyweight exercise)': 'Без оборудования',
}

const CATEGORY_LABELS: Record<string, string> = {
  Abs: 'Пресс',
  Arms: 'Руки',
  Back: 'Спина',
  Calves: 'Икры',
  Cardio: 'Кардио',
  Chest: 'Грудь',
  Legs: 'Ноги',
  Shoulders: 'Плечи',
}

const MUSCLE_LABELS: Record<string, string> = {
  Abs: 'Пресс',
  Biceps: 'Бицепс',
  Calves: 'Икры',
  Chest: 'Грудь',
  Glutes: 'Ягодицы',
  Hamstrings: 'Задняя поверхность бедра',
  Lats: 'Широчайшие',
  Quads: 'Квадрицепс',
  Shoulders: 'Плечи',
  Triceps: 'Трицепс',
  Trapezius: 'Трапеции',
}

interface WgerListResponse {
  results: WgerExerciseInfo[]
}

interface CachedCatalog {
  savedAt: number
  exercises: SportApiExercise[]
}

export async function fetchHomeExerciseCatalog(force = false): Promise<ExerciseCatalogResult> {
  const cached = readCache()
  const isFresh = cached && Date.now() - cached.savedAt < CACHE_TTL_MS
  if (!force && isFresh) return { exercises: cached.exercises, fromCache: true, isStale: false }

  try {
    const responses = await Promise.all(HOME_EQUIPMENT_IDS.map(async (equipmentId) => {
      const url = `${API_URL}/exerciseinfo/?equipment=${equipmentId}&limit=300`
      const response = await fetch(url, { headers: { Accept: 'application/json' } })
      if (!response.ok) throw new Error(`wger returned ${response.status}`)
      return response.json() as Promise<WgerListResponse>
    }))
    const unique = new Map<number, WgerExerciseInfo>()
    responses.flatMap((response) => response.results).forEach((exercise) => unique.set(exercise.id, exercise))
    const exercises = [...unique.values()]
      .map(mapExercise)
      .filter((exercise): exercise is SportApiExercise => exercise !== null)
      .sort((left, right) => Number(Boolean(right.imageUrl)) - Number(Boolean(left.imageUrl)) || left.title.localeCompare(right.title, 'ru'))
    if (!exercises.length) throw new Error('wger returned an empty catalog')
    writeCache(exercises)
    return { exercises, fromCache: false, isStale: false }
  } catch (error) {
    if (cached?.exercises.length) return { exercises: cached.exercises, fromCache: true, isStale: true }
    throw error
  }
}

export function clearExerciseCatalogCache() {
  getStorage()?.removeItem(CACHE_KEY)
}

function mapExercise(source: WgerExerciseInfo): SportApiExercise | null {
  const translation = selectTranslation(source.translations)
  if (!translation?.name.trim()) return null
  const mainImage = source.images.find((image) => image.is_main) || source.images[0]
  const primaryMuscle = source.muscles[0]
  return {
    id: source.uuid || `wger-${source.id}`,
    sourceId: source.id,
    title: translation.name.trim(),
    description: htmlToText(translation.description),
    category: CATEGORY_LABELS[source.category.name] || source.category.name,
    muscles: source.muscles.map(mapMuscle),
    secondaryMuscles: source.muscles_secondary.map(mapMuscle),
    equipment: source.equipment.length
      ? source.equipment.map((item) => EQUIPMENT_LABELS[item.name] || item.name)
      : ['Без оборудования'],
    imageUrl: mainImage?.thumbnails?.medium || mainImage?.image || '',
    imageFallbackUrl: mainImage?.image || '',
    muscleImageUrl: primaryMuscle?.image_url_main || '',
    licenseName: source.license?.short_name || 'Creative Commons',
    licenseUrl: source.license?.url || 'https://wger.de',
    author: translation.license_author || source.license_author || 'wger community',
    sourceUrl: `https://wger.de/en/exercise/${source.id}/view`,
  }
}

function selectTranslation(translations: WgerTranslation[]) {
  return translations.find((item) => item.language === RUSSIAN_LANGUAGE_ID)
    || translations.find((item) => item.language === ENGLISH_LANGUAGE_ID)
    || translations[0]
}

function mapMuscle(muscle: WgerExerciseInfo['muscles'][number]) {
  return MUSCLE_LABELS[muscle.name_en] || MUSCLE_LABELS[muscle.name] || muscle.name_en || muscle.name
}

function htmlToText(html: string) {
  if (!html) return ''
  return html
    .replace(/<\/(li|p|div|h[1-6])>/gi, '. ')
    .replace(/<br\s*\/?>/gi, '. ')
    .replace(/<[^>]+>/g, ' ')
    .replace(/&nbsp;|&#160;/gi, ' ')
    .replace(/&amp;/gi, '&')
    .replace(/&quot;/gi, '"')
    .replace(/&#39;|&apos;/gi, "'")
    .replace(/&lt;/gi, '<')
    .replace(/&gt;/gi, '>')
    .replace(/\s+/g, ' ')
    .replace(/\.{2,}/g, '.')
    .replace(/\s+([.,!?])/g, '$1')
    .trim()
}

function readCache(): CachedCatalog | null {
  try {
    const value = JSON.parse(getStorage()?.getItem(CACHE_KEY) || 'null') as CachedCatalog | null
    return value?.savedAt && Array.isArray(value.exercises) ? value : null
  } catch {
    return null
  }
}

function writeCache(exercises: SportApiExercise[]) {
  try {
    getStorage()?.setItem(CACHE_KEY, JSON.stringify({ savedAt: Date.now(), exercises }))
  } catch {
    // The catalog still works when browser storage is unavailable or full.
  }
}

function getStorage() {
  return typeof localStorage === 'undefined' ? null : localStorage
}
