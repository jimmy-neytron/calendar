import { computed, onMounted, ref } from 'vue'
import { clearExerciseCatalogCache, fetchHomeExerciseCatalog } from '../api/wgerExercise.api'
import type { SportApiExercise } from '../types/sportExerciseApi.types'

export function useExerciseCatalog() {
  const exercises = ref<SportApiExercise[]>([])
  const isLoading = ref(false)
  const error = ref('')
  const isStale = ref(false)
  const query = ref('')
  const category = ref('')
  const equipment = ref('')

  const categories = computed(() => unique(exercises.value.map((item) => item.category)))
  const equipmentOptions = computed(() => unique(exercises.value.flatMap((item) => item.equipment)))
  const filteredExercises = computed(() => {
    const normalizedQuery = query.value.trim().toLocaleLowerCase('ru')
    return exercises.value.filter((exercise) => {
      if (category.value && exercise.category !== category.value) return false
      if (equipment.value && !exercise.equipment.includes(equipment.value)) return false
      if (!normalizedQuery) return true
      return [exercise.title, exercise.description, exercise.category, ...exercise.muscles, ...exercise.equipment]
        .join(' ')
        .toLocaleLowerCase('ru')
        .includes(normalizedQuery)
    })
  })

  async function load(force = false) {
    isLoading.value = true
    error.value = ''
    try {
      if (force) clearExerciseCatalogCache()
      const result = await fetchHomeExerciseCatalog(force)
      exercises.value = result.exercises
      isStale.value = result.isStale
    } catch {
      error.value = 'Не удалось загрузить справочник wger. Проверь подключение к интернету и попробуй ещё раз.'
    } finally {
      isLoading.value = false
    }
  }

  function resetFilters() {
    query.value = ''
    category.value = ''
    equipment.value = ''
  }

  onMounted(() => load())

  return {
    exercises,
    filteredExercises,
    categories,
    equipmentOptions,
    isLoading,
    error,
    isStale,
    query,
    category,
    equipment,
    load,
    resetFilters,
  }
}

function unique(values: string[]) {
  return [...new Set(values.filter(Boolean))].sort((left, right) => left.localeCompare(right, 'ru'))
}
