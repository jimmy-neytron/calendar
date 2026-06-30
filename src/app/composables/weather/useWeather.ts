import { computed, onMounted, ref, watch, type ComputedRef, type Ref } from 'vue'
import { getWeatherForecast, type WeatherDay, type WeatherForecast, type WeatherLocation, type WeatherPoint } from '../../services/weatherService'

const FALLBACK_LOCATION: WeatherLocation = {
  latitude: 59.9311,
  longitude: 30.3609,
  label: 'Санкт-Петербург',
}

const SAVED_WEATHER_LOCATION_KEY = 'workspace-weather-location'

type SavedWeatherLocation = WeatherLocation & {
  savedAt: number
}

export type WeatherState = {
  forecast: Ref<WeatherForecast | null>
  current: ComputedRef<WeatherPoint | null>
  selectedDay: ComputedRef<WeatherDay | null>
  selectedHourly: ComputedRef<WeatherPoint[]>
  locationLabel: ComputedRef<string>
  isLoading: Ref<boolean>
  error: Ref<Error | null>
  reload: () => Promise<void>
}

export function useWeather(selectedDateKey: Ref<string>): WeatherState {
  const forecast = ref<WeatherForecast | null>(null)
  const savedLocation = readSavedLocation()
  const location = ref<WeatherLocation>(savedLocation || FALLBACK_LOCATION)
  const isLoading = ref(false)
  const error = ref<Error | null>(null)
  let requestId = 0

  const current = computed(() => forecast.value?.current || null)
  const selectedDay = computed(() => forecast.value?.days.find((day) => day.date === selectedDateKey.value) || null)
  const selectedHourly = computed(() => (
    forecast.value?.hourly.filter((point) => point.time.startsWith(`${selectedDateKey.value}T`)) || []
  ))
  const locationLabel = computed(() => forecast.value?.locationLabel || location.value.label)

  async function reload() {
    const currentRequestId = ++requestId
    isLoading.value = true
    error.value = null

    try {
      const result = await getWeatherForecast(location.value)
      if (currentRequestId === requestId) forecast.value = result
    } catch (loadError) {
      if (currentRequestId !== requestId) return
      forecast.value = null
      error.value = loadError instanceof Error ? loadError : new Error('Weather loading failed')
    } finally {
      if (currentRequestId === requestId) isLoading.value = false
    }
  }

  async function preferBrowserLocation() {
    const browserLocation = await resolveBrowserLocation()
    if (!browserLocation) return

    location.value = browserLocation
    saveLocation(browserLocation)
    await reload()
  }

  onMounted(async () => {
    await reload()
    if (!savedLocation) await preferBrowserLocation()
  })

  watch(selectedDateKey, () => {
    if (!forecast.value && !isLoading.value) void reload()
  })

  return {
    forecast,
    current,
    selectedDay,
    selectedHourly,
    locationLabel,
    isLoading,
    error,
    reload,
  }
}

function resolveBrowserLocation(): Promise<WeatherLocation | null> {
  if (typeof navigator === 'undefined' || !navigator.geolocation) return Promise.resolve(null)

  return new Promise((resolve) => {
    navigator.geolocation.getCurrentPosition(
      (position) => {
        resolve({
          latitude: Number(position.coords.latitude.toFixed(4)),
          longitude: Number(position.coords.longitude.toFixed(4)),
          label: 'Рядом с вами',
        })
      },
      () => resolve(null),
      { enableHighAccuracy: false, maximumAge: 1000 * 60 * 60 * 6, timeout: 4500 }
    )
  })
}

function readSavedLocation(): WeatherLocation | null {
  if (typeof localStorage === 'undefined') return null

  try {
    const rawLocation = localStorage.getItem(SAVED_WEATHER_LOCATION_KEY)
    if (!rawLocation) return null
    const savedLocation = JSON.parse(rawLocation) as Partial<SavedWeatherLocation>
    if (!isFiniteNumber(savedLocation.latitude) || !isFiniteNumber(savedLocation.longitude)) return null
    return {
      latitude: savedLocation.latitude,
      longitude: savedLocation.longitude,
      label: savedLocation.label || FALLBACK_LOCATION.label,
    }
  } catch {
    return null
  }
}

function saveLocation(nextLocation: WeatherLocation) {
  if (typeof localStorage === 'undefined') return
  localStorage.setItem(SAVED_WEATHER_LOCATION_KEY, JSON.stringify({ ...nextLocation, savedAt: Date.now() }))
}

function isFiniteNumber(value: unknown): value is number {
  return typeof value === 'number' && Number.isFinite(value)
}
