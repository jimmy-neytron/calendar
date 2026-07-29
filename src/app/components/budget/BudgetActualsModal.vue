<template>
  <UiModal
    :model-value="modelValue"
    :title="`Фактические траты · ${monthLabel}`"
    eyebrow="Заполняется по желанию"
    width="660px"
    @update:model-value="$emit('update:modelValue', $event)"
  >
    <form class="actuals-form" @submit.prevent="submit">
      <div class="actuals-note">
        <UiIcon name="chart" />
        <p>Заполни нужные поля сейчас или вернись позже.</p>
      </div>

      <div class="actuals-list">
        <article v-for="item in entries" :key="item.id">
          <i :style="{ background: item.color }" />
          <div>
            <strong>{{ item.name }}</strong>
            <small>План {{ formatMoney(item.amount) }}</small>
          </div>
          <UiInput
            v-model="item.actualAmount"
            type="number"
            label="Факт, ₽"
            min="0"
            step="100"
            placeholder="Не заполнено"
          />
          <span
            v-if="item.actualAmount !== '' && item.actualAmount !== null"
            :class="{ over: toAmount(item.actualAmount) > toAmount(item.amount) }"
          >
            {{ differenceLabel(item) }}
          </span>
        </article>
      </div>

      <div class="actuals-total">
        <div><span>План</span><strong>{{ formatMoney(plannedTotal) }}</strong></div>
        <UiIcon name="right" />
        <div><span>Заполненный факт</span><strong>{{ formatMoney(actualTotal) }}</strong></div>
      </div>

      <footer>
        <UiButton variant="secondary" @click="$emit('update:modelValue', false)">Закрыть</UiButton>
        <UiButton type="submit" :loading="saving">Сохранить факт</UiButton>
      </footer>
    </form>
  </UiModal>
</template>

<script setup lang="ts">
import { computed, ref, watch } from 'vue'
import { toAmount } from '../../composables/budget/useBudgetForm'
import UiButton from '../ui/UiButton.vue'
import UiIcon from '../ui/UiIcon.vue'
import UiInput from '../ui/UiInput.vue'
import UiModal from '../ui/UiModal.vue'

interface ActualCategory {
  id: string
  name: string
  amount: number
  actualAmount: number | string | null
  color?: string
}

const props = defineProps<{
  modelValue: boolean
  monthLabel: string
  categories: ActualCategory[]
  saving?: boolean
}>()

const emit = defineEmits<{
  'update:modelValue': [value: boolean]
  save: [entries: Array<{ id: string; actualAmount: number | string | null }>]
}>()

const entries = ref<ActualCategory[]>([])
const plannedTotal = computed(() => entries.value.reduce((sum, item) => sum + toAmount(item.amount), 0))
const actualTotal = computed(() => entries.value.reduce((sum, item) => sum + (
  item.actualAmount === '' || item.actualAmount === null ? 0 : toAmount(item.actualAmount)
), 0))

watch(() => props.modelValue, (opened) => {
  if (opened) entries.value = props.categories.map((item) => ({
    ...item,
    actualAmount: item.actualAmount ?? '',
  }))
})

function submit() {
  emit('save', entries.value.map((item) => ({
    id: item.id,
    actualAmount: item.actualAmount,
  })))
}

function differenceLabel(item: ActualCategory) {
  const difference = toAmount(item.actualAmount) - toAmount(item.amount)
  if (!difference) return 'по плану'
  return difference > 0
    ? `+${formatMoney(difference)}`
    : `−${formatMoney(Math.abs(difference))}`
}

function formatMoney(value: string | number | null) {
  return new Intl.NumberFormat('ru-RU', {
    style: 'currency',
    currency: 'RUB',
    maximumFractionDigits: 0,
  }).format(toAmount(value))
}
</script>

<style scoped>
.actuals-form{display:grid;gap:14px}.actuals-note{display:grid;grid-template-columns:32px minmax(0,1fr);align-items:center;gap:9px;border:1px solid color-mix(in srgb,var(--info) 25%,var(--border-color));border-radius:12px;padding:10px;color:var(--info);background:color-mix(in srgb,var(--info) 6%,var(--control-bg))}.actuals-note svg{justify-self:center;font-size:17px}.actuals-note p{margin:0;color:var(--text-secondary);font-size:9px;line-height:1.45}.actuals-list{display:grid;gap:7px}.actuals-list article{display:grid;grid-template-columns:7px minmax(120px,1fr) 150px minmax(72px,auto);align-items:end;gap:9px;border:1px solid var(--border-color);border-radius:12px;padding:9px;background:var(--card-soft)}.actuals-list article>i{align-self:center;width:7px;height:34px;border-radius:7px}.actuals-list strong,.actuals-list small{display:block}.actuals-list small{margin-top:2px;color:var(--text-muted);font-size:9px}.actuals-list :deep(.ui-input__control){height:36px}.actuals-list article>span{align-self:center;justify-self:end;border-radius:999px;padding:4px 7px;color:var(--success);background:color-mix(in srgb,var(--success) 8%,var(--control-bg));font-size:8px;font-weight:800}.actuals-list article>span.over{color:var(--danger);background:color-mix(in srgb,var(--danger) 8%,var(--control-bg))}.actuals-total{display:grid;grid-template-columns:1fr auto 1fr;align-items:center;gap:12px;border:1px solid var(--border-color);border-radius:13px;padding:12px;background:var(--control-bg)}.actuals-total div{display:grid;gap:2px}.actuals-total div:last-child{text-align:right}.actuals-total span{color:var(--text-muted);font-size:9px}.actuals-total strong{font-size:18px}.actuals-total svg{color:var(--text-muted)}.actuals-form>footer{display:flex;justify-content:flex-end;gap:7px}@media(max-width:560px){.actuals-list article{grid-template-columns:7px 1fr auto}.actuals-list label{grid-column:2/4}.actuals-list article>span{grid-column:2/4}.actuals-form>footer{display:grid;grid-template-columns:1fr 1fr}.actuals-form>footer :deep(.ui-button){width:100%}}
</style>
