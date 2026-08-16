<template>
  <UiModal
    :model-value="modelValue"
    :title="`Обязательные расходы · ${monthLabel}`"
    eyebrow="Автоматически в календаре"
    width="720px"
    @update:model-value="$emit('update:modelValue', $event)"
  >
    <div class="required-modal">
      <div class="required-modal__summary">
        <span><UiIcon name="calendar" /></span>
        <div><small>Всего на месяц</small><strong>{{ formatMoney(total) }}</strong></div>
        <b>{{ payments.length }} {{ paymentWord }}</b>
      </div>

      <div v-if="payments.length" class="required-modal__list">
        <article v-for="payment in payments" :key="payment.id" :class="{ paid: payment.paid }">
          <div class="required-modal__date">
            <strong>{{ formatDay(payment.date) }}</strong>
            <small>{{ formatMonth(payment.date) }}</small>
          </div>
          <div class="required-modal__copy">
            <strong>{{ payment.title }}</strong>
            <small>
              <span><UiIcon name="calendar" /> {{ payment.calendarEventId ? 'В календаре' : 'Без события' }}</span>
              <span><UiIcon name="clock" /> {{ reminderLabel(payment.reminder) }}</span>
            </small>
          </div>
          <strong class="required-modal__amount">{{ formatMoney(payment.amount) }}</strong>
          <UiButton
            size="sm"
            :variant="payment.paid ? 'secondary' : 'primary'"
            :icon="payment.paid ? 'check' : 'clock'"
            @click="$emit('toggle', payment)"
          >
            {{ payment.paid ? 'Оплачено' : 'Отметить' }}
          </UiButton>
        </article>
      </div>

      <div v-else class="required-modal__empty">
        <UiIcon name="calendar" />
        <span>Обязательных расходов нет</span>
      </div>

      <footer>
        <UiButton variant="secondary" @click="$emit('edit-template')">Изменить шаблон</UiButton>
        <UiButton @click="$emit('update:modelValue', false)">Готово</UiButton>
      </footer>
    </div>
  </UiModal>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import { formatRubles as formatMoney } from '../../utils/formatters/currencyFormatter.js'
import { pluralizeRu as pluralize } from '../../utils/formatters/pluralizeRu.js'
import UiButton from '../ui/UiButton.vue'
import UiIcon from '../ui/UiIcon.vue'
import UiModal from '../ui/UiModal.vue'

interface RequiredPayment {
  id: string
  title: string
  date: string
  amount: number
  paid: boolean
  reminder?: string
  calendarEventId?: string | null
}

const props = defineProps<{
  modelValue: boolean
  monthLabel: string
  payments: RequiredPayment[]
  total: number
}>()

defineEmits<{
  'update:modelValue': [value: boolean]
  toggle: [payment: RequiredPayment]
  'edit-template': []
}>()

const paymentWord = computed(() => pluralize(props.payments.length, ['платёж', 'платежа', 'платежей']))

function parseDate(value: string) {
  const match = String(value || '').match(/^(\d{4})-(\d{2})-(\d{2})/)
  if (!match) return null
  const date = new Date(Number(match[1]), Number(match[2]) - 1, Number(match[3]))
  return Number.isNaN(date.getTime()) ? null : date
}

function formatDay(value: string) {
  const date = parseDate(value)
  return date ? new Intl.DateTimeFormat('ru-RU', { day: '2-digit' }).format(date) : '—'
}

function formatMonth(value: string) {
  const date = parseDate(value)
  return date ? new Intl.DateTimeFormat('ru-RU', { month: 'short' }).format(date) : 'дата'
}

function reminderLabel(value?: string) {
  if (value === '1h') return 'За час'
  if (value === '1d') return 'За день'
  return 'Без напоминания'
}

</script>

<style scoped>
.required-modal{display:grid;gap:13px}.required-modal__summary{display:grid;grid-template-columns:44px minmax(0,1fr) auto;align-items:center;gap:11px;border:1px solid color-mix(in srgb,var(--warning) 26%,var(--border-color));border-radius:14px;padding:12px;background:color-mix(in srgb,var(--warning) 7%,var(--control-bg))}.required-modal__summary>span{display:grid;place-items:center;width:44px;height:44px;border-radius:13px;color:var(--warning);background:color-mix(in srgb,var(--warning) 11%,var(--field-bg));font-size:20px}.required-modal__summary small,.required-modal__summary strong{display:block}.required-modal__summary small{color:var(--text-muted);font-size:9px}.required-modal__summary strong{margin-top:2px;font-size:21px}.required-modal__summary>b{border-radius:999px;padding:5px 8px;color:var(--text-muted);background:var(--field-bg);font-size:9px}.required-modal__list{display:grid;gap:7px}.required-modal__list article{display:grid;grid-template-columns:46px minmax(150px,1fr) auto 90px;align-items:center;gap:10px;border:1px solid var(--border-color);border-radius:13px;padding:9px;background:var(--card-soft)}.required-modal__list article.paid{opacity:.62}.required-modal__date{display:grid;place-items:center;width:46px;height:44px;border-radius:11px;color:var(--warning);background:color-mix(in srgb,var(--warning) 9%,var(--control-bg))}.required-modal__date strong{font-size:16px;line-height:1}.required-modal__date small{font-size:8px;text-transform:uppercase}.required-modal__copy{min-width:0}.required-modal__copy>strong{display:block;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}.required-modal__copy>small{display:flex;flex-wrap:wrap;gap:8px;margin-top:4px;color:var(--text-muted);font-size:8px}.required-modal__copy small span{display:flex;align-items:center;gap:3px}.required-modal__amount{font-size:14px}.required-modal__empty{display:grid;place-items:center;gap:7px;min-height:150px;border:1px dashed var(--border-color);border-radius:13px;color:var(--text-muted)}.required-modal__empty svg{font-size:24px}.required-modal>footer{display:flex;justify-content:space-between;gap:8px;padding-top:3px}@media(max-width:600px){.required-modal__list article{grid-template-columns:42px 1fr auto}.required-modal__list :deep(.ui-button){grid-column:2/4;justify-self:start}.required-modal__amount{justify-self:end}.required-modal>footer{display:grid;grid-template-columns:1fr 1fr}.required-modal>footer :deep(.ui-button){width:100%}}
</style>
