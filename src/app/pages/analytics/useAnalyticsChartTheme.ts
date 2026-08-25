import { onBeforeUnmount, onMounted, ref } from 'vue'

export function useAnalyticsChartTheme() {
  const version = ref(0)
  let observer: MutationObserver | null = null

  function resolveColor(value: string | undefined, fallback: string) {
    version.value
    if (!value || typeof document === 'undefined') return fallback
    const match = value.match(/^var\((--[^,)]+)/)
    if (!match) return value
    return getComputedStyle(document.documentElement).getPropertyValue(match[1]).trim() || fallback
  }

  function palette() {
    return {
      text: resolveColor('var(--text-muted)', '#94a3b8'),
      foreground: resolveColor('var(--text-primary)', '#f8fafc'),
      grid: resolveColor('var(--border-color)', 'rgba(148,163,184,.14)'),
      surface: resolveColor('var(--panel-bg)', '#0f172a'),
      accent: resolveColor('var(--info)', '#60a5fa'),
    }
  }

  onMounted(() => {
    version.value += 1
    observer = new MutationObserver(() => { version.value += 1 })
    observer.observe(document.documentElement, { attributes: true, attributeFilter: ['class', 'style', 'data-theme'] })
  })
  onBeforeUnmount(() => observer?.disconnect())

  return { palette, resolveColor }
}
