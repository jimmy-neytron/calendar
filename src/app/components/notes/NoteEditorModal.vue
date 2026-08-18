<template>
  <UiModal
    :model-value="modelValue"
    :title="note ? 'Редактировать заметку' : 'Новая заметка'"
    eyebrow="Заметки"
    width="720px"
    @update:model-value="$emit('update:modelValue', $event)"
  >
    <form class="note-editor" @submit.prevent="submit">
      <UiInput v-model="form.title" label="Название" placeholder="О чём эта заметка?" required />
      <div class="note-editor__meta">
        <UiInput v-model="form.section" label="Раздел" placeholder="Личное, Работа, Дом…" />
        <UiInput v-model="form.tags" label="Метки через запятую" placeholder="важное, проект" />
      </div>
      <UiInput v-model="form.content" class="note-editor__content" type="textarea" label="Текст" placeholder="Запиши мысли, план или полезную информацию…" required />
      <div class="note-editor__pin">
        <UiToggle v-model="form.pinned" label="Закрепить заметку наверху" />
        <span>Закрепить заметку наверху</span>
      </div>
      <p v-if="error" class="note-editor__error">{{ error }}</p>
      <footer>
        <UiButton variant="secondary" @click="$emit('update:modelValue', false)">Отмена</UiButton>
        <UiButton type="submit" icon="check">{{ note ? 'Сохранить' : 'Создать заметку' }}</UiButton>
      </footer>
    </form>
  </UiModal>
</template>

<script setup>
import { reactive, ref, watch } from 'vue'
import UiButton from '../ui/UiButton.vue'
import UiInput from '../ui/UiInput.vue'
import UiModal from '../ui/UiModal.vue'
import UiToggle from '../ui/UiToggle.vue'

const props = defineProps({
  modelValue: { type: Boolean, default: false },
  note: { type: Object, default: null },
  initialSection: { type: String, default: '' },
})
const emit = defineEmits(['update:modelValue', 'save'])
const error = ref('')
const form = reactive({ title: '', section: '', tags: '', content: '', pinned: false })

watch(() => props.modelValue, (isOpen) => {
  if (!isOpen) return
  Object.assign(form, {
    title: props.note?.title || '',
    section: props.note?.section || props.initialSection || '',
    tags: (props.note?.tags || []).join(', '),
    content: props.note?.content || '',
    pinned: Boolean(props.note?.pinned),
  })
  error.value = ''
})

function submit() {
  if (!form.title.trim()) { error.value = 'Укажи название заметки'; return }
  if (!form.content.trim()) { error.value = 'Добавь текст заметки'; return }
  error.value = ''
  emit('save', { id: props.note?.id || '', ...form })
}
</script>

<style scoped>
.note-editor { display: grid; gap: 12px; }
.note-editor__meta { display: grid; grid-template-columns: 1fr 1fr; gap: 9px; }
.note-editor__content :deep(textarea) { min-height: 300px; line-height: 1.6; }
.note-editor__pin { display: flex; align-items: center; gap: 9px; width: fit-content; color: var(--text-secondary); font-size: 11px; font-weight: 700; }
.note-editor__error { margin: 0; color: var(--danger); font-size: 11px; }
.note-editor footer { display: flex; justify-content: flex-end; gap: 8px; border-top: 1px solid var(--border-color); padding-top: 12px; }
@media (max-width: 620px) { .note-editor__meta { grid-template-columns: 1fr; }.note-editor__content :deep(textarea) { min-height: 220px; } }
</style>
