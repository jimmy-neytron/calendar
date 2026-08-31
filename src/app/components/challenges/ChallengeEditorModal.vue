<template>
  <UiModal :model-value="modelValue" :title="challenge ? 'Настроить цель' : 'Новая цель'" width="680px" @update:model-value="$emit('update:modelValue', $event)">
    <form class="quick-goal" @submit.prevent="submit">
      <template v-if="step === 1">
        <div class="quick-goal__intro"><strong>Что хочешь отслеживать?</strong><span>Выбери подходящий вариант — значения можно поменять на следующем шаге.</span></div>
        <div class="quick-goal__templates">
          <button v-for="item in templates" :key="item.id" type="button" @click="chooseTemplate(item)">
            <span><UiIcon :name="item.icon" /></span><div><strong>{{ item.title }}</strong><small>{{ item.description }}</small></div><UiIcon name="right" />
          </button>
        </div>
      </template>

      <template v-else>
        <button v-if="!challenge" class="quick-goal__back" type="button" @click="step = 1">← Выбрать другой тип</button>
        <div class="quick-goal__intro"><strong>{{ selectedTemplate.title }}</strong><span>{{ selectedTemplate.description }}</span></div>
        <UiInput v-model="form.title" label="Название цели" placeholder="Например: Отжимания" required />

        <div class="quick-goal__field">
          <span>Срок</span>
          <div class="quick-goal__choices">
            <button v-for="days in durationOptions" :key="days" type="button" :class="{ active: form.targetDays === days }" @click="form.targetDays = days; syncConsistencyTarget()">{{ durationLabel(days) }}</button>
          </div>
        </div>

        <div v-if="form.goalType === 'best'" class="quick-goal__field">
          <span>Что считается прогрессом?</span>
          <div class="quick-goal__choices">
            <button type="button" :class="{ active: form.progressDirection === 'increase' }" @click="setDirection('increase')">Больше — лучше</button>
            <button type="button" :class="{ active: form.progressDirection === 'decrease' }" @click="setDirection('decrease')">Меньше — лучше</button>
          </div>
        </div>

        <div class="quick-goal__target">
          <UiInput v-if="form.progressDirection === 'decrease'" v-model="form.startValue" type="number" min="1" step="any" label="Сейчас" />
          <UiInput v-model="form.targetValue" type="number" min="1" step="any" :label="targetLabel" />
          <div v-if="form.goalType !== 'consistency'" class="quick-goal__field">
            <span>Единица</span>
            <div class="quick-goal__choices">
              <button v-for="unit in unitOptions" :key="unit" type="button" :class="{ active: form.unit === unit }" @click="form.unit = unit">{{ unit }}</button>
            </div>
          </div>
        </div>

        <details class="quick-goal__details">
          <summary>Дополнительные настройки</summary>
          <UiInput v-model="form.startDate" type="date" label="Дата начала" required />
          <UiInput v-model="form.description" type="textarea" label="Описание или правило" placeholder="Необязательно" />
        </details>
      </template>

      <p v-if="error" class="quick-goal__error">{{ error }}</p>
      <footer>
        <UiButton variant="secondary" @click="$emit('update:modelValue', false)">Отмена</UiButton>
        <UiButton v-if="step === 2" type="submit" icon="check">{{ challenge ? 'Сохранить' : 'Начать' }}</UiButton>
      </footer>
    </form>
  </UiModal>
</template>

<script setup lang="ts">
import { computed, reactive, ref, watch } from 'vue'
import UiButton from '../ui/UiButton.vue'
import UiIcon from '../ui/UiIcon.vue'
import UiInput from '../ui/UiInput.vue'
import UiModal from '../ui/UiModal.vue'
import { DateHelper } from '../../utils/date/dateHelper.js'

interface Template { id: string; title: string; description: string; icon: string; goalType: 'consistency' | 'total' | 'best'; progressDirection: 'increase' | 'decrease'; targetDays: number; targetValue: number; startValue: number; unit: string; color: string }
const templates: Template[] = [
  { id: 'daily', title: 'Каждый день', description: 'Отмечать выполнение в сетке дней', icon: 'check', goalType: 'consistency', progressDirection: 'increase', targetDays: 30, targetValue: 30, startValue: 0, unit: 'дней', color: '#a78bfa' },
  { id: 'regular', title: 'Несколько раз в неделю', description: 'Например, 12 тренировок за четыре недели', icon: 'calendar', goalType: 'consistency', progressDirection: 'increase', targetDays: 28, targetValue: 12, startValue: 0, unit: 'дней', color: '#38bdf8' },
  { id: 'total', title: 'Набрать количество', description: 'Суммировать повторения, километры или минуты', icon: 'plus', goalType: 'total', progressDirection: 'increase', targetDays: 30, targetValue: 300, startValue: 0, unit: 'повторений', color: '#34d399' },
  { id: 'best', title: 'Повысить результат', description: 'Вес на штанге, повторения или дистанция', icon: 'trophy', goalType: 'best', progressDirection: 'increase', targetDays: 30, targetValue: 60, startValue: 0, unit: 'кг', color: '#f59e0b' },
  { id: 'reduce', title: 'Снизить показатель', description: 'Вес тела, время или другой показатель с регулярными измерениями', icon: 'target', goalType: 'best', progressDirection: 'decrease', targetDays: 60, targetValue: 75, startValue: 85, unit: 'кг', color: '#60a5fa' },
]
const props = defineProps<{ modelValue: boolean; challenge?: Record<string, unknown> | null }>()
const emit = defineEmits<{ 'update:modelValue': [value: boolean]; save: [value: Record<string, unknown>] }>()
const step = ref(1)
const selectedTemplate = ref<Template>(templates[0])
const error = ref('')
const durationOptions = [7, 14, 21, 30, 60, 90]
const unitOptions = ['раз', 'повторений', 'мин', 'сек', 'км', 'кг', 'страниц']
const form = reactive({ title: '', goalType: 'consistency', progressDirection: 'increase', targetDays: 30, targetValue: 30, startValue: 0, unit: 'дней', startDate: '', description: '', color: '#a78bfa', activity: '' })
const targetLabel = computed(() => form.goalType === 'consistency' ? 'Сколько выполнений нужно' : form.goalType === 'total' ? 'Сколько набрать всего' : form.progressDirection === 'decrease' ? 'Хочу снизить до' : 'Хочу повысить до')

watch(() => props.modelValue, (open) => {
  if (!open) return
  error.value = ''
  if (props.challenge) {
    const type = String(props.challenge.goalType || 'consistency')
    const direction = props.challenge.progressDirection === 'decrease' ? 'decrease' : 'increase'
    selectedTemplate.value = templates.find((item) => item.goalType === type && item.progressDirection === direction) || templates[0]
    Object.assign(form, {
      title: props.challenge.title || '', goalType: type, targetDays: Number(props.challenge.targetDays) || 30,
      targetValue: Number(props.challenge.targetValue) || Number(props.challenge.targetDays) || 30,
      startValue: Number(props.challenge.startValue) || 0, progressDirection: direction,
      unit: props.challenge.unit || (type === 'consistency' ? 'дней' : 'раз'), startDate: props.challenge.startDate || DateHelper.toKey(new Date()),
      description: props.challenge.description || '', color: props.challenge.color || selectedTemplate.value.color,
      activity: props.challenge.activity || props.challenge.title || '',
    })
    step.value = 2
  } else {
    step.value = 1
  }
})

function chooseTemplate(template: Template) {
  selectedTemplate.value = template
  Object.assign(form, { title: '', goalType: template.goalType, progressDirection: template.progressDirection, targetDays: template.targetDays, targetValue: template.targetValue, startValue: template.startValue, unit: template.unit, startDate: DateHelper.toKey(new Date()), description: '', color: template.color, activity: '' })
  step.value = 2
}
function syncConsistencyTarget() {
  if (selectedTemplate.value.id === 'daily') form.targetValue = form.targetDays
}
function setDirection(direction: 'increase' | 'decrease') {
  form.progressDirection = direction
  if (direction !== 'decrease' || Number(form.startValue) > Number(form.targetValue)) return
  const values = Object.values((props.challenge?.dailyValues || {}) as Record<string, number>).map(Number).filter(Number.isFinite)
  form.startValue = values.length ? Math.max(...values) : Math.round(Number(form.targetValue) * 1.1 * 10) / 10
}
function durationLabel(days: number) { return days < 30 ? `${days} дн.` : days === 30 ? 'Месяц' : days === 60 ? '2 месяца' : '3 месяца' }
function submit() {
  if (!form.title.trim()) { error.value = 'Укажи короткое название цели'; return }
  if (!form.startDate) { error.value = 'Укажи дату начала'; return }
  if (Number(form.targetValue) <= 0) { error.value = 'Целевое значение должно быть больше нуля'; return }
  if (form.progressDirection === 'decrease' && Number(form.startValue) <= Number(form.targetValue)) { error.value = 'Текущее значение должно быть больше цели'; return }
  emit('save', { id: props.challenge?.id || '', ...form, activity: form.activity || form.title })
}
</script>

<style scoped>
.quick-goal { display: grid; gap: 14px; }.quick-goal__intro { display: grid; gap: 4px; }.quick-goal__intro strong { font-size: 15px; }.quick-goal__intro span { color: var(--text-muted); font-size: 10px; }
.quick-goal__templates { display: grid; grid-template-columns: 1fr 1fr; gap: 8px; }.quick-goal__templates button { display: grid; grid-template-columns: 38px 1fr 16px; align-items: center; gap: 10px; border: 1px solid var(--border-color); border-radius: 10px; padding: 12px; color: var(--text-primary); background: var(--card-soft); text-align: left; }
.quick-goal__templates button:hover { border-color: var(--accent-border); background: var(--control-bg); }.quick-goal__templates button > span { width: 36px; height: 36px; display: grid; place-items: center; border-radius: 8px; color: var(--accent); background: var(--accent-soft); }.quick-goal__templates button div { display: grid; gap: 3px; }.quick-goal__templates small { color: var(--text-muted); font-size: 9px; line-height: 1.35; }.quick-goal__templates button > svg { color: var(--text-muted); }
.quick-goal__back { width: max-content; border: 0; padding: 0; color: var(--text-muted); background: transparent; font-size: 10px; }.quick-goal__field { display: grid; gap: 6px; }.quick-goal__field > span { color: var(--text-secondary); font-size: 10px; font-weight: 700; }.quick-goal__choices { display: flex; flex-wrap: wrap; gap: 6px; }.quick-goal__choices button { border: 1px solid var(--border-color); border-radius: 8px; padding: 7px 10px; color: var(--text-secondary); background: var(--control-bg); font-size: 10px; }.quick-goal__choices button.active { border-color: var(--accent); color: var(--text-primary); background: var(--accent-soft); }
.quick-goal__target { display: grid; grid-template-columns: minmax(180px, .7fr) 1fr; align-items: end; gap: 12px; }.quick-goal__details { border-top: 1px solid var(--border-color); padding-top: 11px; }.quick-goal__details summary { color: var(--text-secondary); font-size: 10px; cursor: pointer; }.quick-goal__details[open] { display: grid; gap: 10px; }.quick-goal__error { margin: 0; color: var(--danger); font-size: 10px; }.quick-goal footer { display: flex; justify-content: flex-end; gap: 8px; border-top: 1px solid var(--border-color); padding-top: 12px; }
@media (max-width: 600px) { .quick-goal__templates, .quick-goal__target { grid-template-columns: 1fr; } }
</style>
