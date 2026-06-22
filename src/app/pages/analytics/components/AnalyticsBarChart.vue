<template>
  <div class="bar-chart" :class="{ compact }">
    <article v-for="(item, index) in normalizedItems" :key="`${item.label}-${index}`">
      <div class="bar-chart__value">{{ item.value }}</div>
      <div class="bar-chart__track">
        <i :style="{ height: `${item.percent}%`, '--bar-color': item.color || color, '--delay': `${index * 45}ms` }" />
      </div>
      <span>{{ item.label }}</span>
    </article>
  </div>
</template>

<script setup>
import { computed } from 'vue'

const props = defineProps({
  items: { type: Array, default: () => [] },
  color: { type: String, default: 'var(--info)' },
  compact: { type: Boolean, default: false },
})

const normalizedItems = computed(() => {
  const max = Math.max(...props.items.map((item) => Number(item.value) || 0), 1)
  return props.items.map((item) => ({ ...item, percent: (Number(item.value) || 0) / max * 100 }))
})
</script>

<style scoped>
.bar-chart{display:grid;grid-template-columns:repeat(auto-fit,minmax(34px,1fr));gap:7px;height:245px}.bar-chart article{display:grid;grid-template-rows:18px 1fr 18px;justify-items:center;min-width:0}.bar-chart__value{color:var(--text-muted);font-size:9px}.bar-chart__track{display:flex;align-items:end;justify-content:center;width:100%;border-bottom:1px solid var(--border-color);background:linear-gradient(to top,var(--border-color) 1px,transparent 1px);background-size:100% 25%}.bar-chart__track i{display:block;width:min(24px,55%);min-height:3px;border-radius:7px 7px 2px 2px;background:linear-gradient(180deg,var(--bar-color),color-mix(in srgb,var(--bar-color) 42%,transparent));transform-origin:bottom;animation:growBar .65s calc(.12s + var(--delay)) var(--ease-out) both}.bar-chart span{overflow:hidden;max-width:100%;color:var(--text-muted);font-size:8px;text-overflow:ellipsis;white-space:nowrap;text-transform:capitalize}.bar-chart.compact{height:190px}@keyframes growBar{from{transform:scaleY(0);opacity:.3}to{transform:scaleY(1);opacity:1}}@media(prefers-reduced-motion:reduce){.bar-chart__track i{animation:none}}
</style>
