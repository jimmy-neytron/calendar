<template>
  <section class="muscle-history">
    <header><div><h3>Нагрузка по группам мышц</h3><p>Сколько выполненных упражнений затрагивало каждую группу</p></div><span>За всё время</span></header>
    <div v-if="hasData" class="muscle-history__canvas"><Bar :data="chartData" :options="chartOptions" aria-label="Нагрузка по группам мышц за всё время" /></div>
    <p v-else class="muscle-history__empty">Группы мышц появятся после выполнения упражнений с заполненными данными.</p>
  </section>
</template>

<script setup lang="ts">
import { computed, onBeforeUnmount, onMounted, ref } from 'vue'
import { BarElement, CategoryScale, Chart as ChartJS, Legend, LinearScale, Tooltip, type ChartOptions } from 'chart.js'
import { Bar } from 'vue-chartjs'
import type { SportHistoryPoint } from '../utils/sportHistoryStats'

ChartJS.register(BarElement, CategoryScale, Legend, LinearScale, Tooltip)
const props = defineProps<{ items: SportHistoryPoint[] }>()
const colors = ref({ accent: '#34d399', text: '#94a3b8', grid: 'rgba(148,163,184,.14)', surface: '#0f172a', foreground: '#f8fafc' })
let themeObserver: MutationObserver | null = null
const hasData = computed(() => props.items.some((item) => item.value > 0))
const chartData = computed(() => ({ labels: props.items.map((item) => item.label), datasets: [{ label: 'Выполнено', data: props.items.map((item) => item.value), backgroundColor: colors.value.accent, borderRadius: 4, borderSkipped: false, barThickness: 14 }] }))
const chartOptions = computed<ChartOptions<'bar'>>(() => ({
  indexAxis: 'y', responsive: true, maintainAspectRatio: false,
  plugins: { legend: { display: false }, tooltip: { displayColors: false, backgroundColor: colors.value.surface, titleColor: colors.value.foreground, bodyColor: colors.value.foreground, padding: 9, cornerRadius: 6, callbacks: { label: (context) => `Выполнено: ${context.formattedValue}` } } },
  scales: { x: { beginAtZero: true, ticks: { color: colors.value.text, precision: 0 }, grid: { color: colors.value.grid }, border: { display: false }, title: { display: true, text: 'Выполненные упражнения', color: colors.value.text } }, y: { ticks: { color: colors.value.text }, grid: { display: false }, border: { display: false } } },
}))
function refreshColors() {
  const style = getComputedStyle(document.documentElement)
  const read = (name: string, fallback: string) => style.getPropertyValue(name).trim() || fallback
  colors.value = { accent: read('--accent', '#34d399'), text: read('--text-muted', '#94a3b8'), grid: read('--border-color', 'rgba(148,163,184,.14)'), surface: read('--panel-bg', '#0f172a'), foreground: read('--text-primary', '#f8fafc') }
}
onMounted(() => { refreshColors(); themeObserver = new MutationObserver(refreshColors); themeObserver.observe(document.documentElement, { attributes: true, attributeFilter: ['class', 'style', 'data-theme'] }) })
onBeforeUnmount(() => themeObserver?.disconnect())
</script>

<style scoped>
.muscle-history { min-width: 0; display: grid; gap: 16px; border: 1px solid var(--border-color); border-radius: 10px; padding: 16px; background: var(--card-solid); }
.muscle-history header { display: flex; align-items: flex-start; justify-content: space-between; gap: 16px; }
.muscle-history h3, .muscle-history p { margin: 0; }.muscle-history h3 { font-size: 14px; }
.muscle-history header p, .muscle-history header > span { margin-top: 3px; color: var(--text-muted); font-size: 10px; }.muscle-history header > span { white-space: nowrap; }
.muscle-history__canvas { height: 280px; }
.muscle-history__empty { min-height: 250px; display: grid; place-items: center; color: var(--text-muted); font-size: 11px; text-align: center; }
</style>
