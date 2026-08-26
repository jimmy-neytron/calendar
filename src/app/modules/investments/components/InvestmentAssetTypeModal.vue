<template>
  <UiModal :model-value="modelValue" title="Что добавить?" width="520px" @update:model-value="emit('update:modelValue', $event)">
    <p class="asset-type__intro">Выбери тип актива — дальше откроется короткая подходящая форма.</p>
    <div class="asset-type__options">
      <button type="button" @click="select('crypto')">
        <span><UiIcon name="chart" /></span>
        <div><strong>Криптовалюта</strong><small>BTC, USDT, TRX, XLM и другие токены</small></div>
        <b>→</b>
      </button>
      <button type="button" @click="select('fiat')">
        <span><UiIcon name="wallet" /></span>
        <div><strong>Обычная валюта</strong><small>Рубли, доллары, евро и наличные</small></div>
        <b>→</b>
      </button>
    </div>
  </UiModal>
</template>

<script setup lang="ts">
import UiIcon from '../../../components/ui/UiIcon.vue'
import UiModal from '../../../components/ui/UiModal.vue'
import type { InvestmentAssetType } from '../../../types/investment'

defineProps<{ modelValue: boolean }>()
const emit = defineEmits<{ 'update:modelValue': [value: boolean]; select: [type: InvestmentAssetType] }>()

function select(type: InvestmentAssetType) {
  emit('update:modelValue', false)
  emit('select', type)
}
</script>

<style scoped>
.asset-type__intro { margin: 0 0 13px; color: var(--text-muted); font-size: 10px; }
.asset-type__options { display: grid; gap: 8px; }
.asset-type__options button { display: grid; grid-template-columns: 42px 1fr auto; align-items: center; gap: 11px; border: 1px solid var(--border-color); border-radius: 12px; padding: 12px; color: inherit; background: var(--control-bg); text-align: left; transition: border-color .2s, background .2s, transform .2s; }
.asset-type__options button:hover { border-color: var(--accent-border); background: var(--accent-soft); transform: translateY(-1px); }
.asset-type__options button > span { width: 40px; height: 40px; display: grid; place-items: center; border-radius: 11px; color: var(--accent); background: var(--accent-soft); font-size: 18px; }
.asset-type__options button > div { display: grid; gap: 4px; }
.asset-type__options strong { font-size: 12px; }
.asset-type__options small { color: var(--text-muted); font-size: 9px; }
.asset-type__options b { color: var(--text-muted); font-size: 15px; }
</style>
