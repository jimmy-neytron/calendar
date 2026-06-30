const OPEN_METEO_FORECAST_URL = 'https://api.open-meteo.com/v1/forecast'
const WEATHER_FORECAST_CACHE_KEY = 'workspace-weather-forecast-cache'
const WEATHER_FORECAST_CACHE_TTL = 1000 * 60 * 60 * 3

const weatherCache = new Map<string, WeatherForecast>()

export type WeatherConditionTone = 'clear' | 'cloudy' | 'rain' | 'snow' | 'storm' | 'fog'

export type WeatherPoint = {
  time: string
  temperature: number
  apparentTemperature: number
  precipitationProbability: number
  weatherCode: number
  windSpeed: number
  humidity: number
  condition: string
  tone: WeatherConditionTone
  icon: string
}

export type WeatherDay = {
  date: string
  maxTemperature: number
  minTemperature: number
  precipitationProbability: number
  weatherCode: number
  sunrise: string
  sunset: string
  condition: string
  tone: WeatherConditionTone
  icon: string
}

export type WeatherForecast = {
  current: WeatherPoint
  days: WeatherDay[]
  hourly: WeatherPoint[]
  timezone: string
  locationLabel: string
  source: 'open-meteo'
}

export type WeatherLocation = {
  latitude: number
  longitude: number
  label: string
}

type StoredWeatherForecast = {
  savedAt: number
  forecast: WeatherForecast
}

type StoredWeatherForecasts = Record<string, StoredWeatherForecast>

type OpenMeteoResponse = {
  timezone?: string
  current?: {
    time?: string
    temperature_2m?: number
    apparent_temperature?: number
    precipitation_probability?: number
    weather_code?: number
    wind_speed_10m?: number
    relative_humidity_2m?: number
  }
  hourly?: {
    time?: string[]
    temperature_2m?: number[]
    apparent_temperature?: number[]
    precipitation_probability?: number[]
    weather_code?: number[]
    wind_speed_10m?: number[]
    relative_humidity_2m?: number[]
  }
  daily?: {
    time?: string[]
    weather_code?: number[]
    temperature_2m_max?: number[]
    temperature_2m_min?: number[]
    precipitation_probability_max?: number[]
    sunrise?: string[]
    sunset?: string[]
  }
}

export async function getWeatherForecast(location: WeatherLocation): Promise<WeatherForecast> {
  const cacheKey = `${location.latitude.toFixed(2)}:${location.longitude.toFixed(2)}`
  if (weatherCache.has(cacheKey)) return weatherCache.get(cacheKey) as WeatherForecast

  const storedForecast = readStoredForecast(cacheKey)
  if (storedForecast) {
    weatherCache.set(cacheKey, storedForecast)
    return storedForecast
  }

  const url = new URL(OPEN_METEO_FORECAST_URL)
  url.searchParams.set('latitude', String(location.latitude))
  url.searchParams.set('longitude', String(location.longitude))
  url.searchParams.set('current', [
    'temperature_2m',
    'apparent_temperature',
    'weather_code',
    'wind_speed_10m',
    'relative_humidity_2m',
  ].join(','))
  url.searchParams.set('hourly', [
    'temperature_2m',
    'apparent_temperature',
    'precipitation_probability',
    'weather_code',
    'wind_speed_10m',
    'relative_humidity_2m',
  ].join(','))
  url.searchParams.set('daily', [
    'weather_code',
    'temperature_2m_max',
    'temperature_2m_min',
    'precipitation_probability_max',
    'sunrise',
    'sunset',
  ].join(','))
  url.searchParams.set('forecast_days', '16')
  url.searchParams.set('timezone', 'auto')

  const response = await fetch(url)
  if (!response.ok) {
    throw new Error(`Weather API request failed with status ${response.status}`)
  }

  const payload = await response.json() as OpenMeteoResponse
  const forecast = normalizeForecast(payload, location.label)
  weatherCache.set(cacheKey, forecast)
  saveStoredForecast(cacheKey, forecast)
  return forecast
}

function readStoredForecast(cacheKey: string): WeatherForecast | null {
  if (typeof localStorage === 'undefined') return null

  try {
    const storedForecasts = JSON.parse(localStorage.getItem(WEATHER_FORECAST_CACHE_KEY) || '{}') as StoredWeatherForecasts
    const storedForecast = storedForecasts[cacheKey]
    if (!storedForecast || Date.now() - storedForecast.savedAt > WEATHER_FORECAST_CACHE_TTL) return null
    if (!storedForecast.forecast?.days?.length || !storedForecast.forecast?.hourly?.length) return null
    return storedForecast.forecast
  } catch {
    return null
  }
}

function saveStoredForecast(cacheKey: string, forecast: WeatherForecast) {
  if (typeof localStorage === 'undefined') return

  try {
    const storedForecasts = JSON.parse(localStorage.getItem(WEATHER_FORECAST_CACHE_KEY) || '{}') as StoredWeatherForecasts
    storedForecasts[cacheKey] = { savedAt: Date.now(), forecast }
    localStorage.setItem(WEATHER_FORECAST_CACHE_KEY, JSON.stringify(storedForecasts))
  } catch {
    // Cache failures should never block the calendar.
  }
}

function normalizeForecast(payload: OpenMeteoResponse, locationLabel: string): WeatherForecast {
  const hourlyTimes = payload.hourly?.time || []
  const dailyTimes = payload.daily?.time || []
  const currentCode = payload.current?.weather_code ?? 0

  return {
    current: {
      time: payload.current?.time || new Date().toISOString(),
      temperature: roundTemperature(payload.current?.temperature_2m),
      apparentTemperature: roundTemperature(payload.current?.apparent_temperature),
      precipitationProbability: 0,
      weatherCode: currentCode,
      windSpeed: Math.round(payload.current?.wind_speed_10m || 0),
      humidity: Math.round(payload.current?.relative_humidity_2m || 0),
      ...describeWeatherCode(currentCode),
    },
    days: dailyTimes.map((date, index) => {
      const code = payload.daily?.weather_code?.[index] ?? 0
      return {
        date,
        maxTemperature: roundTemperature(payload.daily?.temperature_2m_max?.[index]),
        minTemperature: roundTemperature(payload.daily?.temperature_2m_min?.[index]),
        precipitationProbability: Math.round(payload.daily?.precipitation_probability_max?.[index] || 0),
        weatherCode: code,
        sunrise: payload.daily?.sunrise?.[index] || '',
        sunset: payload.daily?.sunset?.[index] || '',
        ...describeWeatherCode(code),
      }
    }),
    hourly: hourlyTimes.map((time, index) => {
      const code = payload.hourly?.weather_code?.[index] ?? 0
      return {
        time,
        temperature: roundTemperature(payload.hourly?.temperature_2m?.[index]),
        apparentTemperature: roundTemperature(payload.hourly?.apparent_temperature?.[index]),
        precipitationProbability: Math.round(payload.hourly?.precipitation_probability?.[index] || 0),
        weatherCode: code,
        windSpeed: Math.round(payload.hourly?.wind_speed_10m?.[index] || 0),
        humidity: Math.round(payload.hourly?.relative_humidity_2m?.[index] || 0),
        ...describeWeatherCode(code),
      }
    }),
    timezone: payload.timezone || '',
    locationLabel,
    source: 'open-meteo',
  }
}

function roundTemperature(value = 0): number {
  return Math.round(value)
}

function describeWeatherCode(code: number): Pick<WeatherPoint, 'condition' | 'tone' | 'icon'> {
  if (code === 0) return { condition: 'Ясно', tone: 'clear', icon: 'sun' }
  if ([1, 2].includes(code)) return { condition: 'Переменная облачность', tone: 'cloudy', icon: 'partly' }
  if (code === 3) return { condition: 'Пасмурно', tone: 'cloudy', icon: 'cloud' }
  if ([45, 48].includes(code)) return { condition: 'Туман', tone: 'fog', icon: 'fog' }
  if ([51, 53, 55, 56, 57, 61, 63, 65, 66, 67, 80, 81, 82].includes(code)) {
    return { condition: 'Дождь', tone: 'rain', icon: 'rain' }
  }
  if ([71, 73, 75, 77, 85, 86].includes(code)) return { condition: 'Снег', tone: 'snow', icon: 'snow' }
  if ([95, 96, 99].includes(code)) return { condition: 'Гроза', tone: 'storm', icon: 'storm' }
  return { condition: 'Погода', tone: 'cloudy', icon: 'cloud' }
}
