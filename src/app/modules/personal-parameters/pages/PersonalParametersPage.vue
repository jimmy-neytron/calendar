<template>
  <section class="parameters-page">
    <UiPageHeader title="Мои параметры" eyebrow="Личная памятка" description="Размеры, модели и характеристики, которые удобно иметь под рукой.">
      <template #actions><UiButton @click="openCreateModal">Новая карточка</UiButton></template>
    </UiPageHeader>

    <section class="parameters-summary" aria-label="Сводка">
      <article>
        <span><UiIcon name="ruler" /></span>
        <div><small>Карточек</small><strong>{{ items.length }}</strong></div>
      </article>
      <article>
        <span><UiIcon name="star" /></span>
        <div><small>В избранном</small><strong>{{ favoriteCount }}</strong></div>
      </article>
      <article>
        <span><UiIcon name="users" /></span>
        <div><small>Общих</small><strong>{{ sharedCount }}</strong></div>
      </article>
    </section>

    <section class="parameters-toolbar panel">
      <UiInput v-model="search" type="search" placeholder="Найти размер, модель или значение" />
      <label class="parameters-select">
        <span>Категория</span>
        <UiSelect v-model="categoryFilter">
          <option value="all">Все категории</option>
          <option v-for="category in categories" :key="category.value" :value="category.value">{{ category.label }}</option>
        </UiSelect>
      </label>
      <label class="parameters-select">
        <span>Доступ</span>
        <UiSelect v-model="visibilityFilter">
          <option value="all">Все карточки</option>
          <option value="private">Только личные</option>
          <option value="shared">Общие</option>
        </UiSelect>
      </label>
      <UiButton icon="plus" @click="openCreateModal">Добавить</UiButton>
    </section>

    <nav class="category-rail" aria-label="Категории параметров">
      <button
        v-for="category in categories"
        :key="category.value"
        type="button"
        :class="{ active: categoryFilter === category.value }"
        @click="toggleCategory(category.value)"
      >
        <span><ParameterCategoryIcon :category="category.value" /></span>
        <b>{{ category.label }}</b>
        <small>{{ categoryCount(category.value) }}</small>
      </button>
    </nav>

    <div v-if="filteredItems.length" class="parameters-grid">
      <article v-for="item in filteredItems" :key="item.id" class="parameter-card" :class="`parameter-card--${item.category}`">
        <header>
          <span class="parameter-card__icon"><ParameterCategoryIcon :category="item.category" /></span>
          <div>
            <small>{{ categoryMeta(item.category).label }}</small>
            <h2>{{ item.title }}</h2>
          </div>
          <button
            v-if="isOwn(item)"
            type="button"
            class="parameter-card__favorite"
            :class="{ active: item.favorite }"
            :aria-label="item.favorite ? 'Убрать из избранного' : 'Добавить в избранное'"
            @click="toggleFavorite(item)"
          >
            <UiIcon name="star" />
          </button>
        </header>

        <div class="parameter-values">
          <div v-for="field in item.fields.slice(0, 6)" :key="field.id">
            <span>{{ field.label }}</span>
            <strong>{{ field.value }}<small v-if="field.unit"> {{ field.unit }}</small></strong>
          </div>
        </div>

        <p v-if="item.note">{{ item.note }}</p>

        <footer>
          <span :class="['parameter-card__scope', { shared: item.visibility === 'shared' }]">
            <UiIcon :name="item.visibility === 'shared' ? 'users' : 'key'" />
            {{ scopeLabel(item) }}
          </span>
          <div>
            <UiIconButton icon="copy" label="Скопировать параметры" @click="copyItem(item)" />
            <template v-if="isOwn(item)">
              <UiIconButton icon="edit" label="Изменить карточку" @click="openEditModal(item)" />
              <UiIconButton icon="trash" label="Удалить карточку" variant="danger" @click="openDeleteModal(item)" />
            </template>
          </div>
        </footer>
      </article>
    </div>

    <section v-else class="parameters-empty panel">
      <svg viewBox="0 0 180 130" fill="none" aria-hidden="true">
        <rect x="30" y="18" width="120" height="94" rx="18" />
        <path d="M52 46h49M52 59h31M52 81h76M52 94h52" />
        <path d="M124 31v38M117 38h14M117 50h9M117 62h14" />
        <circle cx="145" cy="100" r="19" />
        <path d="M136 100h18M145 91v18" />
      </svg>
      <strong>{{ items.length ? 'Ничего не найдено' : 'Сохраните первый параметр' }}</strong>
      <p>{{ items.length ? 'Измените поиск или фильтры.' : 'Например, размеры одежды, модель фильтра или габариты комнаты.' }}</p>
      <UiButton v-if="!items.length" icon="plus" @click="openCreateModal">Создать карточку</UiButton>
    </section>

    <UiModal v-model="isEditorOpen" :title="editingItem ? 'Изменить карточку' : 'Новая карточка'" eyebrow="Мои параметры" width="760px" :close-on-overlay="!isSaving">
      <form class="parameter-editor" @submit.prevent="saveItem">
        <div class="parameter-editor__intro">
          <span><ParameterCategoryIcon :category="form.category" /></span>
          <div><strong>{{ editingItem ? 'Обновите нужные значения' : 'Что хотите сохранить?' }}</strong><small>Карточку всегда можно дополнить позже.</small></div>
        </div>

        <div class="parameter-editor__main">
          <UiInput v-model="form.title" label="Название карточки" placeholder="Например: Мои размеры" required :error="errors.title" />
          <label class="parameter-field">
            <span>Категория</span>
            <UiSelect v-model="form.category" @change="applyCategoryTemplate">
              <option v-for="category in categories" :key="category.value" :value="category.value">{{ category.label }}</option>
            </UiSelect>
          </label>
          <label class="parameter-field parameter-field--wide">
            <span>Кому видна карточка</span>
            <UiSelect v-model="form.visibility">
              <option value="private">Только мне</option>
              <option value="shared">Участникам пространства</option>
            </UiSelect>
          </label>
        </div>

        <section class="parameter-editor__values">
          <header>
            <div><span>Значения</span><small>Добавьте только то, что действительно пригодится.</small></div>
            <UiButton type="button" size="sm" variant="secondary" icon="plus" :disabled="form.fields.length >= 12" @click="addField">Поле</UiButton>
          </header>
          <div class="parameter-editor__rows">
            <div v-for="(field, index) in form.fields" :key="field.id" class="parameter-editor__row">
              <UiInput v-model="field.label" :label="index === 0 ? 'Параметр' : ''" placeholder="Размер обуви" />
              <UiInput v-model="field.value" :label="index === 0 ? 'Значение' : ''" placeholder="43" />
              <UiInput v-model="field.unit" :label="index === 0 ? 'Единица' : ''" placeholder="EU" />
              <UiIconButton icon="trash" label="Удалить поле" variant="danger" :disabled="form.fields.length === 1" @click="removeField(index)" />
            </div>
          </div>
          <p v-if="errors.fields" class="parameter-editor__error">{{ errors.fields }}</p>
        </section>

        <UiInput v-model="form.note" type="textarea" label="Заметка" placeholder="Дополнительная информация, ссылка или пояснение" />

        <label class="parameter-editor__favorite">
          <button type="button" :class="{ active: form.favorite }" @click="form.favorite = !form.favorite"><UiIcon name="star" /></button>
          <span><strong>Добавить в избранное</strong><small>Карточка будет отображаться первой.</small></span>
        </label>

        <p v-if="saveError" class="parameter-editor__error">{{ saveError }}</p>
        <footer>
          <UiButton type="button" variant="secondary" :disabled="isSaving" @click="isEditorOpen = false">Отмена</UiButton>
          <UiButton type="submit" :loading="isSaving">{{ editingItem ? 'Сохранить' : 'Создать карточку' }}</UiButton>
        </footer>
      </form>
    </UiModal>

    <UiModal v-model="isDeleteOpen" title="Удалить карточку?" eyebrow="Мои параметры" width="430px">
      <div class="parameter-delete">
        <span><UiIcon name="trash" /></span>
        <strong>{{ deletingItem?.title }}</strong>
        <p>Карточка и сохранённые в ней значения будут удалены.</p>
        <footer><UiButton variant="secondary" @click="isDeleteOpen = false">Отмена</UiButton><UiButton variant="danger" :loading="isDeleting" @click="confirmDelete">Удалить</UiButton></footer>
      </div>
    </UiModal>
  </section>
</template>

<script setup lang="ts">
import { computed, reactive, ref } from 'vue'
import UiButton from '../../../components/ui/UiButton.vue'
import UiIcon from '../../../components/ui/UiIcon.vue'
import UiIconButton from '../../../components/ui/UiIconButton.vue'
import UiInput from '../../../components/ui/UiInput.vue'
import UiModal from '../../../components/ui/UiModal.vue'
import UiPageHeader from '../../../components/ui/UiPageHeader.vue'
import UiSelect from '../../../components/ui/UiSelect.vue'
import { useNotification } from '../../../composables/ui/useNotification.js'
import { authStore } from '../../../stores/auth.store.js'
import { personalParametersStore } from '../../../stores/personalParameters.store'
import type { PersonalParameterCategory, PersonalParameterField, PersonalParameterItem, PersonalParameterVisibility } from '../../../types/personalParameter'
import ParameterCategoryIcon from '../components/ParameterCategoryIcon.vue'

interface ParameterForm {
  title: string
  category: PersonalParameterCategory
  visibility: PersonalParameterVisibility
  note: string
  fields: PersonalParameterField[]
  favorite: boolean
}

const categories: Array<{ value: PersonalParameterCategory; label: string }> = [
  { value: 'clothes', label: 'Одежда' },
  { value: 'personal', label: 'Личные' },
  { value: 'other', label: 'Другое' },
]

const templates: Record<PersonalParameterCategory, string[]> = {
  clothes: ['Размер верха', 'Размер брюк', 'Размер обуви'],
  personal: ['Рост', 'Размер кольца', 'Длина стопы'],
  other: ['Параметр'],
}

const { notify } = useNotification()
const items = personalParametersStore.items
const search = ref('')
const categoryFilter = ref<'all' | PersonalParameterCategory>('all')
const visibilityFilter = ref<'all' | PersonalParameterVisibility>('all')
const isEditorOpen = ref(false)
const isDeleteOpen = ref(false)
const isSaving = ref(false)
const isDeleting = ref(false)
const editingItem = ref<PersonalParameterItem | null>(null)
const deletingItem = ref<PersonalParameterItem | null>(null)
const errors = reactive({ title: '', fields: '' })
const saveError = ref('')
const form = reactive<ParameterForm>(emptyForm())

const favoriteCount = computed(() => items.value.filter((item) => item.favorite).length)
const sharedCount = computed(() => items.value.filter((item) => item.visibility === 'shared').length)
const filteredItems = computed(() => {
  const query = normalizeSearch(search.value)
  return items.value.filter((item) => {
    const matchesCategory = categoryFilter.value === 'all' || item.category === categoryFilter.value
    const matchesVisibility = visibilityFilter.value === 'all' || item.visibility === visibilityFilter.value
    const haystack = [item.title, item.note, ...item.fields.flatMap((field) => [field.label, field.value, field.unit])].join(' ')
    return matchesCategory && matchesVisibility && (!query || normalizeSearch(haystack).includes(query))
  })
})

function emptyForm(category: PersonalParameterCategory = 'clothes'): ParameterForm {
  return {
    title: '',
    category,
    visibility: 'private',
    note: '',
    fields: createTemplateFields(category),
    favorite: false,
  }
}

function createTemplateFields(category: PersonalParameterCategory) {
  return templates[category].map((label) => ({ id: crypto.randomUUID(), label, value: '', unit: '' }))
}

function resetForm(next: ParameterForm) {
  Object.assign(form, next)
  errors.title = ''
  errors.fields = ''
  saveError.value = ''
}

function openCreateModal() {
  editingItem.value = null
  resetForm(emptyForm())
  isEditorOpen.value = true
}

function openEditModal(item: PersonalParameterItem) {
  editingItem.value = item
  resetForm({
    title: item.title,
    category: item.category,
    visibility: item.visibility,
    note: item.note,
    fields: item.fields.map((field) => ({ ...field })),
    favorite: item.favorite,
  })
  isEditorOpen.value = true
}

function applyCategoryTemplate(category: PersonalParameterCategory) {
  const hasValues = form.fields.some((field) => field.value.trim())
  if (!hasValues) form.fields = createTemplateFields(category)
}

function addField() {
  if (form.fields.length >= 12) return
  form.fields.push({ id: crypto.randomUUID(), label: '', value: '', unit: '' })
}

function removeField(index: number) {
  if (form.fields.length <= 1) return
  form.fields.splice(index, 1)
}

async function saveItem() {
  errors.title = form.title.trim() ? '' : 'Укажите название карточки'
  const fields = form.fields
    .map((field) => ({ ...field, label: field.label.trim(), value: field.value.trim(), unit: field.unit.trim() }))
    .filter((field) => field.label && field.value)
  errors.fields = fields.length ? '' : 'Заполните хотя бы один параметр и его значение'
  if (errors.title || errors.fields) return

  isSaving.value = true
  saveError.value = ''
  const payload = {
    title: form.title.trim(),
    category: form.category,
    visibility: form.visibility,
    note: form.note.trim(),
    fields,
    favorite: form.favorite,
  }
  const result = editingItem.value
    ? await personalParametersStore.update(editingItem.value.id, payload)
    : await personalParametersStore.create(payload)
  isSaving.value = false

  if (!result.ok) {
    saveError.value = result.message || 'Не удалось сохранить карточку'
    return
  }
  isEditorOpen.value = false
  notify(editingItem.value ? 'Карточка обновлена' : 'Параметры сохранены', 'success')
}

async function toggleFavorite(item: PersonalParameterItem) {
  const result = await personalParametersStore.update(item.id, { favorite: !item.favorite })
  if (!result.ok) notify(result.message || 'Не удалось обновить карточку', 'warning')
}

function openDeleteModal(item: PersonalParameterItem) {
  deletingItem.value = item
  isDeleteOpen.value = true
}

async function confirmDelete() {
  if (!deletingItem.value) return
  isDeleting.value = true
  const result = await personalParametersStore.remove(deletingItem.value.id)
  isDeleting.value = false
  if (!result.ok) return notify(result.message || 'Не удалось удалить карточку', 'warning')
  isDeleteOpen.value = false
  notify('Карточка удалена', 'info')
}

async function copyItem(item: PersonalParameterItem) {
  const text = [item.title, ...item.fields.map((field) => `${field.label}: ${field.value}${field.unit ? ` ${field.unit}` : ''}`), item.note].filter(Boolean).join('\n')
  try {
    await navigator.clipboard.writeText(text)
    notify('Параметры скопированы', 'success')
  } catch {
    notify('Не удалось скопировать параметры', 'warning')
  }
}

function categoryMeta(category: PersonalParameterCategory) {
  return categories.find((item) => item.value === category) || categories.at(-1)!
}

function categoryCount(category: PersonalParameterCategory) {
  return items.value.filter((item) => item.category === category).length
}

function toggleCategory(category: PersonalParameterCategory) {
  categoryFilter.value = categoryFilter.value === category ? 'all' : category
}

function isOwn(item: PersonalParameterItem) {
  return item.ownerId === authStore.currentUserId.value
}

function scopeLabel(item: PersonalParameterItem) {
  if (item.visibility === 'private') return 'Только мне'
  return isOwn(item) ? 'Общая' : 'От участника'
}

function normalizeSearch(value: string) {
  return value.toLocaleLowerCase('ru-RU').replace(/ё/g, 'е').trim()
}
</script>

<style scoped>
.parameters-page{display:grid;gap:14px;width:min(100%,1120px);margin:0 auto;padding:14px}.parameters-hero{display:grid;grid-template-columns:minmax(0,1fr) 390px;align-items:center;min-height:220px;overflow:hidden;padding:22px}.parameters-hero__copy{position:relative;z-index:1}.parameters-hero__copy>span{color:var(--success);font-size:10px;font-weight:850;letter-spacing:.12em;text-transform:uppercase}.parameters-hero h1{margin:4px 0 7px}.parameters-hero p{max-width:560px;margin:0 0 16px;color:var(--text-secondary)}.parameters-hero__art{align-self:stretch;min-height:176px}.parameters-hero__art svg{width:100%;height:100%}.art-panel{fill:var(--control-bg);stroke:var(--border-strong)}.art-muted{stroke:var(--text-muted);stroke-width:4;stroke-linecap:round;opacity:.38}.art-soft{fill:color-mix(in srgb,var(--success) 8%,var(--card-bg));stroke:color-mix(in srgb,var(--success) 26%,var(--border-color))}.art-accent{stroke:var(--success);stroke-width:3;stroke-linecap:round}.art-ruler{stroke:color-mix(in srgb,var(--warning) 75%,var(--text-primary));stroke-width:2;stroke-linecap:round}.art-shirt{fill:color-mix(in srgb,var(--success) 12%,var(--card-bg));stroke:var(--success);stroke-width:2}.art-dot{fill:var(--success)}.art-check{stroke:var(--text-inverse);stroke-width:2;stroke-linecap:round;stroke-linejoin:round}.parameters-summary{display:grid;grid-template-columns:repeat(3,1fr);gap:9px}.parameters-summary article{display:flex;align-items:center;gap:11px;border:1px solid var(--border-color);border-radius:14px;padding:11px 13px;background:var(--card-solid)}.parameters-summary article>span{display:grid;place-items:center;width:38px;height:38px;border-radius:11px;color:var(--success);background:color-mix(in srgb,var(--success) 9%,var(--control-bg));font-size:17px}.parameters-summary small,.parameters-summary strong{display:block}.parameters-summary small{color:var(--text-muted);font-size:9px;text-transform:uppercase}.parameters-summary strong{margin-top:2px;font-size:18px}.parameters-toolbar{display:grid;grid-template-columns:minmax(240px,1fr) 190px 180px auto;align-items:end;gap:8px;padding:10px}.parameters-select,.parameter-field{display:grid;gap:5px}.parameters-select>span,.parameter-field>span{color:var(--text-secondary);font-size:10px;font-weight:750}.parameters-select :deep(.ui-select__trigger),.parameter-field :deep(.ui-select__trigger){width:100%}.category-rail{display:grid;grid-template-columns:repeat(6,1fr);gap:7px}.category-rail button{display:grid;grid-template-columns:34px minmax(0,1fr) auto;align-items:center;gap:7px;min-width:0;border:1px solid var(--border-color);border-radius:13px;padding:8px;color:var(--text-secondary);background:var(--card-solid);text-align:left}.category-rail button:hover,.category-rail button.active{border-color:color-mix(in srgb,var(--success) 35%,var(--border-color));background:color-mix(in srgb,var(--success) 6%,var(--card-solid))}.category-rail button>span{display:grid;place-items:center;width:34px;height:34px;border-radius:10px;color:var(--success);background:color-mix(in srgb,var(--success) 9%,var(--control-bg));padding:6px}.category-rail b{overflow:hidden;font-size:10px;text-overflow:ellipsis;white-space:nowrap}.category-rail small{color:var(--text-muted);font-size:9px}.parameters-grid{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:10px}.parameter-card{--parameter-color:var(--success);display:grid;align-content:start;gap:12px;min-width:0;border:1px solid var(--border-color);border-radius:17px;padding:13px;background:var(--card-solid)}.parameter-card--clothes{--parameter-color:#a78bfa}.parameter-card--personal{--parameter-color:#38bdf8}.parameter-card--home{--parameter-color:#34d399}.parameter-card--devices{--parameter-color:#60a5fa}.parameter-card--vehicle{--parameter-color:#f59e0b}.parameter-card--other{--parameter-color:#94a3b8}.parameter-card>header{display:grid;grid-template-columns:44px minmax(0,1fr) 30px;align-items:center;gap:10px}.parameter-card__icon{display:grid;place-items:center;width:44px;height:44px;border-radius:13px;padding:8px;color:var(--parameter-color);background:color-mix(in srgb,var(--parameter-color) 10%,var(--control-bg))}.parameter-card header small{color:var(--parameter-color);font-size:8px;font-weight:800;letter-spacing:.09em;text-transform:uppercase}.parameter-card h2{overflow:hidden;margin:2px 0 0;font-size:15px;text-overflow:ellipsis;white-space:nowrap}.parameter-card__favorite{display:grid;place-items:center;width:30px;height:30px;border:0;border-radius:9px;color:var(--text-muted);background:transparent;font-size:15px}.parameter-card__favorite.active{color:#fbbf24;background:color-mix(in srgb,#fbbf24 10%,var(--control-bg))}.parameter-card__favorite.active :deep(svg){fill:currentColor}.parameter-values{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:6px}.parameter-values>div{min-width:0;border:1px solid var(--border-color);border-radius:10px;padding:8px 9px;background:var(--control-bg)}.parameter-values span,.parameter-values strong{display:block;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}.parameter-values span{color:var(--text-muted);font-size:8px;text-transform:uppercase}.parameter-values strong{margin-top:2px;font-size:13px}.parameter-values strong small{color:var(--text-muted);font-size:9px;font-weight:600}.parameter-card>p{display:-webkit-box;overflow:hidden;margin:0;color:var(--text-muted);font-size:10px;line-height:1.45;-webkit-box-orient:vertical;-webkit-line-clamp:2}.parameter-card>footer{display:flex;align-items:center;justify-content:space-between;gap:8px;margin-top:auto;border-top:1px solid var(--border-color);padding-top:10px}.parameter-card__scope{display:flex;align-items:center;gap:5px;color:var(--text-muted);font-size:9px}.parameter-card__scope.shared{color:var(--success)}.parameter-card__scope :deep(svg){font-size:11px}.parameter-card footer>div{display:flex;gap:3px}.parameters-empty{display:grid;justify-items:center;min-height:320px;padding:35px;text-align:center}.parameters-empty svg{width:150px;color:var(--border-strong);stroke:currentColor;stroke-width:2;stroke-linecap:round;stroke-linejoin:round}.parameters-empty svg circle:last-of-type{color:var(--success)}.parameters-empty strong{font-size:17px}.parameters-empty p{margin:5px 0 14px;color:var(--text-muted)}.parameter-editor{display:grid;gap:13px}.parameter-editor__intro{display:flex;align-items:center;gap:11px;border:1px solid color-mix(in srgb,var(--success) 18%,var(--border-color));border-radius:14px;padding:11px;background:color-mix(in srgb,var(--success) 5%,var(--control-bg))}.parameter-editor__intro>span{display:grid;place-items:center;width:48px;height:48px;border-radius:13px;padding:9px;color:var(--success);background:var(--card-solid)}.parameter-editor__intro strong,.parameter-editor__intro small{display:block}.parameter-editor__intro small{margin-top:3px;color:var(--text-muted)}.parameter-editor__main{display:grid;grid-template-columns:minmax(0,1fr) 190px;gap:9px}.parameter-field--wide{grid-column:1/-1}.parameter-editor__values{display:grid;gap:8px;border:1px solid var(--border-color);border-radius:14px;padding:11px;background:var(--card-soft)}.parameter-editor__values>header{display:flex;align-items:center;justify-content:space-between;gap:12px}.parameter-editor__values>header span,.parameter-editor__values>header small{display:block}.parameter-editor__values>header span{font-weight:800}.parameter-editor__values>header small{margin-top:2px;color:var(--text-muted);font-size:9px}.parameter-editor__rows{display:grid;gap:6px}.parameter-editor__row{display:grid;grid-template-columns:minmax(130px,1fr) minmax(120px,1fr) 90px 30px;align-items:end;gap:6px}.parameter-editor__favorite{display:flex;align-items:center;gap:9px;cursor:pointer}.parameter-editor__favorite>button{display:grid;place-items:center;width:38px;height:38px;border:1px solid var(--border-color);border-radius:11px;color:var(--text-muted);background:var(--control-bg)}.parameter-editor__favorite>button.active{color:#fbbf24;border-color:color-mix(in srgb,#fbbf24 28%,var(--border-color));background:color-mix(in srgb,#fbbf24 8%,var(--control-bg))}.parameter-editor__favorite>button.active :deep(svg){fill:currentColor}.parameter-editor__favorite strong,.parameter-editor__favorite small{display:block}.parameter-editor__favorite small{color:var(--text-muted);font-size:9px}.parameter-editor__error{margin:0;border-radius:9px;padding:8px 9px;color:var(--danger);background:color-mix(in srgb,var(--danger) 8%,var(--control-bg));font-size:10px}.parameter-editor>footer{display:flex;justify-content:flex-end;gap:7px;border-top:1px solid var(--border-color);padding-top:12px}.parameter-delete{display:grid;justify-items:center;gap:7px;text-align:center}.parameter-delete>span{display:grid;place-items:center;width:52px;height:52px;border-radius:15px;color:var(--danger);background:color-mix(in srgb,var(--danger) 9%,var(--control-bg));font-size:22px}.parameter-delete>p{margin:0;color:var(--text-muted)}.parameter-delete>footer{display:flex;justify-content:center;gap:7px;width:100%;margin-top:6px;border-top:1px solid var(--border-color);padding-top:12px}@media(max-width:1000px){.parameters-hero{grid-template-columns:minmax(0,1fr) 300px}.parameters-toolbar{grid-template-columns:repeat(2,minmax(0,1fr))}.parameters-toolbar>.ui-input{grid-column:1/-1}.category-rail{grid-template-columns:repeat(3,1fr)}.parameters-grid{grid-template-columns:repeat(2,minmax(0,1fr))}}@media(max-width:720px){.parameters-page{gap:10px;padding:10px}.parameters-hero{grid-template-columns:1fr;min-height:0;padding:15px}.parameters-hero__art{display:none}.parameters-summary{grid-template-columns:repeat(3,1fr);gap:5px}.parameters-summary article{display:grid;justify-items:center;gap:5px;padding:8px;text-align:center}.parameters-summary article>span{width:32px;height:32px}.parameters-toolbar,.parameters-grid{grid-template-columns:1fr}.parameters-toolbar>.ui-input{grid-column:auto}.category-rail{display:flex;overflow-x:auto;padding-bottom:2px;scrollbar-width:none}.category-rail button{flex:0 0 128px}.parameter-editor__main,.parameter-editor__row{grid-template-columns:1fr}.parameter-field--wide{grid-column:auto}.parameter-editor__row{position:relative;border-top:1px solid var(--border-color);padding-top:8px}.parameter-editor__row:first-child{border-top:0;padding-top:0}.parameter-editor__row>.ui-icon-button{position:absolute;right:0;top:7px}.parameter-editor__row:first-child>.ui-icon-button{top:22px}}@media(max-width:430px){.parameters-summary small{max-width:72px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}.parameter-values{grid-template-columns:1fr}.parameter-card>footer{align-items:flex-end}.parameter-editor>footer,.parameter-delete>footer{display:grid;grid-template-columns:1fr 1fr}.parameter-editor>footer :deep(.ui-button),.parameter-delete>footer :deep(.ui-button){width:100%}}
.category-rail{grid-template-columns:repeat(3,1fr)}
.parameters-hero__art{position:relative;overflow:hidden;border:1px solid color-mix(in srgb,var(--success) 15%,var(--border-color));border-radius:18px;background:#0b0e0c;isolation:isolate}
.parameters-hero__art::after{position:absolute;inset:0;background:linear-gradient(90deg,color-mix(in srgb,var(--panel-bg) 92%,transparent),transparent 32%),linear-gradient(0deg,color-mix(in srgb,var(--panel-bg) 28%,transparent),transparent 45%);content:"";pointer-events:none}
.parameters-hero__art img{display:block;width:100%;height:100%;object-fit:cover;object-position:58% center;transform:scale(1.02)}
@media(max-width:720px){.parameters-hero__art{display:block;height:132px;margin-top:2px}.parameters-hero__art::after{background:linear-gradient(90deg,color-mix(in srgb,var(--panel-bg) 55%,transparent),transparent 34%)}.parameters-hero__art img{object-position:62% center}}
.parameters-hero{position:relative;display:grid;grid-template-columns:1fr;min-height:158px;overflow:hidden;padding:24px 22px;background:linear-gradient(115deg,color-mix(in srgb,var(--card-solid) 96%,#000),color-mix(in srgb,var(--success) 7%,var(--panel-bg)))}.parameters-hero::before{position:absolute;right:-70px;top:-150px;width:430px;height:430px;border:1px solid color-mix(in srgb,var(--success) 14%,transparent);border-radius:50%;background:radial-gradient(circle,color-mix(in srgb,var(--success) 11%,transparent),transparent 68%);content:''}.parameters-hero::after{position:absolute;inset:0 0 0 48%;background-image:linear-gradient(120deg,transparent 48%,color-mix(in srgb,var(--success) 6%,transparent) 49%,transparent 50%),linear-gradient(60deg,transparent 48%,color-mix(in srgb,var(--success) 4%,transparent) 49%,transparent 50%);background-size:58px 58px;content:'';opacity:.45;mask-image:linear-gradient(90deg,transparent,#000)}.parameters-hero__copy{position:relative;z-index:2}.parameters-hero h1{font-size:clamp(25px,3vw,34px);letter-spacing:-.035em}.parameters-hero p{margin-bottom:14px}.parameters-hero__copy::after{display:block;width:42px;height:2px;margin-top:15px;border-radius:999px;background:linear-gradient(90deg,var(--success),transparent);content:''}
@media(max-width:720px){.parameters-hero{min-height:0;padding:15px}}
.parameters-hero{grid-template-columns:minmax(0,1fr) auto}.parameters-hero::before{right:-160px;top:-210px;width:390px;height:390px;opacity:.55}.parameters-hero::after{inset:0 0 0 58%;opacity:.28}.parameters-hero__actions{position:relative;z-index:2;display:flex;padding:6px;border:1px solid color-mix(in srgb,var(--success) 10%,var(--border-color));border-radius:999px;background:color-mix(in srgb,var(--panel-bg) 70%,transparent);box-shadow:0 18px 50px rgba(0,0,0,.18);backdrop-filter:blur(12px)}
@media(max-width:720px){.parameters-hero{grid-template-columns:1fr}.parameters-hero__actions{display:grid;border-radius:16px}.parameters-hero__actions :deep(.ui-button){width:100%}}
</style>
