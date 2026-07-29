<template>
  <UiModal
    :model-value="modelValue"
    :title="isEditing ? 'Настройки бюджета' : 'Создание бюджета'"
    eyebrow="Глобальный шаблон"
    width="920px"
    dialog-class="budget-setup-dialog"
    :close-on-overlay="isEditing"
    :close-on-escape="isEditing"
    :hide-close="!isEditing"
    @update:model-value="$emit('update:modelValue', $event)"
  >
    <div class="setup-layout">
      <aside class="setup-sidebar">
        <div class="setup-progress">
          <span>Шаг {{ step }} из 4</span>
          <div><i :style="{ width: `${step * 25}%` }" /></div>
        </div>

        <ol class="setup-steps">
          <li
            v-for="item in steps"
            :key="item.id"
            :class="{ active: step === item.id, done: step > item.id }"
            :aria-current="step === item.id ? 'step' : undefined"
          >
            <span><UiIcon :name="step > item.id ? 'check' : item.icon" /></span>
            <div>
              <small>0{{ item.id }}</small>
              <strong>{{ item.title }}</strong>
            </div>
          </li>
        </ol>

        <div class="setup-auto">
          <UiIcon name="refresh" />
          <span>Платежи повторяются автоматически</span>
        </div>
      </aside>

      <form class="setup-form" @submit.prevent="submit">
        <section v-if="step === 1" class="setup-panel">
          <header>
            <span class="setup-panel__icon"><UiIcon name="wallet" /></span>
            <div><small>Доход</small><h3>Бюджет на обычный месяц</h3></div>
          </header>

          <div class="income-card">
            <UiInput
              v-model="form.defaultIncome"
              type="number"
              label="Ежемесячный доход"
              placeholder="75 000"
              min="0"
              step="100"
              inputmode="decimal"
              :error="step === 1 ? error : ''"
            />
            <span>₽</span>
          </div>
        </section>

        <section v-else-if="step === 2" class="setup-panel">
          <header>
            <span class="setup-panel__icon setup-panel__icon--required"><UiIcon name="calendar" /></span>
            <div><small>Автоматически</small><h3>Обязательные расходы</h3></div>
          </header>

          <div v-if="form.rules.length" class="form-list">
            <article v-for="rule in form.rules" :key="rule.key" class="form-row form-row--rule">
              <UiInput v-model="rule.title" label="Название" placeholder="Аренда" />
              <UiInput
                v-model="rule.defaultAmount"
                type="number"
                label="Сумма, ₽"
                placeholder="0"
                min="0"
                step="100"
              />
              <UiInput
                v-model="rule.dueDay"
                type="number"
                label="День"
                min="1"
                max="31"
              />
              <label class="ui-field">
                <span>Напоминание</span>
                <UiSelect v-model="rule.reminder" aria-label="Напоминание">
                  <option value="none">Нет</option>
                  <option value="1h">За час</option>
                  <option value="1d">За день</option>
                </UiSelect>
              </label>
              <UiIconButton
                icon="trash"
                label="Удалить обязательный расход"
                variant="danger"
                @click="removeRule(rule.key)"
              />
            </article>
          </div>

          <div v-else class="compact-empty">
            <UiIcon name="calendar" />
            <span>Обязательных расходов нет</span>
          </div>

          <UiButton class="add-button" type="button" variant="secondary" icon="plus" @click="addRule">
            Добавить расход
          </UiButton>
        </section>

        <section v-else-if="step === 3" class="setup-panel">
          <header>
            <span class="setup-panel__icon setup-panel__icon--flexible"><UiIcon name="chart" /></span>
            <div><small>План</small><h3>Траты под контролем</h3></div>
          </header>

          <div class="suggestion-chips">
            <UiButton
              v-for="suggestion in suggestions"
              :key="suggestion"
              type="button"
              size="sm"
              variant="secondary"
              :disabled="hasCategory(suggestion)"
              @click="addCategory(suggestion)"
            >
              + {{ suggestion }}
            </UiButton>
          </div>

          <div v-if="form.categories.length" class="form-list">
            <article v-for="category in form.categories" :key="category.key" class="form-row form-row--category">
              <i :style="{ background: category.color }" />
              <UiInput v-model="category.name" label="Категория" placeholder="Продукты" />
              <UiInput
                v-model="category.defaultAmount"
                type="number"
                label="План, ₽"
                placeholder="0"
                min="0"
                step="100"
              />
              <UiIconButton
                icon="trash"
                label="Удалить категорию"
                variant="danger"
                @click="removeCategory(category.key)"
              />
            </article>
          </div>

          <div v-else class="compact-empty">
            <UiIcon name="chart" />
            <span>Категории можно добавить позже</span>
          </div>

          <UiButton class="add-button" type="button" variant="secondary" icon="plus" @click="addCategory()">
            Своя категория
          </UiButton>
        </section>

        <section v-else class="setup-panel">
          <header>
            <span class="setup-panel__icon setup-panel__icon--review"><UiIcon name="check" /></span>
            <div><small>Готово</small><h3>Проверь план</h3></div>
          </header>

          <div class="review-balance" :class="{ negative: remaining < 0 }">
            <span>{{ remaining < 0 ? 'Не хватает' : 'Свободно' }}</span>
            <strong>{{ formatMoney(Math.abs(remaining)) }}</strong>
            <div><i :style="{ width: `${allocatedPercent}%` }" /></div>
            <small>{{ Math.round(allocatedRaw) }}% дохода распределено</small>
          </div>

          <div class="review-grid">
            <article><span>Доход</span><strong>{{ formatMoney(form.defaultIncome) }}</strong></article>
            <article><span>Обязательные</span><strong>{{ formatMoney(requiredTotal) }}</strong><small>{{ form.rules.length }} платежей</small></article>
            <article><span>Категории</span><strong>{{ formatMoney(flexibleTotal) }}</strong><small>{{ form.categories.length }} разделов</small></article>
          </div>
        </section>

        <p v-if="error && step !== 1" class="setup-error">{{ error }}</p>

        <footer class="setup-footer">
          <UiButton v-if="step > 1" variant="secondary" icon="left" @click="goBack">Назад</UiButton>
          <span />
          <UiButton v-if="step < 4" type="button" icon="right" @click="next">Далее</UiButton>
          <UiButton v-else type="submit" icon="check" :loading="saving">
            {{ isEditing ? 'Сохранить' : 'Создать бюджет' }}
          </UiButton>
        </footer>
      </form>
    </div>
  </UiModal>
</template>

<script setup lang="ts">
import { computed, ref, watch } from 'vue'
import { useBudgetForm, toAmount } from '../../composables/budget/useBudgetForm'
import UiButton from '../ui/UiButton.vue'
import UiIcon from '../ui/UiIcon.vue'
import UiIconButton from '../ui/UiIconButton.vue'
import UiInput from '../ui/UiInput.vue'
import UiModal from '../ui/UiModal.vue'
import UiSelect from '../ui/UiSelect.vue'

const props = defineProps<{
  modelValue: boolean
  settings?: Record<string, unknown> | null
  rules?: Array<Record<string, unknown>>
  categories?: Array<Record<string, unknown>>
  saving?: boolean
  isEditing?: boolean
}>()

const emit = defineEmits<{
  'update:modelValue': [value: boolean]
  save: [payload: Record<string, unknown>]
}>()

const steps = [
  { id: 1, title: 'Доход', icon: 'wallet' },
  { id: 2, title: 'Обязательные', icon: 'calendar' },
  { id: 3, title: 'Категории', icon: 'chart' },
  { id: 4, title: 'Проверка', icon: 'check' },
]
const suggestions = ['Продукты', 'Транспорт', 'Развлечения', 'Накопления']
const step = ref(1)
const error = ref('')
const {
  form,
  requiredTotal,
  flexibleTotal,
  plannedTotal,
  remaining,
  reset,
  addRule,
  addCategory,
  removeRule,
  removeCategory,
  validate,
} = useBudgetForm()

const allocatedRaw = computed(() => (
  toAmount(form.defaultIncome) ? (plannedTotal.value / toAmount(form.defaultIncome)) * 100 : 0
))
const allocatedPercent = computed(() => Math.min(100, Math.max(0, allocatedRaw.value)))

watch(() => props.modelValue, (opened) => {
  if (!opened) return
  step.value = 1
  error.value = ''
  reset({
    settings: props.settings as { defaultIncome?: number } | null,
    rules: props.rules,
    categories: props.categories,
  })
}, { immediate: true })

function next() {
  error.value = validateStep(step.value)
  if (error.value) return
  step.value = Math.min(4, step.value + 1)
}

function goBack() {
  error.value = ''
  step.value = Math.max(1, step.value - 1)
}

function validateStep(currentStep: number) {
  if (currentStep === 1 && toAmount(form.defaultIncome) <= 0) return 'Укажи доход'
  if (currentStep === 2 && form.rules.some((item) => !item.title.trim())) return 'Заполни названия обязательных расходов'
  if (currentStep === 2 && form.rules.some((item) => Number(item.dueDay) < 1 || Number(item.dueDay) > 31)) return 'День платежа должен быть от 1 до 31'
  if (currentStep === 3 && form.categories.some((item) => !item.name.trim())) return 'Заполни названия категорий'
  return ''
}

function submit() {
  error.value = validate()
  if (error.value) return
  emit('save', {
    defaultIncome: toAmount(form.defaultIncome),
    rules: form.rules.map(({ key, ...item }) => item),
    categories: form.categories.map(({ key, ...item }) => item),
  })
}

function hasCategory(name: string) {
  return form.categories.some((item) => item.name.toLowerCase() === name.toLowerCase())
}

function formatMoney(value: string | number) {
  return new Intl.NumberFormat('ru-RU', {
    style: 'currency',
    currency: 'RUB',
    maximumFractionDigits: 0,
  }).format(toAmount(value))
}
</script>

<style scoped>
:global(.budget-setup-dialog .ui-modal__body){overflow-x:hidden}
.setup-layout{display:grid;grid-template-columns:205px minmax(0,1fr);min-height:520px;margin:-16px}.setup-sidebar{display:flex;flex-direction:column;border-right:1px solid var(--border-color);padding:18px 13px;background:color-mix(in srgb,var(--control-bg) 78%,transparent)}.setup-progress{display:grid;gap:7px;padding:3px 7px 16px;color:var(--text-muted);font-size:9px;font-weight:800;text-transform:uppercase}.setup-progress>div{height:4px;border-radius:99px;background:var(--field-bg);overflow:hidden}.setup-progress i{display:block;height:100%;border-radius:inherit;background:var(--success);transition:width .24s var(--ease-out)}.setup-steps{display:grid;gap:6px;margin:0;padding:0;list-style:none}.setup-steps li{display:grid;grid-template-columns:34px minmax(0,1fr);align-items:center;gap:9px;border-radius:11px;padding:8px;color:var(--text-muted)}.setup-steps li>span{display:grid;place-items:center;width:34px;height:34px;border:1px solid var(--border-color);border-radius:10px;background:var(--field-bg);font-size:15px}.setup-steps small,.setup-steps strong{display:block}.setup-steps small{font-size:8px}.setup-steps strong{margin-top:1px;font-size:10px}.setup-steps li.active{color:var(--text-primary);background:color-mix(in srgb,var(--success) 9%,var(--control-bg))}.setup-steps li.active>span,.setup-steps li.done>span{color:var(--success);border-color:color-mix(in srgb,var(--success) 35%,var(--border-color));background:color-mix(in srgb,var(--success) 9%,var(--field-bg))}.setup-auto{display:flex;align-items:center;gap:7px;margin-top:auto;border:1px solid color-mix(in srgb,var(--success) 25%,var(--border-color));border-radius:11px;padding:9px;color:var(--success);font-size:9px;line-height:1.35;background:color-mix(in srgb,var(--success) 6%,var(--field-bg))}.setup-form{display:flex;min-width:0;flex-direction:column}.setup-panel{display:grid;align-content:start;gap:18px;min-height:450px;padding:23px 25px}.setup-panel>header{display:grid;grid-template-columns:43px minmax(0,1fr);align-items:center;gap:12px;padding-bottom:15px;border-bottom:1px solid var(--border-color)}.setup-panel__icon{display:grid;place-items:center;width:43px;height:43px;border-radius:13px;color:var(--success);background:color-mix(in srgb,var(--success) 10%,var(--control-bg));font-size:20px}.setup-panel__icon--required{color:var(--warning);background:color-mix(in srgb,var(--warning) 10%,var(--control-bg))}.setup-panel__icon--flexible{color:var(--info);background:color-mix(in srgb,var(--info) 10%,var(--control-bg))}.setup-panel__icon--review{color:#fff;background:var(--success)}.setup-panel header small{color:var(--success);font-size:8px;font-weight:850;letter-spacing:.12em;text-transform:uppercase}.setup-panel h3{margin:3px 0 0;font-size:21px}.income-card{position:relative;max-width:470px;margin-top:38px;border:1px solid color-mix(in srgb,var(--success) 32%,var(--border-color));border-radius:16px;padding:16px;background:linear-gradient(145deg,color-mix(in srgb,var(--success) 7%,var(--card-soft)),var(--card-soft));box-shadow:0 18px 50px color-mix(in srgb,var(--success) 6%,transparent)}.income-card>span{position:absolute;right:31px;bottom:27px;color:var(--text-muted);font-size:20px;font-weight:800}.income-card :deep(.ui-input__control){height:62px;padding-right:54px;border-radius:12px;font-size:27px;font-weight:850}.form-list{display:grid;gap:8px}.form-row{display:grid;align-items:end;gap:8px;border:1px solid var(--border-color);border-radius:13px;padding:10px;background:var(--card-soft)}.form-row--rule{grid-template-columns:minmax(130px,1.2fr) minmax(95px,.72fr) 78px 108px 34px}.form-row--category{grid-template-columns:7px minmax(160px,1fr) minmax(120px,.65fr) 34px}.form-row--category>i{align-self:center;width:7px;height:34px;border-radius:8px}.form-row :deep(.ui-input__control),.ui-field :deep(.ui-select__trigger){height:36px}.ui-field{display:grid;gap:5px}.ui-field>span{color:var(--text-secondary);font-size:11px;font-weight:700}.ui-field :deep(.ui-select){width:100%}.ui-field :deep(.ui-select__trigger){width:100%;border-radius:var(--radius-md)}.form-row>:deep(.ui-icon-button){align-self:end}.add-button{justify-self:start}.compact-empty{display:flex;align-items:center;gap:8px;border:1px dashed var(--border-color);border-radius:12px;padding:14px;color:var(--text-muted);background:var(--control-bg);font-size:10px}.compact-empty svg{font-size:17px}.suggestion-chips{display:flex;flex-wrap:wrap;gap:6px}.review-balance{display:grid;gap:5px;border:1px solid color-mix(in srgb,var(--success) 30%,var(--border-color));border-radius:16px;padding:16px;background:linear-gradient(135deg,color-mix(in srgb,var(--success) 9%,var(--control-bg)),var(--control-bg))}.review-balance>span{color:var(--text-secondary);font-size:9px}.review-balance>strong{color:var(--success);font-size:28px}.review-balance>div{height:6px;margin-top:5px;border-radius:99px;background:var(--field-bg);overflow:hidden}.review-balance>div i{display:block;height:100%;border-radius:inherit;background:var(--success)}.review-balance>small{color:var(--text-muted)}.review-balance.negative{border-color:color-mix(in srgb,var(--danger) 30%,var(--border-color));background:color-mix(in srgb,var(--danger) 7%,var(--control-bg))}.review-balance.negative>strong{color:var(--danger)}.review-grid{display:grid;grid-template-columns:repeat(3,1fr);gap:8px}.review-grid article{display:grid;gap:3px;border:1px solid var(--border-color);border-radius:12px;padding:12px;background:var(--card-soft)}.review-grid span,.review-grid small{color:var(--text-muted);font-size:9px}.review-grid strong{font-size:16px}.setup-error{margin:auto 25px 10px;border-radius:10px;padding:8px 10px;color:var(--danger);background:color-mix(in srgb,var(--danger) 8%,var(--control-bg));font-size:10px}.setup-footer{display:grid;grid-template-columns:auto 1fr auto;gap:8px;border-top:1px solid var(--border-color);padding:12px 16px;background:color-mix(in srgb,var(--control-bg) 72%,transparent)}
@media(max-width:760px){.setup-layout{grid-template-columns:1fr;margin:-16px}.setup-sidebar{border-right:0;border-bottom:1px solid var(--border-color);padding:9px}.setup-progress,.setup-auto{display:none}.setup-steps{grid-template-columns:repeat(4,1fr)}.setup-steps li{grid-template-columns:1fr;justify-items:center;padding:5px}.setup-steps li div{display:none}.setup-panel{min-height:0;padding:17px 13px}.form-row--rule,.form-row--category{grid-template-columns:1fr 1fr}.form-row--rule>:deep(.ui-icon-button),.form-row--category>:deep(.ui-icon-button){grid-column:-2/-1;justify-self:end}.form-row--category>i{display:none}.review-grid{grid-template-columns:1fr}.income-card{margin-top:10px}}@media(max-width:480px){.form-row--rule,.form-row--category{grid-template-columns:1fr}.form-row--rule>:deep(.ui-icon-button),.form-row--category>:deep(.ui-icon-button){grid-column:auto}.setup-panel>header{grid-template-columns:38px 1fr}.setup-panel__icon{width:38px;height:38px}.setup-footer{grid-template-columns:auto 1fr auto}}
</style>
