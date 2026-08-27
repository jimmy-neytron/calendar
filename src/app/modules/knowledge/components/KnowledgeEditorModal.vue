<template>
  <UiModal
    :model-value="modelValue"
    :title="note ? 'Редактировать материал' : 'Новый материал'"
    eyebrow="База знаний"
    width="720px"
    @update:model-value="$emit('update:modelValue', $event)"
  >
    <form class="note-editor" @submit.prevent="submit">
      <div v-if="!note" class="note-editor__templates">
        <span>Начать с шаблона</span>
        <div>
          <button v-for="template in templates" :key="template.name" type="button" @click="applyTemplate(template)">{{ template.icon }} {{ template.name }}</button>
        </div>
      </div>
      <UiInput v-model="form.title" label="Название" placeholder="О чём эта заметка?" required />
      <div class="note-editor__meta">
        <KnowledgeSectionInput v-model="form.section" :options="sectionOptions" />
        <UiInput v-model="form.tags" label="Метки через запятую" placeholder="важное, проект" />
      </div>
      <UiInput v-model="form.content" class="note-editor__content" type="textarea" label="Текст" placeholder="Используй # заголовки, - списки и [[Название заметки]] для связей…" required />
      <p class="note-editor__hint"><b># Заголовок</b><b>- Список</b><b>&gt; Цитата</b><b>[[Связь]]</b></p>
      <div class="note-editor__pin">
        <UiToggle v-model="form.pinned" label="Закрепить заметку наверху" />
        <span>Закрепить заметку наверху</span>
      </div>
      <p v-if="error" class="note-editor__error">{{ error }}</p>
      <footer>
        <UiButton variant="secondary" @click="$emit('update:modelValue', false)">Отмена</UiButton>
        <UiButton type="submit" icon="check">{{ note ? 'Сохранить' : 'Добавить в базу' }}</UiButton>
      </footer>
    </form>
  </UiModal>
</template>

<script setup>
import { computed, reactive, ref, watch } from 'vue'
import UiButton from '../../../components/ui/UiButton.vue'
import UiInput from '../../../components/ui/UiInput.vue'
import UiModal from '../../../components/ui/UiModal.vue'
import UiToggle from '../../../components/ui/UiToggle.vue'
import KnowledgeSectionInput from './KnowledgeSectionInput.vue'

const props = defineProps({
  modelValue: { type: Boolean, default: false },
  note: { type: Object, default: null },
  initialSection: { type: String, default: '' },
  sections: { type: Array, default: () => [] },
})
const emit = defineEmits(['update:modelValue', 'save'])
const error = ref('')
const form = reactive({ title: '', section: '', tags: '', content: '', pinned: false })
const sectionOptions = computed(() => [...new Set(['Учёба', 'Работа', 'Проекты', 'Личное', ...props.sections])])
const templates = [
  { name: 'Конспект', icon: '✦', section: 'Учёба', tags: 'конспект', content: '# Главное\n\nКлючевая мысль материала.\n\n# Детали\n\n- Важный пункт\n- Ещё одна идея\n\n# Итог\n\nЧто я хочу запомнить?' },
  { name: 'Учебный план', icon: '◎', section: 'Учёба', tags: 'план, обучение', content: '# Цель\n\nЧему я хочу научиться?\n\n# План\n\n- Первый шаг\n- Практика\n- Проверка знаний\n\n# Полезные связи\n\n[[Название заметки]]' },
  { name: 'Рабочая заметка', icon: '□', section: 'Работа', tags: 'работа', content: '# Контекст\n\nЧто нужно решить?\n\n# Решения\n\n- Важный пункт\n- Следующее действие\n\n# Связанные материалы\n\n[[Название материала]]' },
  { name: 'Идея', icon: '◇', section: 'Идеи', tags: 'идея', content: '# Суть\n\nОпиши идею одним абзацем.\n\n# Почему это важно\n\n> Главная ценность идеи\n\n# Следующий шаг\n\n- Что сделать первым?' },
]

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
function applyTemplate(template) { Object.assign(form, { section: template.section, tags: template.tags, content: template.content }) }
</script>

<style scoped>
.note-editor { display: grid; gap: 12px; }
.note-editor__templates { display: grid; gap: 6px; border: 1px solid var(--border-color); border-radius: 12px; padding: 10px; background: var(--card-soft); }.note-editor__templates > span { color: var(--text-muted); font-size: 9px; font-weight: 800; text-transform: uppercase; }.note-editor__templates > div { display: flex; flex-wrap: wrap; gap: 6px; }.note-editor__templates button { border: 1px solid var(--border-color); border-radius: 9px; padding: 7px 9px; color: var(--text-secondary); background: var(--card-solid); font-size: 10px; font-weight: 700; }.note-editor__templates button:hover { border-color: var(--accent-border); color: var(--accent); background: var(--accent-soft); }
.note-editor__meta { display: grid; grid-template-columns: 1fr 1fr; gap: 9px; }
.note-editor__content :deep(textarea) { min-height: 300px; line-height: 1.6; }
.note-editor__hint { display: flex; flex-wrap: wrap; gap: 5px; margin: -6px 0 0; }.note-editor__hint b { border-radius: 6px; padding: 3px 6px; color: var(--text-muted); background: var(--control-bg); font-size: 8px; font-weight: 650; }
.note-editor__pin { display: flex; align-items: center; gap: 9px; width: fit-content; color: var(--text-secondary); font-size: 11px; font-weight: 700; }
.note-editor__error { margin: 0; color: var(--danger); font-size: 11px; }
.note-editor footer { display: flex; justify-content: flex-end; gap: 8px; border-top: 1px solid var(--border-color); padding-top: 12px; }
@media (max-width: 620px) { .note-editor__meta { grid-template-columns: 1fr; }.note-editor__content :deep(textarea) { min-height: 220px; } }
</style>
