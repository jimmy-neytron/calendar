export interface WgerTranslation {
  id: number
  name: string
  description: string
  language: number
  license_author?: string
}

export interface WgerImage {
  id: number
  image: string
  is_main: boolean
  thumbnails?: {
    small?: string
    medium?: string
  }
  license_author?: string
}

export interface WgerMuscle {
  id: number
  name: string
  name_en: string
  image_url_main: string
  image_url_secondary: string
}

export interface WgerEquipment {
  id: number
  name: string
}

export interface WgerExerciseInfo {
  id: number
  uuid: string
  category: { id: number; name: string }
  muscles: WgerMuscle[]
  muscles_secondary: WgerMuscle[]
  equipment: WgerEquipment[]
  images: WgerImage[]
  translations: WgerTranslation[]
  license: { short_name: string; full_name: string; url: string }
  license_author: string
}

export interface SportApiExercise {
  id: string
  sourceId: number
  title: string
  description: string
  category: string
  muscles: string[]
  secondaryMuscles: string[]
  equipment: string[]
  imageUrl: string
  imageFallbackUrl: string
  muscleImageUrl: string
  licenseName: string
  licenseUrl: string
  author: string
  sourceUrl: string
}

export interface ExerciseCatalogResult {
  exercises: SportApiExercise[]
  fromCache: boolean
  isStale: boolean
}
