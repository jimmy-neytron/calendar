<template>
  <div class="ui-color-picker">
    <button
      class="ui-color-picker__trigger"
      type="button"
      :style="{ '--selected-color': modelValue }"
      :aria-expanded="open"
      @click="open = !open"
    >
      <span />
      <b>{{ label }}</b>
      <small>{{ modelValue.toUpperCase() }}</small>
      <UiIcon name="down" />
    </button>
    <div v-if="open" class="ui-color-picker__popover">
      <button
        v-for="color in colors"
        :key="color"
        type="button"
        :class="{ active: color.toLowerCase() === modelValue.toLowerCase() }"
        :style="{ '--swatch': color }"
        :aria-label="color"
        @click="select(color)"
      >
        <span />
        <UiIcon v-if="color.toLowerCase() === modelValue.toLowerCase()" name="check" />
      </button>
      <label>
        <span>Свой цвет</span>
        <input :value="modelValue" type="color" @change="select($event.target.value)" />
      </label>
    </div>
  </div>
</template>

<script setup>
import { ref } from 'vue'
import UiIcon from './UiIcon.vue'

const props = defineProps({
  modelValue: { type: String, default: '#60a5fa' },
  label: { type: String, default: 'Цвет' },
  colors: {
    type: Array,
    default: () => ['#60a5fa', '#22d3ee', '#10b981', '#22c55e', '#eab308', '#fb923c', '#ef4444', '#f472b6', '#a78bfa', '#f5f5f5'],
  },
})
const emit = defineEmits(['update:modelValue', 'change'])
const open = ref(false)
function select(color, close = true) {
  emit('update:modelValue', color)
  emit('change', color)
  if (close) open.value = false
}
</script>

<style scoped>
.ui-color-picker{position:relative;min-width:0}.ui-color-picker__trigger{display:grid;grid-template-columns:28px minmax(0,1fr) auto 14px;align-items:center;gap:8px;width:100%;min-height:38px;border:1px solid var(--border-color);border-radius:11px;padding:4px 9px;color:var(--text-primary);background:var(--field-bg);text-align:left}.ui-color-picker__trigger>span{width:26px;height:26px;border:5px solid color-mix(in srgb,var(--selected-color) 18%,transparent);border-radius:9px;background:var(--selected-color);box-shadow:inset 0 0 0 1px color-mix(in srgb,#fff 20%,transparent)}.ui-color-picker__trigger b{font-size:11px}.ui-color-picker__trigger small{color:var(--text-muted);font-size:9px}.ui-color-picker__popover{position:absolute;z-index:60;top:calc(100% + 6px);left:0;display:grid;grid-template-columns:repeat(5,32px);gap:7px;border:1px solid var(--border-strong);border-radius:14px;padding:10px;background:var(--toast-bg);box-shadow:var(--shadow-lg)}.ui-color-picker__popover>button{position:relative;display:grid;place-items:center;width:32px;height:32px;border:1px solid transparent;border-radius:10px;padding:0;background:transparent}.ui-color-picker__popover>button>span{width:25px;height:25px;border-radius:8px;background:var(--swatch)}.ui-color-picker__popover>button.active{border-color:var(--accent-border)}.ui-color-picker__popover>button :deep(svg){position:absolute;color:#fff;filter:drop-shadow(0 1px 2px #000);font-size:15px}.ui-color-picker__popover label{grid-column:1/-1;display:flex;align-items:center;justify-content:space-between;border-top:1px solid var(--border-color);padding-top:8px;color:var(--text-muted);font-size:10px}.ui-color-picker__popover input{width:30px;height:26px;border:0;padding:0;background:transparent}
</style>
