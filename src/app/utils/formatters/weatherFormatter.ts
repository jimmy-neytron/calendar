import type { WeatherPoint } from '../../services/weatherService'

export function formatWeatherTooltip(point: WeatherPoint, timeLabel?: string): string {
  const parts = [
    timeLabel || point.time.slice(11, 16),
    point.condition,
    `${point.temperature}°`,
    `ощущается как ${point.apparentTemperature}°`,
  ]

  if (point.precipitationProbability > 0) parts.push(`осадки ${point.precipitationProbability}%`)
  if (point.windSpeed > 0) parts.push(`ветер ${point.windSpeed} км/ч`)

  return parts.join(' · ')
}
