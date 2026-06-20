<template>
  <UiModal
    :model-value="modelValue"
    :title="editingEvent ? 'Редактировать событие' : 'Новое событие'"
    eyebrow="Семейный календарь"
    width="560px"
    @update:model-value="$emit('update:modelValue', $event)"
  >
    <form class="event-modal" @submit.prevent="submit">
      <UiInput
        ref="titleInputRef"
        v-model="form.title"
        label="Название"
        placeholder="Тренировка, врач, семейный ужин..."
        required
        :error="errors.title"
        @keydown.ctrl.enter="submit"
      />

      <div class="event-modal__grid">
        <UiInput v-model="form.date" type="date" label="Дата" required :error="errors.date" />
        <label class="event-modal__select">
          <span>Категория</span>
          <select v-model="form.category">
            <option v-for="category in EVENT_CATEGORIES" :key="category.value" :value="category.value">
              {{ category.label }}
            </option>
          </select>
        </label>
      </div>

      <div class="event-modal__grid">
        <label class="event-modal__toggle">
          <span>На весь день</span>
          <UiToggle v-model="form.allDay" />
        </label>

        <label class="event-modal__select">
          <span>Повтор</span>
          <select v-model="form.repeat">
            <option v-for="option in REPEAT_OPTIONS" :key="option.value" :value="option.value">
              {{ option.label }}
            </option>
          </select>
        </label>
      </div>

      <UiInput
        v-if="form.repeat !== 'none'"
        v-model="form.repeatUntil"
        type="date"
        label="Повторять до"
        :error="errors.repeatUntil"
      />

      <div v-if="!form.allDay" class="event-modal__grid">
        <UiInput v-model="form.startTime" type="time" label="Начало" />
        <UiInput v-model="form.endTime" type="time" label="Конец" :error="errors.endTime" />
      </div>

      <UiInput v-model="form.location" label="Место" placeholder="Школа, клиника, дом..." />
      <UiInput v-model="form.notes" type="textarea" label="Заметки" placeholder="Что важно не забыть?" />

      <section class="event-modal__members">
        <span>Для кого?</span>
        <div>
          <UiChip
            label="Вся семья"
            clickable
            :selected="form.memberIds.length === 0"
            @click="form.memberIds = []"
          />
          <UiChip
            v-for="member in members"
            :key="member.id"
            :label="member.name"
            :dot="member.color"
            clickable
            :selected="form.memberIds.includes(member.id)"
            @click="toggleMember(member.id)"
          />
        </div>
      </section>

      <footer class="event-modal__footer">
        <UiButton v-if="editingEvent" variant="danger" type="button" @click="remove">Удалить</UiButton>
        <span />
        <UiButton variant="secondary" type="button" @click="$emit('update:modelValue', false)">Отмена</UiButton>
        <UiButton type="submit">{{ editingEvent ? 'Сохранить' : 'Создать' }}</UiButton>
      </footer>
    </form>
  </UiModal>
</template>

<script setup>
import { nextTick, reactive, ref, watch } from 'vue'
import UiModal from '../ui/UiModal.vue'
import UiInput from '../ui/UiInput.vue'
import UiButton from '../ui/UiButton.vue'
import UiChip from '../ui/UiChip.vue'
import UiToggle from '../ui/UiToggle.vue'
import { EVENT_CATEGORIES, REPEAT_OPTIONS } from '../../utils/constants/calendarConstants.js'
import { toDateKey } from '../../utils/formatters/dateFormatter.js'
import { validateEvent } from '../../utils/validators/calendarValidator.js'

const props = defineProps({
  modelValue: { type: Boolean, default: false },
  editingEvent: { type: Object, default: null },
  selectedDateKey: { type: String, default: '' },
  members: { type: Array, default: () => [] },
})

const emit = defineEmits(['update:modelValue', 'create', 'update', 'delete'])

const titleInputRef = ref(null)
const errors = reactive({})
const form = reactive(getEmptyForm())

watch(
  () => props.modelValue,
  async (isOpen) => {
    if (!isOpen) return
    resetForm()
    await nextTick()
    titleInputRef.value?.$el?.querySelector('input')?.focus()
  }
)

const toggleMember = (memberId) => {
  if (form.memberIds.includes(memberId)) {
    form.memberIds = form.memberIds.filter((id) => id !== memberId)
    return
  }

  form.memberIds = [...form.memberIds, memberId]
}

const submit = () => {
  Object.keys(errors).forEach((key) => delete errors[key])
  const validation = validateEvent(form)

  if (!validation.valid) {
    Object.assign(errors, validation.errors)
    return
  }

  if (props.editingEvent) {
    emit('update', props.editingEvent.id, { ...form })
  } else {
    emit('create', { ...form })
  }
}

const remove = () => {
  if (!props.editingEvent) return
  emit('delete', props.editingEvent.id)
}

function resetForm() {
  Object.keys(errors).forEach((key) => delete errors[key])
  Object.assign(form, getEmptyForm(props.selectedDateKey), props.editingEvent ? { ...props.editingEvent } : {})
}

function getEmptyForm(date = '') {
  return {
    title: '',
    date: date || toDateKey(new Date()),
    startTime: '09:00',
    endTime: '10:00',
    memberIds: [],
    category: 'home',
    location: '',
    notes: '',
    allDay: false,
    repeat: 'none',
    repeatUntil: '',
  }
}
</script>

<style scoped>
.event-modal {
  display: grid;
  gap: 10px;
}

.event-modal__grid {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 10px;
}

.event-modal__select {
  display: grid;
  gap: 5px;
}

.event-modal__select span,
.event-modal__members > span {
  color: var(--text-secondary);
  font-size: 11px;
  font-weight: 800;
}

.event-modal__select select {
  width: 100%;
  min-height: 36px;
  border: 1px solid var(--border-color);
  border-radius: var(--radius-md);
  padding: 0 10px;
  color: var(--text-primary);
  background: var(--bg-hover);
  outline: none;
}

.event-modal__toggle {
  display: flex;
  justify-content: space-between;
  align-items: center;
  border: 1px solid var(--border-color);
  border-radius: var(--radius-md);
  padding: 9px 10px;
  background: var(--control-bg);
  color: var(--text-secondary);
  font-weight: 800;
}

.event-modal__members {
  display: grid;
  gap: 6px;
}

.event-modal__members div {
  display: flex;
  flex-wrap: wrap;
  gap: 6px;
}

.event-modal__footer {
  display: grid;
  grid-template-columns: auto 1fr auto auto;
  gap: 10px;
  align-items: center;
  padding-top: 8px;
}

@media (max-width: 620px) {
  .event-modal__grid,
  .event-modal__footer {
    grid-template-columns: 1fr;
  }
}
</style>
