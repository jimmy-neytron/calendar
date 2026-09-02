<template>
  <section class="meals-page">
    <UiPageHeader title="Питание" eyebrow="Меню недели" description="Планируй блюда, считай известные калории и собирай продукты на неделю.">
      <template #actions>
        <UiButton variant="secondary" icon="left" icon-only title="Предыдущая неделя" @click="shiftWeek(-1)" />
        <strong class="week-label">{{ weekLabel }}</strong>
        <UiButton variant="secondary" icon="right" icon-only title="Следующая неделя" @click="shiftWeek(1)" />
      </template>
    </UiPageHeader>

    <nav class="meals-tabs" aria-label="Разделы питания">
      <button v-for="tab in tabs" :key="tab.id" :class="{ active: activeTab === tab.id }" @click="activeTab = tab.id">
        {{ tab.label }} <span>{{ tab.count }}</span>
      </button>
    </nav>

    <div v-if="mealPlanStore.loading.value && activeTab !== 'recipes'" class="meals-loading panel">Загружаем меню…</div>
    <div v-else-if="loadError && activeTab !== 'recipes'" class="meals-error panel">
      <strong>Не удалось загрузить питание</strong>
      <span>{{ loadError }}</span>
      <UiButton variant="secondary" icon="refresh" @click="loadCurrentWeek">Повторить</UiButton>
    </div>

    <template v-else-if="draftWeek || activeTab === 'recipes'">
      <section v-if="activeTab === 'week'" class="week-view">
        <div class="week-toolbar panel">
          <label>
            <span>Цель на день</span>
            <div><input v-model="calorieTargetInput" type="text" inputmode="decimal" placeholder="Не задана"><b>ккал</b></div>
          </label>
          <div class="week-toolbar__summary">
            <div><strong>{{ plannedSlots.length }}</strong><span>блюд в плане</span></div>
            <p>Нажми на ячейку, чтобы выбрать или заменить блюдо.</p>
          </div>
          <UiButton variant="secondary" icon="copy" @click="copyPreviousWeek">Повторить прошлую неделю</UiButton>
          <UiButton icon="check" :loading="mealPlanStore.saving.value" :disabled="!isDirty" @click="savePlan">
            {{ isDirty ? 'Сохранить неделю' : 'Сохранено' }}
          </UiButton>
        </div>

        <MealWeekBoard
          :days="weekDaysView"
          @select="openPicker"
          @remove="removeSlot"
        />
      </section>

      <MealRecipeLibrary
        v-else-if="activeTab === 'recipes'"
        :recipes="mealPlanStore.availableRecipes.value"
        :is-admin="authStore.isAdmin.value"
        @create="openRecipeEditor()"
        @edit="openRecipeEditor"
        @copy="copyPopularRecipe"
        @remove="confirmRemoveRecipe"
        @shopping="activeTab = 'shopping'"
      />

      <MealCostPlanner
        v-else-if="draftWeek"
        :week="draftWeek"
        :week-start="selectedWeekStart"
        :week-label="weekLabel"
        :days="days"
        :pricing-enabled="authStore.isAdmin.value"
        :can-add="canAddShoppingItem"
        :shopping-min-date="shoppingMinDate"
        :saving="mealPlanStore.saving.value"
        @add="openShoppingEditor"
        @plan="activeTab = 'week'"
      >
        <template #extra="{ period }">
          <MealShoppingExtras
            :items="draftWeek.shoppingItems.filter(item => period === 'week' || item.date === period)"
            :saving="mealPlanStore.saving.value"
            @remove="removeManualShoppingItem"
          />
        </template>
      </MealCostPlanner>
    </template>

    <UiModal v-model="pickerOpen" :title="pickerTitle" eyebrow="Меню недели" width="640px">
      <div class="recipe-picker">
        <UiInput v-model="recipeQuery" autofocus placeholder="Найти своё блюдо" />
        <div v-if="filteredPickerRecipes.length" class="recipe-picker__list">
          <button v-for="recipe in filteredPickerRecipes" :key="recipe.id" type="button" @click="assignRecipe(recipe)">
            <span><b>{{ recipe.title }}</b><small>{{ mealTypeLabel(recipe.mealType) }} · {{ recipeNutritionLabel(recipe) }}</small></span>
            <UiIcon name="right" />
          </button>
        </div>
        <p v-else>Подходящих блюд пока нет.</p>
        <UiButton variant="secondary" icon="plus" @click="createRecipeForSlot">Создать новое блюдо</UiButton>
      </div>
    </UiModal>

    <MealRecipeModal
      v-model="recipeEditorOpen"
      :recipe="editingRecipe"
      :copying="copyingPopularRecipe"
      :saving="mealPlanStore.saving.value"
      :custom-foods="mealPlanStore.customFoods.value"
      @save="saveRecipe"
      @save-product="saveMealProduct"
    />
    <MealShoppingItemModal
      v-model="shoppingItemEditorOpen"
      :default-date="shoppingDefaultDate"
      :min-date="shoppingMinDate"
      :max-date="shoppingMaxDate"
      :saving="mealPlanStore.saving.value"
      @add="addManualShoppingItem"
    />
  </section>
</template>

<script setup lang="ts">
import { computed, defineAsyncComponent, onMounted, ref, watch } from 'vue'
import { workspaceStore } from '../../../stores/workspace.store.js'
import { authStore } from '../../../stores/auth.store.js'
import { useNotification } from '../../../composables/ui/useNotification.js'
import UiButton from '../../../components/ui/UiButton.vue'
import UiIcon from '../../../components/ui/UiIcon.vue'
import UiInput from '../../../components/ui/UiInput.vue'
import UiModal from '../../../components/ui/UiModal.vue'
import UiPageHeader from '../../../components/ui/UiPageHeader.vue'
import MealRecipeLibrary from '../components/MealRecipeLibrary.vue'
import MealRecipeModal from '../components/MealRecipeModal.vue'
import MealShoppingItemModal from '../components/MealShoppingItemModal.vue'
import MealShoppingExtras from '../components/MealShoppingExtras.vue'
import { getWeekRequirements } from '../../store-catalog/services/storeCatalog.service'
import MealWeekBoard, { type MealWeekDayView } from '../components/MealWeekBoard.vue'
import { getMealWeek } from '../api/meals.api'
import { mealPlanStore } from '../stores/mealPlan.store'
import { addMealSlotSnapshots, cloneMealIngredients, cloneMealWeek } from '../services/mealPlan.service'
import { getSlotNutrition, parseMealDecimal, sumNutrition } from '../services/mealNutrition.service'
import type { MealProduct, MealProductDraft, MealRecipe, MealShoppingItem, MealType, MealWeek } from '../types/meals.types'

const mealTypes: Array<{ id: MealType; label: string }> = [
  { id: 'breakfast', label: 'Завтрак' },
  { id: 'lunch', label: 'Обед' },
  { id: 'dinner', label: 'Ужин' },
  { id: 'snack', label: 'Перекус' },
]
const MealCostPlanner = defineAsyncComponent(() => import('../components/MealCostPlanner.vue'))
const activeTab = ref<'week' | 'recipes' | 'shopping'>('week')
const selectedWeekStart = ref(getMondayKey(new Date()))
const draftWeek = ref<MealWeek | null>(null)
const calorieTargetInput = ref('')
const isDirty = ref(false)
const loadError = ref('')
const pickerOpen = ref(false)
const pickerDate = ref('')
const pickerMealType = ref<MealType>('dinner')
const recipeQuery = ref('')
const recipeEditorOpen = ref(false)
const editingRecipe = ref<MealRecipe | null>(null)
const copyingPopularRecipe = ref(false)
const createForPendingSlot = ref(false)
const shoppingItemEditorOpen = ref(false)
const shoppingRequestedDate = ref('')
const { notify } = useNotification()

const days = computed(() => Array.from({ length: 7 }, (_, index) => {
  const key = addDays(selectedWeekStart.value, index)
  const date = parseDateKey(key)
  return {
    key,
    weekday: new Intl.DateTimeFormat('ru-RU', { weekday: 'short' }).format(date).replace('.', ''),
    dayLabel: new Intl.DateTimeFormat('ru-RU', { day: 'numeric', month: 'short' }).format(date).replace('.', ''),
    isToday: key === toDateKey(new Date()),
  }
}))
const weekLabel = computed(() => {
  const first = parseDateKey(selectedWeekStart.value)
  const last = parseDateKey(addDays(selectedWeekStart.value, 6))
  const firstLabel = new Intl.DateTimeFormat('ru-RU', { day: 'numeric', month: 'short' }).format(first)
  const lastLabel = new Intl.DateTimeFormat('ru-RU', { day: 'numeric', month: 'short', year: 'numeric' }).format(last)
  return `${firstLabel} — ${lastLabel}`
})
const tabs = computed(() => [
  { id: 'week' as const, label: 'Неделя', count: plannedSlots.value.length },
  { id: 'recipes' as const, label: 'Блюда', count: mealPlanStore.availableRecipes.value.length },
  { id: 'shopping' as const, label: 'Закупка', count: getWeekRequirements(draftWeek.value, selectedWeekStart.value, mealPlanStore.recipeById.value).length },
])
const filteredPickerRecipes = computed(() => {
  const query = normalize(recipeQuery.value)
  return mealPlanStore.availableRecipes.value
    .filter((recipe) => !query || normalize(recipe.title).includes(query))
    .sort((first, second) => Number(second.mealType === pickerMealType.value) - Number(first.mealType === pickerMealType.value))
})
const plannedSlots = computed(() => {
  if (!draftWeek.value) return []
  return Object.values(draftWeek.value.plan).flatMap((day) => Object.values(day).filter(Boolean))
})
const todayKey = computed(() => toDateKey(new Date()))
const shoppingMaxDate = computed(() => addDays(selectedWeekStart.value, 6))
const shoppingMinDate = computed(() => selectedWeekStart.value > todayKey.value ? selectedWeekStart.value : todayKey.value)
const canAddShoppingItem = computed(() => shoppingMinDate.value <= shoppingMaxDate.value)
const shoppingDefaultDate = computed(() => shoppingRequestedDate.value >= shoppingMinDate.value && shoppingRequestedDate.value <= shoppingMaxDate.value
  ? shoppingRequestedDate.value : canAddShoppingItem.value ? shoppingMinDate.value : selectedWeekStart.value)
const pickerTitle = computed(() => `${mealTypeLabel(pickerMealType.value)} · ${formatPickerDate(pickerDate.value)}`)
const weekDaysView = computed<MealWeekDayView[]>(() => days.value.map((day) => ({
  ...day,
  caloriesLabel: caloriesText(day.key),
  missingCount: dailyStats(day.key).missing,
  slots: mealTypes.map((mealType) => {
    const recipe = slotRecipe(day.key, mealType.id)
    return {
      mealType: mealType.id,
      label: mealType.label,
      recipe: recipe ? { title: recipe.title, nutritionLabel: recipeNutritionLabel(recipe) } : null,
    }
  }),
})))

watch(calorieTargetInput, (value) => {
  if (!draftWeek.value) return
  const parsedTarget = parseMealDecimal(value)
  const target = parsedTarget == null ? null : Math.min(20000, Math.max(0, parsedTarget))
  if (draftWeek.value.calorieTarget === target) return
  draftWeek.value.calorieTarget = target
  isDirty.value = true
})

onMounted(loadCurrentWeek)

async function loadCurrentWeek() {
  try {
    const result = await mealPlanStore.load(selectedWeekStart.value)
    loadError.value = result.ok ? '' : result.message || 'Не удалось загрузить питание'
    if (!result.ok || !mealPlanStore.week.value) return
    draftWeek.value = cloneMealWeek(mealPlanStore.week.value)
    calorieTargetInput.value = draftWeek.value.calorieTarget == null ? '' : String(draftWeek.value.calorieTarget)
    isDirty.value = false
  } catch (error) {
    loadError.value = error instanceof Error ? error.message : 'Не удалось подготовить меню недели'
  }
}

async function shiftWeek(delta: number) {
  if (isDirty.value && !window.confirm('Перейти к другой неделе без сохранения изменений?')) return
  selectedWeekStart.value = addDays(selectedWeekStart.value, delta * 7)
  await loadCurrentWeek()
}

function openPicker(date: string, mealType: MealType) {
  pickerDate.value = date
  pickerMealType.value = mealType
  recipeQuery.value = ''
  pickerOpen.value = true
}

function assignRecipe(recipe: MealRecipe) {
  if (!draftWeek.value || !pickerDate.value) return
  draftWeek.value.plan[pickerDate.value] ||= {}
  draftWeek.value.plan[pickerDate.value][pickerMealType.value] = {
    recipeId: recipe.id,
    servings: 1,
    recipeTitle: recipe.title,
    recipeServings: recipe.servings,
    ingredients: cloneMealIngredients(recipe.ingredients),
  }
  isDirty.value = true
  pickerOpen.value = false
}

function removeSlot(date: string, mealType: MealType) {
  if (!draftWeek.value?.plan[date]) return
  delete draftWeek.value.plan[date][mealType]
  if (!Object.keys(draftWeek.value.plan[date]).length) delete draftWeek.value.plan[date]
  isDirty.value = true
}

async function savePlan() {
  if (!draftWeek.value || mealPlanStore.saving.value) return false
  const weekWithSnapshots = addMealSlotSnapshots(draftWeek.value, mealPlanStore.recipeById.value)
  const result = await mealPlanStore.saveWeek(weekWithSnapshots)
  notify(result.ok ? 'Меню недели сохранено' : result.message, result.ok ? 'success' : 'danger')
  if (result.ok && mealPlanStore.week.value) {
    draftWeek.value = cloneMealWeek(mealPlanStore.week.value)
    isDirty.value = false
  }
  return result.ok
}

async function addManualShoppingItem(item: MealShoppingItem) {
  if (!draftWeek.value || mealPlanStore.saving.value) return
  const wasDirty = isDirty.value
  draftWeek.value.shoppingItems.push(item)
  isDirty.value = true
  if (await savePlan()) shoppingItemEditorOpen.value = false
  else {
    draftWeek.value.shoppingItems = draftWeek.value.shoppingItems.filter(value => value.id !== item.id)
    isDirty.value = wasDirty
  }
}

async function removeManualShoppingItem(id: string) {
  if (!draftWeek.value || mealPlanStore.saving.value) return
  const previousItems = draftWeek.value.shoppingItems
  const wasDirty = isDirty.value
  draftWeek.value.shoppingItems = draftWeek.value.shoppingItems.filter((item) => item.id !== id)
  isDirty.value = true
  if (!await savePlan()) {
    draftWeek.value.shoppingItems = previousItems
    isDirty.value = wasDirty
  }
}

async function copyPreviousWeek() {
  if (!draftWeek.value) return
  try {
    const workspaceId = workspaceStore.activeWorkspaceId.value
    const previousStart = addDays(selectedWeekStart.value, -7)
    const previous = await getMealWeek(workspaceId, previousStart)
    if (!previous || !Object.keys(previous.plan).length) {
      notify('В прошлой неделе нет меню', 'info')
      return
    }
    const nextPlan: MealWeek['plan'] = {}
    const previousDraft = cloneMealWeek(previous)
    Object.entries(previousDraft.plan).forEach(([date, day]) => { nextPlan[addDays(date, 7)] = day })
    draftWeek.value.plan = nextPlan
    if (draftWeek.value.calorieTarget == null && previous.calorieTarget != null) {
      draftWeek.value.calorieTarget = previous.calorieTarget
      calorieTargetInput.value = String(previous.calorieTarget)
    }
    isDirty.value = true
    notify('Прошлая неделя скопирована', 'success')
  } catch (error) {
    notify(error instanceof Error ? error.message : 'Не удалось скопировать неделю', 'danger')
  }
}

function openRecipeEditor(recipe: MealRecipe | null = null) {
  editingRecipe.value = recipe
  copyingPopularRecipe.value = false
  createForPendingSlot.value = false
  recipeEditorOpen.value = true
}

function copyPopularRecipe(recipe: MealRecipe) {
  editingRecipe.value = recipe
  copyingPopularRecipe.value = true
  createForPendingSlot.value = false
  recipeEditorOpen.value = true
}

function createRecipeForSlot() {
  editingRecipe.value = null
  copyingPopularRecipe.value = false
  createForPendingSlot.value = true
  pickerOpen.value = false
  recipeEditorOpen.value = true
}

async function saveRecipe(draft: Omit<MealRecipe, 'id' | 'workspaceId' | 'archivedAt' | 'createdAt' | 'updatedAt'>) {
  const workspaceId = workspaceStore.activeWorkspaceId.value
  const now = new Date().toISOString()
  const recipe: MealRecipe = {
    ...draft,
    id: editingRecipe.value && !copyingPopularRecipe.value ? editingRecipe.value.id : crypto.randomUUID(),
    workspaceId,
    archivedAt: null,
    createdAt: editingRecipe.value && !copyingPopularRecipe.value ? editingRecipe.value.createdAt : now,
    updatedAt: now,
  }
  const result = await mealPlanStore.saveRecipe(recipe)
  notify(result.ok ? 'Блюдо сохранено' : result.message, result.ok ? 'success' : 'danger')
  if (!result.ok || !result.recipe) return
  recipeEditorOpen.value = false
  if (createForPendingSlot.value) assignRecipe(result.recipe)
}

async function confirmRemoveRecipe(recipe: MealRecipe) {
  if (!window.confirm(`Убрать блюдо «${recipe.title}» из справочника? В сохранённых неделях оно останется.`)) return
  const result = await mealPlanStore.removeRecipe(recipe.id)
  notify(result.ok ? 'Блюдо убрано из справочника' : result.message, result.ok ? 'info' : 'danger')
}

function slotRecipe(date: string, mealType: MealType) {
  const recipeId = draftWeek.value?.plan[date]?.[mealType]?.recipeId
  return recipeId ? mealPlanStore.recipeById.value.get(recipeId) || null : null
}

function dailyStats(date: string) {
  const slots = Object.values(draftWeek.value?.plan[date] || {}).filter(Boolean)
  const values = slots.flatMap((slot) => {
    const recipe = mealPlanStore.recipeById.value.get(slot.recipeId)
    return recipe ? [getSlotNutrition(recipe, slot)] : []
  })
  return {
    nutrition: sumNutrition(values),
    missing: slots.filter((slot) => mealPlanStore.recipeById.value.get(slot.recipeId)?.nutritionPerServing.calories == null).length,
  }
}

function caloriesText(date: string) {
  const calories = dailyStats(date).nutrition.calories
  return calories == null ? 'Калории не указаны' : `${Math.round(calories)} ккал`
}

function recipeNutritionLabel(recipe?: MealRecipe | null) {
  return recipe?.nutritionPerServing.calories == null
    ? 'Калории не указаны'
    : `${Math.round(recipe.nutritionPerServing.calories)} ккал / порция`
}

function mealTypeLabel(type: MealType) {
  return mealTypes.find((item) => item.id === type)?.label || 'Блюдо'
}

function formatPickerDate(value: string) {
  return value ? new Intl.DateTimeFormat('ru-RU', { weekday: 'long', day: 'numeric', month: 'long' }).format(parseDateKey(value)) : ''
}

async function saveMealProduct(draft: MealProductDraft) {
  const now = new Date().toISOString()
  const product: MealProduct = {
    ...draft,
    workspaceId: workspaceStore.activeWorkspaceId.value,
    archivedAt: null,
    createdAt: now,
    updatedAt: now,
  }
  const result = await mealPlanStore.saveProduct(product)
  notify(
    result.ok ? `Продукт «${product.name}» добавлен в общий справочник` : result.message,
    result.ok ? 'success' : 'danger',
  )
}

function openShoppingEditor(period: string) {
  shoppingRequestedDate.value = period
  shoppingItemEditorOpen.value = true
}

function getMondayKey(date: Date) {
  const copy = new Date(date.getFullYear(), date.getMonth(), date.getDate())
  const day = copy.getDay() || 7
  copy.setDate(copy.getDate() - day + 1)
  return toDateKey(copy)
}

function addDays(dateKey: string, daysCount: number) {
  const date = parseDateKey(dateKey)
  date.setDate(date.getDate() + daysCount)
  return toDateKey(date)
}

function parseDateKey(value: string) {
  const [year, month, day] = value.split('-').map(Number)
  return new Date(year, month - 1, day, 12)
}

function toDateKey(date: Date) {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`
}

function normalize(value: string) {
  return value.toLocaleLowerCase('ru-RU').replace(/ё/g, 'е').trim()
}
</script>

<style scoped>
.meals-page{display:grid;gap:16px;width:min(100%,1320px);margin:0 auto;padding-bottom:24px}
.week-label{min-width:180px;text-align:center;font-size:12px}
.meals-tabs{display:flex;gap:5px;border-bottom:1px solid var(--border-color);padding:0 2px}
.meals-tabs button{border:0;border-bottom:2px solid transparent;padding:10px 12px;color:var(--text-muted);background:transparent;font-size:11px;font-weight:750}
.meals-tabs button.active{border-color:var(--accent);color:var(--text-primary)}
.meals-tabs span{margin-left:4px;border-radius:99px;padding:2px 5px;background:var(--control-bg);font-size:8px}
.meals-loading,.meals-error{min-height:280px;display:grid;place-items:center;padding:30px;color:var(--text-muted)}
.meals-error{align-content:center;gap:8px}.meals-error strong{color:var(--danger)}
.week-view{display:grid;gap:14px}
.week-toolbar{display:grid;grid-template-columns:170px 1fr auto auto;align-items:end;gap:12px;padding:13px}
.week-toolbar label{display:grid;gap:4px}.week-toolbar label>span{color:var(--text-muted);font-size:9px}
.week-toolbar label>div{display:flex;align-items:center;border:1px solid var(--border-color);border-radius:10px;background:var(--field-bg)}
.week-toolbar input{min-width:0;width:100%;height:34px;border:0;padding:0 10px;color:var(--text-primary);background:transparent;outline:0}
.week-toolbar b{padding-right:8px;color:var(--text-muted);font-size:9px}
.week-toolbar__summary{display:flex;align-items:center;gap:14px;min-width:0}
.week-toolbar__summary>div{display:flex;align-items:baseline;gap:5px;white-space:nowrap}
.week-toolbar__summary strong{color:var(--accent);font-size:19px}
.week-toolbar__summary span{color:var(--text-secondary);font-size:9px;font-weight:700}
.week-toolbar__summary p{margin:0;color:var(--text-muted);font-size:9px;line-height:1.4}
.recipe-picker{display:grid;gap:12px}
.recipe-picker__list{display:grid;gap:6px;max-height:410px;overflow:auto}
.recipe-picker__list button{display:flex;align-items:center;justify-content:space-between;gap:10px;border:1px solid var(--border-color);border-radius:12px;padding:10px;color:var(--text-primary);background:var(--card-soft);text-align:left}
.recipe-picker__list b,.recipe-picker__list small{display:block}.recipe-picker__list b{font-size:11px}
.recipe-picker__list small{margin-top:3px;color:var(--text-muted);font-size:8px}
@media(max-width:1050px){.week-toolbar{grid-template-columns:160px 1fr}.week-toolbar :deep(.ui-button){width:100%}.week-toolbar__summary{align-items:flex-start;flex-direction:column;gap:3px}}
@media(max-width:680px){.week-label{min-width:0}.week-toolbar{grid-template-columns:1fr}.meals-tabs{overflow-x:auto}.meals-tabs button{white-space:nowrap}.week-toolbar__summary{padding:2px 0}}
</style>
