<template>
  <section class="records-panel panel">
    <header><h3>Рекорды</h3><span>{{ records.length }}</span></header>
    <div v-if="records.length">
      <article v-for="record in records" :key="record.id">
        <span><UiIcon name="trophy" /></span>
        <div><strong>{{ record.title }}</strong><small>{{ record.label }}</small></div>
        <b>{{ record.value }}</b>
      </article>
    </div>
    <p v-else>Рекорды появятся у целей с числовым результатом.</p>
  </section>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import UiIcon from '../ui/UiIcon.vue'
import { getChallengeProgress, type ProgressChallenge } from '../../utils/challenges/challengeProgress'

interface RecordChallenge extends ProgressChallenge { id: string; title: string; unit?: string }
const props = defineProps<{ challenges: RecordChallenge[] }>()
const records = computed(() => props.challenges
  .filter((challenge) => challenge.goalType === 'best' || challenge.goalType === 'total')
  .map((challenge) => ({ challenge, progress: getChallengeProgress(challenge) }))
  .filter(({ progress }) => progress.record > 0)
  .sort((left, right) => right.progress.record - left.progress.record)
  .map(({ challenge, progress }) => ({ id: challenge.id, title: challenge.title, value: `${progress.record} ${challenge.unit || ''}`.trim(), label: progress.recordDate ? `${challenge.progressDirection === 'decrease' ? 'Минимум' : 'Рекорд'} · ${formatDate(progress.recordDate)}` : 'Лучший результат' })))
function formatDate(value: string) { const [year, month, day] = value.split('-').map(Number); return new Intl.DateTimeFormat('ru-RU', { day: 'numeric', month: 'short', year: 'numeric' }).format(new Date(year, month - 1, day)) }
</script>

<style scoped>
.records-panel { display: grid; gap: 10px; padding: 16px; }.records-panel > header { display: flex; justify-content: space-between; }.records-panel h3 { margin: 0; font-size: 14px; }.records-panel header span, .records-panel > p { color: var(--text-muted); font-size: 10px; }.records-panel > div { display: grid; }.records-panel article { display: grid; grid-template-columns: 32px 1fr auto; align-items: center; gap: 9px; border-top: 1px solid var(--border-color); padding: 10px 0; }.records-panel article > span { width: 30px; height: 30px; display: grid; place-items: center; border-radius: 8px; color: var(--warning); background: color-mix(in srgb, var(--warning) 10%, var(--control-bg)); }.records-panel article div { display: grid; gap: 2px; }.records-panel article small { color: var(--text-muted); font-size: 8px; }.records-panel article b { font-size: 11px; }.records-panel > p { min-height: 110px; display: grid; place-items: center; margin: 0; text-align: center; }
</style>
