import { computed, ref, watch } from 'vue'
import { getPublicHolidays } from '../../services/holiday.service.js'

export function usePublicHolidays(countryCode, visibleYears) {
  const holidays = ref([])
  const isLoading = ref(false)
  const error = ref(null)
  let requestId = 0

  const holidaysByDate = computed(() => holidays.value.reduce((result, holiday) => {
    if (!result[holiday.date]) result[holiday.date] = []
    result[holiday.date].push(holiday)
    return result
  }, {}))

  async function loadHolidays() {
    const currentRequestId = ++requestId
    const years = [...new Set(visibleYears.value)].filter(Number.isInteger)
    if (!countryCode.value || !years.length) {
      holidays.value = []
      return
    }

    isLoading.value = true
    error.value = null

    try {
      const results = await Promise.all(
        years.map((year) => getPublicHolidays(year, countryCode.value))
      )
      if (currentRequestId === requestId) holidays.value = results.flat()
    } catch (loadError) {
      if (currentRequestId !== requestId) return
      holidays.value = []
      error.value = loadError
    } finally {
      if (currentRequestId === requestId) isLoading.value = false
    }
  }

  watch([countryCode, visibleYears], loadHolidays, { immediate: true })

  return {
    holidaysByDate,
    isLoading,
    error,
    reload: loadHolidays,
  }
}
