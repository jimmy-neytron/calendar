import {
  Cloud,
  CloudFog,
  CloudLightning,
  CloudRain,
  CloudSnow,
  CloudSun,
  Sun,
  TriangleAlert,
} from '@lucide/vue'
import type { Component } from 'vue'
import type { WeatherIconName } from '../../services/weatherService'

export const weatherIconMap: Record<WeatherIconName, Component> = {
  sun: Sun,
  partly: CloudSun,
  cloud: Cloud,
  fog: CloudFog,
  rain: CloudRain,
  snow: CloudSnow,
  storm: CloudLightning,
}

export const weatherFallbackIcon = TriangleAlert
