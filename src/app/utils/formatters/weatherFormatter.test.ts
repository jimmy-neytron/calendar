import { describe, expect, it } from 'vitest'
import type { WeatherPoint } from '../../services/weatherService'
import { formatWeatherTooltip } from './weatherFormatter'

const weatherPoint: WeatherPoint = {
  time: '2026-08-04T12:00',
  temperature: 18,
  apparentTemperature: 17,
  precipitationProbability: 65,
  weatherCode: 61,
  windSpeed: 12,
  humidity: 72,
  condition: 'Дождь',
  tone: 'rain',
  icon: 'rain',
}

describe('formatWeatherTooltip', () => {
  it('formats the full hourly forecast', () => {
    expect(formatWeatherTooltip(weatherPoint)).toBe(
      '12:00 · Дождь · 18° · ощущается как 17° · осадки 65% · ветер 12 км/ч'
    )
  })

  it('supports a custom time label and omits zero-value details', () => {
    expect(formatWeatherTooltip({ ...weatherPoint, precipitationProbability: 0, windSpeed: 0 }, 'Сейчас')).toBe(
      'Сейчас · Дождь · 18° · ощущается как 17°'
    )
  })
})
