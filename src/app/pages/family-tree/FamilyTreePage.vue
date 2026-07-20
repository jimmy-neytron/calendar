<template>
  <section class="family-tree-page">
    <FamilyTreeToolbar
      :people-count="people.length"
      :visible-count="visibleIds.length"
      :has-active-filters="hasActiveFilters"
      @toggle-filters="toggleFilters"
      @export="exportJson"
      @import="importJson"
      @create="openCreate"
    />

    <div v-if="isPending" class="tree-state">
      <UiLoader />
      <span>Загружаем семейную историю…</span>
    </div>

    <div v-else-if="isError" class="tree-state tree-state--error">
      Не удалось загрузить дерево. Сначала выполните SQL-миграцию.
    </div>

    <div v-else class="tree-stage">
      <FamilyTreeCanvas
        :people="people"
        :relationships="relationships"
        :positions="tree.positions"
        :selected-id="selectedId"
        :visible-ids="visibleIds"
        @select="selectPerson"
        @positions="savePositions"
      />

      <FamilyTreeFiltersPanel
        v-if="filtersOpen"
        ref="filtersPanel"
        v-model:search="search"
        v-model:gender-filter="genderFilter"
        v-model:living-only="livingOnly"
        :visible-count="visibleIds.length"
        :total-count="people.length"
        :has-active-filters="hasActiveFilters"
        @reset="resetFilters"
        @close="filtersOpen = false"
      />

      <div class="tree-hint">
        <UiIcon name="help" />
        Колесо — быстрый масштаб · перетаскивание — новое положение · клик — карточка
      </div>

      <div v-if="!visibleIds.length && people.length" class="tree-empty-search">
        <UiIcon name="search" />
        <strong>Никого не нашли</strong>
        <span>Попробуйте изменить запрос или фильтры.</span>
        <UiButton variant="secondary" size="sm" @click="resetFilters">Сбросить фильтры</UiButton>
      </div>

      <FamilyPersonDetailsPanel
        v-if="detailsOpen && selected"
        :person="selected"
        :relations="selectedRelations"
        @close="closePersonDetails"
        @edit="editSelected"
        @delete="removeSelected"
        @select="selectRelatedPerson"
      />
    </div>

    <UiModal
      v-model="editorOpen"
      :title="editingId ? 'Редактировать человека' : 'Новый человек'"
      eyebrow="Семейное дерево"
      width="720px"
    >
      <form class="person-form" @submit.prevent="savePerson">
        <div class="person-photo-field person-form__wide">
          <div class="person-photo-field__preview">
            <img v-if="form.photo" :src="form.photo" alt="Предпросмотр фотографии" />
            <span v-else>{{ initials(formPreviewPerson) || '?' }}</span>
          </div>
          <div>
            <strong>Фотография</strong>
            <p>Изображение уменьшится и сохранится внутри JSON семейного дерева.</p>
            <div class="person-photo-field__actions">
              <UiButton type="button" variant="secondary" size="sm" @click="openPhotoPicker">
                {{ form.photo ? 'Заменить фото' : 'Выбрать фото' }}
              </UiButton>
              <UiButton
                v-if="form.photo"
                type="button"
                variant="ghost"
                size="sm"
                @click="form.photo = ''"
              >
                Удалить фото
              </UiButton>
            </div>
          </div>
          <input
            ref="photoInput"
            hidden
            type="file"
            accept="image/jpeg,image/png,image/webp,image/avif"
            @change="handlePhotoUpload"
          />
        </div>

        <UiInput v-model="form.firstName" label="Имя" required placeholder="Анна" />
        <UiInput v-model="form.lastName" label="Фамилия" placeholder="Соколова" />

        <label class="person-form__field">
          <span>Пол</span>
          <UiSelect v-model="form.gender">
            <option value="female">Женщина</option>
            <option value="male">Мужчина</option>
            <option value="other">Другой / не указан</option>
          </UiSelect>
        </label>

        <UiInput v-model="form.birthDate" type="date" label="Дата рождения" />
        <UiInput v-model="form.deathDate" type="date" label="Дата смерти" />
        <UiInput v-model="form.birthPlace" label="Место рождения" />
        <UiInput
          v-model="form.notes"
          class="person-form__wide"
          type="textarea"
          label="История и заметки"
        />
        <UiInput
          v-model="form.tagsText"
          class="person-form__wide"
          label="Теги через запятую"
          placeholder="ветвь Ивановых, Москва"
        />

        <label class="person-form__field">
          <span>Связать с</span>
          <UiSelect v-model="form.relativeId">
            <option value="">Без новой связи</option>
            <option v-for="person in otherPeople" :key="person.id" :value="person.id">
              {{ fullName(person) }}
            </option>
          </UiSelect>
        </label>

        <label class="person-form__field">
          <span>Тип связи</span>
          <UiSelect v-model="form.relationshipType" :disabled="!form.relativeId">
            <option value="parent">Этот человек — родитель</option>
            <option value="child">Этот человек — ребёнок</option>
            <option value="partner">Партнёры</option>
          </UiSelect>
        </label>

        <footer class="person-form__footer person-form__wide">
          <UiButton type="button" variant="secondary" @click="editorOpen = false">Отмена</UiButton>
          <UiButton type="submit" :loading="isSaving">Сохранить</UiButton>
        </footer>
      </form>
    </UiModal>
  </section>
</template>

<script setup>
import { computed, nextTick, onBeforeUnmount, onMounted, reactive, ref, watch } from 'vue'
import FamilyPersonDetailsPanel from '../../components/family-tree/FamilyPersonDetailsPanel.vue'
import FamilyTreeCanvas from '../../components/family-tree/FamilyTreeCanvas.vue'
import FamilyTreeFiltersPanel from '../../components/family-tree/FamilyTreeFiltersPanel.vue'
import FamilyTreeToolbar from '../../components/family-tree/FamilyTreeToolbar.vue'
import UiButton from '../../components/ui/UiButton.vue'
import UiIcon from '../../components/ui/UiIcon.vue'
import UiInput from '../../components/ui/UiInput.vue'
import UiLoader from '../../components/ui/UiLoader.vue'
import UiModal from '../../components/ui/UiModal.vue'
import UiSelect from '../../components/ui/UiSelect.vue'
import { useFamilyTree } from '../../composables/family-tree/useFamilyTree.js'
import { useNotification } from '../../composables/ui/useNotification.js'
import { workspaceStore } from '../../stores/workspace.store.js'

const EMPTY_TREE = { version: 2, people: [], relationships: [], positions: {} }
const MAX_PHOTO_FILE_SIZE = 10 * 1024 * 1024
const PHOTO_MAX_SIDE = 720

const workspaceId = computed(() => workspaceStore.activeWorkspace.value?.id || '')
const { data, isPending, isError, save, isSaving } = useFamilyTree(workspaceId)
const { notify } = useNotification()

const localTree = ref(null)
const selectedId = ref('')
const detailsOpen = ref(false)
const editorOpen = ref(false)
const editingId = ref('')
const search = ref('')
const genderFilter = ref('')
const livingOnly = ref(false)
const filtersOpen = ref(false)
const filtersPanel = ref(null)
const photoInput = ref(null)
let initializedWorkspaceId = ''
let positionTimer = null
let positionSaveRevision = 0

const emptyForm = () => ({
  firstName: '',
  lastName: '',
  gender: 'other',
  birthDate: '',
  deathDate: '',
  birthPlace: '',
  notes: '',
  tagsText: '',
  photo: '',
  relativeId: '',
  relationshipType: 'parent',
})
const form = reactive(emptyForm())

const tree = computed(() => localTree.value || EMPTY_TREE)
const people = computed(() => tree.value.people || [])
const relationships = computed(() => tree.value.relationships || [])
const selected = computed(() => people.value.find((person) => person.id === selectedId.value))
const otherPeople = computed(() => people.value.filter((person) => person.id !== editingId.value))
const hasActiveFilters = computed(() => Boolean(search.value.trim() || genderFilter.value || livingOnly.value))
const formPreviewPerson = computed(() => ({
  firstName: form.firstName,
  lastName: form.lastName,
}))

const visibleIds = computed(() => {
  const terms = normalize(search.value).split(/\s+/).filter(Boolean)
  return people.value
    .filter((person) => !genderFilter.value || person.gender === genderFilter.value)
    .filter((person) => !livingOnly.value || !person.deathDate)
    .filter((person) => terms.every((term) => normalize([
      person.firstName,
      person.lastName,
      person.birthDate,
      person.deathDate,
      person.birthPlace,
      person.notes,
      ...(person.tags || []),
    ].join(' ')).includes(term)))
    .map((person) => person.id)
})

const selectedRelations = computed(() => {
  if (!selected.value) return []

  return relationships.value.flatMap((relationship) => {
    if (relationship.from !== selected.value.id && relationship.to !== selected.value.id) return []
    const otherId = relationship.from === selected.value.id
      ? relationship.to
      : relationship.from
    const person = people.value.find((item) => item.id === otherId)
    if (!person) return []

    let label = 'Родственная связь'
    if (relationship.type === 'partner') label = 'Партнёр'
    else if (relationship.from === selected.value.id) label = 'Ребёнок'
    else label = 'Родитель'

    return [{ id: relationship.id, label, person }]
  })
})

watch(workspaceId, () => {
  initializedWorkspaceId = ''
  localTree.value = null
  selectedId.value = ''
  detailsOpen.value = false
  filtersOpen.value = false
}, { immediate: true })

// Серверный документ применяется только при первой загрузке workspace.
// Ответы сохранения не пересоздают локальный граф и не запускают layout заново.
watch(data, (value) => {
  if (!value || !workspaceId.value || initializedWorkspaceId === workspaceId.value) return
  localTree.value = normalizeDocument(value)
  initializedWorkspaceId = workspaceId.value
}, { immediate: true })

watch(visibleIds, (ids) => {
  if (selectedId.value && !ids.includes(selectedId.value)) {
    selectedId.value = ''
    detailsOpen.value = false
  }
})

function normalize(value) {
  return String(value || '').toLocaleLowerCase('ru-RU').replace(/ё/g, 'е')
}

function cloneDocument(value) {
  return JSON.parse(JSON.stringify(value))
}

function normalizeDocument(value) {
  const source = cloneDocument(value || EMPTY_TREE)
  delete source.updatedAt
  return {
    version: Math.max(2, Number(source.version) || 1),
    people: Array.isArray(source.people) ? source.people : [],
    relationships: Array.isArray(source.relationships) ? source.relationships : [],
    positions: source.positions && typeof source.positions === 'object' ? source.positions : {},
  }
}

function fullName(person) {
  return [person?.firstName, person?.lastName].filter(Boolean).join(' ') || 'Без имени'
}

function initials(person) {
  return [person?.firstName, person?.lastName]
    .filter(Boolean)
    .map((part) => part[0])
    .join('')
    .slice(0, 2)
    .toUpperCase()
}

function resetFilters() {
  search.value = ''
  genderFilter.value = ''
  livingOnly.value = false
}

function openCreate() {
  editingId.value = ''
  Object.assign(form, emptyForm())
  editorOpen.value = true
}

function editSelected() {
  if (!selected.value) return
  editingId.value = selected.value.id
  Object.assign(form, emptyForm(), selected.value, {
    photo: selected.value.photo || '',
    tagsText: (selected.value.tags || []).join(', '),
  })
  detailsOpen.value = false
  selectedId.value = ''
  editorOpen.value = true
}

function selectPerson(id) {
  selectedId.value = id
  filtersOpen.value = false
  detailsOpen.value = true
}

function closePersonDetails() {
  detailsOpen.value = false
  selectedId.value = ''
}

function selectRelatedPerson(id) {
  selectedId.value = id
}

async function persistDocument(next, message = '') {
  window.clearTimeout(positionTimer)
  const document = normalizeDocument(next)
  localTree.value = document
  try {
    await save(cloneDocument(document))
    if (message) notify(message, 'success')
    return true
  } catch (error) {
    notify(error?.message || 'Не удалось сохранить семейное дерево', 'warning')
    return false
  }
}

async function savePerson() {
  if (!form.firstName.trim()) {
    notify('Укажите имя', 'warning')
    return
  }

  const id = editingId.value || crypto.randomUUID()
  const previous = people.value.find((person) => person.id === id) || {}
  const person = {
    ...previous,
    id,
    firstName: form.firstName.trim(),
    lastName: form.lastName.trim(),
    gender: form.gender,
    birthDate: form.birthDate,
    deathDate: form.deathDate,
    birthPlace: form.birthPlace.trim(),
    notes: form.notes.trim(),
    tags: form.tagsText.split(',').map((tag) => tag.trim()).filter(Boolean),
    photo: form.photo || '',
  }

  const next = normalizeDocument(tree.value)
  const index = next.people.findIndex((item) => item.id === id)
  if (index < 0) next.people.push(person)
  else next.people[index] = person

  if (form.relativeId && !editingId.value) {
    let from = id
    let to = form.relativeId
    if (form.relationshipType === 'child') {
      from = form.relativeId
      to = id
    }
    next.relationships.push({
      id: crypto.randomUUID(),
      from,
      to,
      type: form.relationshipType === 'partner' ? 'partner' : 'parent',
    })
  }

  const saved = await persistDocument(next, 'Дерево сохранено')
  if (!saved) return
  selectedId.value = id
  detailsOpen.value = true
  editorOpen.value = false
}

async function removeSelected() {
  if (!selected.value || !window.confirm('Удалить человека и все его связи?')) return
  const id = selected.value.id
  const next = normalizeDocument(tree.value)
  next.people = next.people.filter((person) => person.id !== id)
  next.relationships = next.relationships.filter(
    (relationship) => relationship.from !== id && relationship.to !== id
  )
  delete next.positions[id]
  selectedId.value = ''
  detailsOpen.value = false
  await persistDocument(next, 'Человек удалён')
}

function savePositions(positions) {
  localTree.value = {
    ...normalizeDocument(tree.value),
    positions: cloneDocument(positions),
  }

  const revision = ++positionSaveRevision
  window.clearTimeout(positionTimer)
  positionTimer = window.setTimeout(async () => {
    const snapshot = normalizeDocument(localTree.value)
    try {
      await save(cloneDocument(snapshot))
    } catch (error) {
      if (revision === positionSaveRevision) {
        notify(error?.message || 'Не удалось сохранить расположение карточек', 'warning')
      }
    }
  }, 850)
}

function openPhotoPicker() {
  photoInput.value?.click()
}

async function handlePhotoUpload(event) {
  const file = event.target.files?.[0]
  event.target.value = ''
  if (!file) return
  if (!file.type.startsWith('image/')) {
    notify('Выберите файл изображения', 'warning')
    return
  }
  if (file.size > MAX_PHOTO_FILE_SIZE) {
    notify('Исходное фото должно быть меньше 10 МБ', 'warning')
    return
  }

  try {
    form.photo = await compressPhoto(file)
  } catch {
    notify('Не удалось обработать фотографию', 'warning')
  }
}

async function compressPhoto(file) {
  const bitmap = await createImageBitmap(file)
  const scale = Math.min(1, PHOTO_MAX_SIDE / Math.max(bitmap.width, bitmap.height))
  const width = Math.max(1, Math.round(bitmap.width * scale))
  const height = Math.max(1, Math.round(bitmap.height * scale))
  const canvas = document.createElement('canvas')
  canvas.width = width
  canvas.height = height
  const context = canvas.getContext('2d')
  context.drawImage(bitmap, 0, 0, width, height)
  bitmap.close?.()
  return canvas.toDataURL('image/webp', 0.82)
}

function exportJson() {
  const blob = new Blob([JSON.stringify(normalizeDocument(tree.value), null, 2)], {
    type: 'application/json',
  })
  const anchor = document.createElement('a')
  anchor.href = URL.createObjectURL(blob)
  anchor.download = `family-tree-${new Date().toISOString().slice(0, 10)}.json`
  anchor.click()
  window.setTimeout(() => URL.revokeObjectURL(anchor.href), 0)
}

async function importJson(event) {
  const file = event.target.files?.[0]
  event.target.value = ''
  if (!file) return

  try {
    const parsed = JSON.parse(await file.text())
    if (!Array.isArray(parsed.people) || !Array.isArray(parsed.relationships)) {
      throw new Error('Неверный формат JSON')
    }
    await persistDocument(parsed, 'Дерево импортировано')
  } catch (error) {
    notify(error?.message || 'Не удалось импортировать дерево', 'warning')
  }
}

async function focusFiltersSearch() {
  filtersOpen.value = true
  await nextTick()
  filtersPanel.value?.focusSearch()
}

async function toggleFilters() {
  filtersOpen.value = !filtersOpen.value
  if (filtersOpen.value) {
    await nextTick()
    filtersPanel.value?.focusSearch()
  }
}

function handleGlobalKeydown(event) {
  if (event.key === 'Escape' && filtersOpen.value) {
    filtersOpen.value = false
    return
  }
  if (event.key === 'Escape' && detailsOpen.value) {
    closePersonDetails()
    return
  }
  if (event.key !== '/' || event.ctrlKey || event.metaKey || event.altKey) return
  const target = event.target
  if (target instanceof HTMLInputElement || target instanceof HTMLTextAreaElement) return
  event.preventDefault()
  focusFiltersSearch()
}

onMounted(() => window.addEventListener('keydown', handleGlobalKeydown))
onBeforeUnmount(() => {
  window.removeEventListener('keydown', handleGlobalKeydown)
  window.clearTimeout(positionTimer)
})
</script>

<style scoped>
.family-tree-page {
  display: grid;
  grid-template-rows: auto minmax(0, 1fr);
  gap: 12px;
  height: calc(100dvh - var(--header-height));
  padding: 12px;
}


.tree-stage {
  position: relative;
  min-height: 500px;
  overflow: hidden;
  border: 1px solid var(--border-color);
  border-radius: 20px;
  box-shadow: inset 0 1px 0 color-mix(in srgb, var(--border-strong) 35%, transparent);
}

.tree-hint {
  position: absolute;
  bottom: 14px;
  left: 14px;
  display: flex;
  align-items: center;
  gap: 7px;
  max-width: calc(100% - 28px);
  border: 1px solid var(--border-color);
  border-radius: var(--radius-pill);
  padding: 7px 11px;
  color: var(--text-muted);
  background: color-mix(in srgb, var(--sidebar-floating-bg) 92%, transparent);
  box-shadow: var(--shadow-sm);
  font-size: 10px;
  backdrop-filter: blur(12px);
}

.tree-state,
.tree-empty-search {
  display: grid;
  place-items: center;
  align-content: center;
  gap: 9px;
  color: var(--text-muted);
  text-align: center;
}

.tree-state--error {
  color: var(--danger);
}

.tree-empty-search {
  position: absolute;
  inset: 0;
  z-index: 3;
  pointer-events: none;
}

.tree-empty-search > * {
  pointer-events: auto;
}

.tree-empty-search > :first-child {
  width: 38px;
  height: 38px;
  color: var(--accent);
}

.tree-empty-search span {
  font-size: 12px;
}

.person-photo-field__preview {
  display: grid;
  place-items: center;
  overflow: hidden;
  color: var(--text-inverse);
  background: linear-gradient(145deg, var(--accent), color-mix(in srgb, var(--accent) 45%, #111827));
  font-weight: 900;
}

.person-photo-field__preview img {
  width: 100%;
  height: 100%;
  object-fit: cover;
}

.person-form__footer {
  display: flex;
  justify-content: flex-end;
  gap: 8px;
}

.person-form {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 12px;
}

.person-form__wide {
  grid-column: 1 / -1;
}

.person-form__field {
  display: grid;
  gap: 5px;
}

.person-form__field > span {
  color: var(--text-secondary);
  font-size: 11px;
  letter-spacing: 0;
}

.person-photo-field {
  display: grid;
  grid-template-columns: 112px minmax(0, 1fr);
  align-items: center;
  gap: 14px;
  border: 1px solid var(--border-color);
  border-radius: 16px;
  padding: 12px;
  background: var(--control-bg);
}

.person-photo-field__preview {
  width: 112px;
  height: 88px;
  border-radius: 13px;
  font-size: 24px;
}

.person-photo-field p {
  margin: 4px 0 10px;
  color: var(--text-muted);
  font-size: 11px;
}

.person-photo-field__actions {
  display: flex;
  flex-wrap: wrap;
  gap: 6px;
}

.person-form__footer {
  margin-top: 4px;
}

@media (max-width: 760px) {
  .family-tree-page { height: auto; }
  .tree-stage { height: 72vh; }
  .tree-hint { display: none; }
  .person-form,
  .person-photo-field { grid-template-columns: 1fr; }
  .person-form > * { grid-column: 1 !important; }
}
</style>
