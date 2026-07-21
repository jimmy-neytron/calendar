<template>
  <section class="relationships-editor">
    <header>
      <div>
        <small>РОДСТВЕННЫЕ СВЯЗИ</small>
        <strong>Связи человека</strong>
        <p>Выберите человека и тип связи.</p>
      </div>
      <span>{{ modelValue.length }}</span>
    </header>

    <div class="relationships-editor__add">
      <UiSearchableSelect
        v-model="relativeId"
        aria-label="Выберите родственника"
        placeholder="Выберите человека"
        search-placeholder="Имя, фамилия или отчество…"
      >
        <option value="">Выберите человека</option>
        <option v-for="person in availablePeople" :key="person.id" :value="person.id">
          {{ fullName(person) }}
        </option>
      </UiSearchableSelect>

      <UiSelect
        v-model="relationshipType"
        :disabled="!relativeId"
        aria-label="Тип связи"
      >
        <option value="child">Родитель</option>
        <option value="parent">Ребёнок</option>
        <option value="partner">Партнёр</option>
      </UiSelect>

      <UiButton icon="＋" :disabled="!relativeId" @click="addRelationship">Добавить</UiButton>
    </div>

    <div v-if="relativeId" class="relationships-editor__preview">
      <strong>{{ relationshipPreview.left }}</strong>
      <span>{{ relationshipPreview.relation }}</span>
      <strong>{{ relationshipPreview.right }}</strong>
    </div>

    <div v-if="modelValue.length" class="relationships-editor__list">
      <article v-for="relationship in modelValue" :key="relationship.id || relationship.relativeId">
        <span class="relationships-editor__avatar">
          <img
            v-if="personById(relationship.relativeId)?.photo"
            :src="personById(relationship.relativeId).photo"
            :alt="fullName(personById(relationship.relativeId))"
          />
          <template v-else>{{ initials(personById(relationship.relativeId)) }}</template>
        </span>

        <div>
          <strong>{{ fullName(personById(relationship.relativeId)) }}</strong>
          <small>{{ relationshipSentence(relationship) }}</small>
        </div>

        <UiSelect
          compact
          :model-value="relationship.type"
          aria-label="Изменить тип связи"
          @update:model-value="updateRelationshipType(relationship, $event)"
        >
          <option value="child">Родитель</option>
          <option value="parent">Ребёнок</option>
          <option value="partner">Партнёр</option>
        </UiSelect>

        <UiIconButton
          icon="trash"
          label="Удалить связь"
          variant="danger"
          @click="removeRelationship(relationship)"
        />
      </article>
    </div>

    <div v-else class="relationships-editor__empty">
      Связей пока нет. Выберите человека и тип связи выше.
    </div>
  </section>
</template>

<script setup>
import { computed, ref } from 'vue'
import UiButton from '../ui/UiButton.vue'
import UiIconButton from '../ui/UiIconButton.vue'
import UiSearchableSelect from '../ui/UiSearchableSelect.vue'
import UiSelect from '../ui/UiSelect.vue'

const props = defineProps({
  modelValue: { type: Array, default: () => [] },
  people: { type: Array, default: () => [] },
  subjectName: { type: String, default: 'Редактируемый человек' },
})
const emit = defineEmits(['update:modelValue'])

const relativeId = ref('')
const relationshipType = ref('child')
const availablePeople = computed(() => {
  const linkedIds = new Set(props.modelValue.map((item) => item.relativeId))
  return props.people.filter((person) => !linkedIds.has(person.id))
})
const selectedRelativeName = computed(() => fullName(personById(relativeId.value)))

/** Возвращает ещё не добавленную связь для сохранения вместе со всей формой. */
function getPendingRelationship() {
  if (!relativeId.value) return null
  return {
    id: '',
    relativeId: relativeId.value,
    type: relationshipType.value,
  }
}

defineExpose({ getPendingRelationship })
const relationshipPreview = computed(() => {
  const subject = props.subjectName || 'Редактируемый человек'
  const relative = selectedRelativeName.value
  if (relationshipType.value === 'parent') {
    return { left: subject, relation: 'родитель для →', right: relative }
  }
  if (relationshipType.value === 'child') {
    return { left: relative, relation: 'родитель для →', right: subject }
  }
  return { left: subject, relation: 'партнёр ↔', right: relative }
})

function addRelationship() {
  if (!relativeId.value) return
  emit('update:modelValue', [
    ...props.modelValue,
    {
      id: '',
      relativeId: relativeId.value,
      type: relationshipType.value,
    },
  ])
  relativeId.value = ''
  relationshipType.value = 'child'
}

function updateRelationshipType(relationship, type) {
  emit('update:modelValue', props.modelValue.map((item) => (
    item === relationship ? { ...item, type } : item
  )))
}

function removeRelationship(relationship) {
  emit('update:modelValue', props.modelValue.filter((item) => item !== relationship))
}

function personById(id) {
  return props.people.find((person) => person.id === id)
}

function fullName(person) {
  return [person?.lastName, person?.firstName, person?.patronymic].filter(Boolean).join(' ') || 'Неизвестный человек'
}

function initials(person) {
  return [person?.firstName, person?.lastName]
    .filter(Boolean)
    .map((part) => part[0])
    .join('')
    .slice(0, 2)
    .toUpperCase() || '?'
}

function relationshipSentence(relationship) {
  const subject = props.subjectName || 'Редактируемый человек'
  const relative = fullName(personById(relationship.relativeId))
  if (relationship.type === 'parent') return `${subject} — родитель для ${relative}`
  if (relationship.type === 'child') return `${relative} — родитель для ${subject}`
  return `${subject} и ${relative} — партнёры`
}
</script>

<style scoped>
.relationships-editor {
  display: grid;
  gap: 10px;
  border: 1px solid var(--border-color);
  border-radius: 16px;
  padding: 12px;
  background: var(--control-bg);
}

.relationships-editor > header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 10px;
}

.relationships-editor > header small,
.relationships-editor > header strong {
  display: block;
}

.relationships-editor > header small {
  margin-bottom: 2px;
  color: var(--text-muted);
  font-size: 8px;
  font-weight: 850;
  letter-spacing: .12em;
}

.relationships-editor > header p {
  margin: 3px 0 0;
  color: var(--text-muted);
  font-size: 9px;
}

.relationships-editor > header > span {
  display: grid;
  place-items: center;
  min-width: 26px;
  height: 26px;
  border-radius: var(--radius-pill);
  color: var(--accent-light, var(--accent-hover));
  background: var(--accent-soft);
  font-size: 11px;
  font-weight: 800;
}

.relationships-editor__add {
  display: grid;
  grid-template-columns: minmax(180px, 1fr) minmax(180px, .8fr) auto;
  align-items: center;
  gap: 7px;
  border-top: 1px solid var(--border-color);
  padding-top: 10px;
}

.relationships-editor__add :deep(.ui-select),
.relationships-editor__add :deep(.ui-select__trigger) {
  width: 100%;
}

.relationships-editor__preview {
  display: grid;
  grid-template-columns: minmax(0, 1fr) auto minmax(0, 1fr);
  align-items: center;
  gap: 8px;
  border: 1px solid color-mix(in srgb, var(--accent) 30%, var(--border-color));
  border-radius: 12px;
  padding: 9px 11px;
  color: var(--text-primary);
  background: color-mix(in srgb, var(--accent) 7%, var(--field-bg));
  text-align: center;
  font-size: 10px;
}

.relationships-editor__preview strong {
  min-width: 0;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.relationships-editor__preview span {
  color: var(--accent-light, var(--accent-hover));
  font-weight: 850;
  white-space: nowrap;
}

.relationships-editor__list {
  display: grid;
  gap: 6px;
}

.relationships-editor__list article {
  display: grid;
  grid-template-columns: 38px minmax(0, 1fr) minmax(135px, 170px) auto;
  align-items: center;
  gap: 9px;
  border: 1px solid var(--border-color);
  border-radius: 12px;
  padding: 8px;
  background: var(--field-bg);
}

.relationships-editor__list strong,
.relationships-editor__list small {
  display: block;
}

.relationships-editor__list small {
  margin-top: 2px;
  color: var(--text-muted);
  font-size: 9px;
}

.relationships-editor__avatar {
  display: grid;
  place-items: center;
  width: 38px;
  height: 38px;
  overflow: hidden;
  border-radius: 11px;
  color: var(--text-inverse);
  background: var(--accent);
  font-size: 10px;
  font-weight: 900;
}

.relationships-editor__avatar img {
  width: 100%;
  height: 100%;
  object-fit: cover;
}

.relationships-editor__empty {
  border: 1px dashed var(--border-color);
  border-radius: 11px;
  padding: 14px;
  color: var(--text-muted);
  text-align: center;
  font-size: 10px;
}

@media (max-width: 680px) {
  .relationships-editor__add,
  .relationships-editor__preview,
  .relationships-editor__list article {
    grid-template-columns: 1fr;
  }

  .relationships-editor__avatar {
    display: none;
  }
}
</style>
