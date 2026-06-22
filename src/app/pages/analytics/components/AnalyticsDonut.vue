<template>
  <div class="donut-layout">
    <div class="donut" :style="{ '--gradient': gradient }">
      <div><strong>{{ total }}</strong><span>{{ label }}</span></div>
    </div>
    <div class="donut-list">
      <article v-for="item in items" :key="item.label">
        <i :style="{ background: item.color }" /><span>{{ item.label }}</span><strong>{{ item.value }}</strong>
      </article>
      <p v-if="!items.length">Данных пока недостаточно</p>
    </div>
  </div>
</template>

<script setup>
import { computed } from 'vue'

const props = defineProps({
  items: { type: Array, default: () => [] },
  label: { type: String, default: 'всего' },
})
const total = computed(() => props.items.reduce((sum, item) => sum + Number(item.value || 0), 0))
const gradient = computed(() => {
  if (!total.value) return 'conic-gradient(var(--control-bg) 0 100%)'
  let offset = 0
  const stops = props.items.map((item) => {
    const start = offset
    offset += item.value / total.value * 100
    return `${item.color} ${start}% ${offset}%`
  })
  return `conic-gradient(${stops.join(',')})`
})
</script>

<style scoped>
.donut-layout{display:grid;grid-template-columns:150px minmax(0,1fr);align-items:center;gap:22px}.donut{display:grid;place-items:center;width:150px;height:150px;border-radius:50%;background:var(--gradient);animation:donutReveal .75s .15s var(--ease-out) both}.donut>div{display:grid;place-items:center;width:104px;height:104px;border-radius:50%;background:var(--card-solid)}.donut strong{font-size:27px}.donut span{color:var(--text-muted);font-size:9px}.donut-list{display:grid;gap:9px}.donut-list article{display:grid;grid-template-columns:8px minmax(0,1fr) auto;align-items:center;gap:8px}.donut-list i{width:8px;height:8px;border-radius:50%}.donut-list span{color:var(--text-secondary);font-size:10px}.donut-list p{color:var(--text-muted);font-size:10px}@keyframes donutReveal{from{opacity:0;transform:scale(.72) rotate(-35deg)}to{opacity:1;transform:none}}@media(max-width:480px){.donut-layout{grid-template-columns:1fr;justify-items:center}.donut-list{width:100%}}@media(prefers-reduced-motion:reduce){.donut{animation:none}}
</style>
