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
          <p>Цель и пищевая ценность необязательны. Блюда без данных всё равно остаются в плане.</p>
          <UiButton variant="secondary" icon="copy" @click="copyPreviousWeek">Повторить прошлую неделю</UiButton>
          <UiButton icon="check" :loading="mealPlanStore.saving.value" :disabled="!isDirty" @click="savePlan">
            {{ isDirty ? 'Сохранить неделю' : 'Сохранено' }}
          </UiButton>
        </div>

        <div class="week-grid">
          <article v-for="day in days" :key="day.key" class="day-card panel" :class="{ today: day.isToday }">
            <header>
              <div><span>{{ day.weekday }}</span><strong>{{ day.dayLabel }}</strong></div>
              <div class="day-nutrition">
                <b>{{ caloriesText(day.key) }}</b>
                <small v-if="dailyStats(day.key).missing">{{ dailyStats(day.key).missing }} без данных</small>
                <small v-else-if="draftWeek.calorieTarget">из {{ Math.round(draftWeek.calorieTarget) }} ккал</small>
              </div>
            </header>

            <div class="meal-slots">
              <div v-for="mealType in mealTypes" :key="mealType.id" class="meal-slot">
                <span>{{ mealType.label }}</span>
                <button
                  v-if="slotRecipe(day.key, mealType.id)"
                  class="meal-slot__filled"
                  type="button"
                  @click="openPicker(day.key, mealType.id)"
                >
                  <b>{{ slotRecipe(day.key, mealType.id)?.title }}</b>
                  <small>{{ recipeNutritionLabel(slotRecipe(day.key, mealType.id)) }}</small>
                  <i @click.stop="removeSlot(day.key, mealType.id)">×</i>
                </button>
                <button v-else class="meal-slot__empty" type="button" @click="openPicker(day.key, mealType.id)">＋ Добавить</button>
              </div>
            </div>
          </article>
        </div>
      </section>

      <section v-else-if="activeTab === 'recipes'" class="recipes-view">
        <header>
          <div><h2>Справочник блюд</h2><p>Популярные блюда доступны сразу. Свои рецепты можно добавлять без обязательных калорий и БЖУ.</p></div>
          <div class="recipe-library-actions">
            <UiInput v-model="libraryQuery" placeholder="Найти блюдо" />
            <UiButton icon="plus" @click="openRecipeEditor()">Новое блюдо</UiButton>
          </div>
        </header>
        <div class="recipe-grid">
          <article v-for="recipe in visibleLibraryRecipes" :key="recipe.id" class="recipe-card panel">
            <div class="recipe-card__visual" :style="recipe.imageUrl ? { backgroundImage: `url(${recipe.imageUrl})` } : {}">
              <UiIcon v-if="!recipe.imageUrl" name="utensils" />
            </div>
            <div class="recipe-card__copy">
              <span>{{ isPopularRecipe(recipe) ? 'Популярное · ' : '' }}{{ mealTypeLabel(recipe.mealType) }}</span>
              <h3>{{ recipe.title }}</h3>
              <p>{{ recipe.ingredients.length ? `${recipe.ingredients.length} ингредиентов` : 'Состав не указан' }}</p>
              <div><b>{{ recipeNutritionLabel(recipe) }}</b><small>{{ recipe.servings }} порц.</small></div>
            </div>
            <footer>
              <UiButton v-if="isPopularRecipe(recipe)" variant="secondary" icon="plus" @click="copyPopularRecipe(recipe)">Сохранить себе</UiButton>
              <template v-else>
                <UiButton variant="secondary" icon="edit" @click="openRecipeEditor(recipe)">Изменить</UiButton>
                <UiIconButton icon="trash" label="Удалить блюдо" variant="danger" @click="confirmRemoveRecipe(recipe)" />
              </template>
            </footer>
          </article>
        </div>
        <div v-if="!visibleLibraryRecipes.length" class="empty-recipes panel">
          <UiIcon name="search" />
          <h3>Блюдо не найдено</h3>
          <p>Измени запрос или создай собственный рецепт.</p>
        </div>
      </section>

      <section v-else class="shopping-view">
        <header><div><h2>Продукты на неделю</h2><p>Список автоматически собирается из ингредиентов выбранных блюд.</p></div></header>
        <div v-if="shoppingIngredients.length" class="shopping-list panel">
          <article v-for="ingredient in shoppingIngredients" :key="ingredient.key">
            <span>{{ ingredient.name }}</span>
            <strong>{{ formatIngredientAmount(ingredient.amount, ingredient.unit) }}</strong>
          </article>
        </div>
        <div v-else class="empty-recipes panel">
          <UiIcon name="shopping" />
          <h3>Список пока пуст</h3>
          <p>Добавь блюда с ингредиентами в недельное меню.</p>
        </div>
      </section>
    </template>

    <UiModal v-model="pickerOpen" :title="pickerTitle" eyebrow="Меню недели" width="640px">
      <div class="recipe-picker">
        <UiInput v-model="recipeQuery" placeholder="Найти своё блюдо" />
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
      @save="saveRecipe"
    />
  </section>
</template>

<script setup lang="ts">
import { computed, onMounted, ref, watch } from 'vue'
import { workspaceStore } from '../../../stores/workspace.store.js'
import { useNotification } from '../../../composables/ui/useNotification.js'
import UiButton from '../../../components/ui/UiButton.vue'
import UiIcon from '../../../components/ui/UiIcon.vue'
import UiIconButton from '../../../components/ui/UiIconButton.vue'
import UiInput from '../../../components/ui/UiInput.vue'
import UiModal from '../../../components/ui/UiModal.vue'
import UiPageHeader from '../../../components/ui/UiPageHeader.vue'
import MealRecipeModal from '../components/MealRecipeModal.vue'
import { getMealWeek } from '../api/meals.api'
import { mealPlanStore } from '../stores/mealPlan.store'
import { cloneMealWeek } from '../services/mealPlan.service'
import { getSlotNutrition, mergeShoppingIngredients, parseMealDecimal, sumNutrition } from '../services/mealNutrition.service'
import type { MealRecipe, MealType, MealWeek } from '../types/meals.types'

const mealTypes: Array<{ id: MealType; label: string }> = [
  { id: 'breakfast', label: 'Завтрак' },
  { id: 'lunch', label: 'Обед' },
  { id: 'dinner', label: 'Ужин' },
  { id: 'snack', label: 'Перекус' },
]
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
const libraryQuery = ref('')
const recipeEditorOpen = ref(false)
const editingRecipe = ref<MealRecipe | null>(null)
const copyingPopularRecipe = ref(false)
const createForPendingSlot = ref(false)
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
  { id: 'shopping' as const, label: 'Продукты', count: shoppingIngredients.value.length },
])
const filteredPickerRecipes = computed(() => {
  const query = normalize(recipeQuery.value)
  return mealPlanStore.availableRecipes.value
    .filter((recipe) => !query || normalize(recipe.title).includes(query))
    .sort((first, second) => Number(second.mealType === pickerMealType.value) - Number(first.mealType === pickerMealType.value))
})
const visibleLibraryRecipes = computed(() => {
  const query = normalize(libraryQuery.value)
  return mealPlanStore.availableRecipes.value.filter((recipe) => !query || normalize(recipe.title).includes(query))
})
const plannedSlots = computed(() => {
  if (!draftWeek.value) return []
  return Object.values(draftWeek.value.plan).flatMap((day) => Object.values(day).filter(Boolean))
})
const plannedRecipes = computed(() => plannedSlots.value.flatMap((slot) => {
  const recipe = mealPlanStore.recipeById.value.get(slot.recipeId)
  return recipe ? [{ recipe, servings: slot.servings }] : []
}))
const shoppingIngredients = computed(() => mergeShoppingIngredients(plannedRecipes.value))
const pickerTitle = computed(() => `${mealTypeLabel(pickerMealType.value)} · ${formatPickerDate(pickerDate.value)}`)

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
  draftWeek.value.plan[pickerDate.value][pickerMealType.value] = { recipeId: recipe.id, servings: 1 }
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
  if (!draftWeek.value) return
  const result = await mealPlanStore.saveWeek(cloneMealWeek(draftWeek.value))
  notify(result.ok ? 'Меню недели сохранено' : result.message, result.ok ? 'success' : 'danger')
  if (result.ok && mealPlanStore.week.value) {
    draftWeek.value = cloneMealWeek(mealPlanStore.week.value)
    isDirty.value = false
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

function isPopularRecipe(recipe: MealRecipe) {
  return recipe.id.startsWith('popular:')
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

function formatIngredientAmount(amount: number, unit: string) {
  const label = unit === 'piece' ? 'шт.' : unit === 'ml' ? 'мл' : 'г'
  return `${Number.isInteger(amount) ? amount : amount.toFixed(1)} ${label}`
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
.meals-page{display:grid;gap:16px;width:min(100%,1320px);margin:0 auto;padding-bottom:24px}.week-label{min-width:180px;text-align:center;font-size:12px}.meals-tabs{display:flex;gap:5px;border-bottom:1px solid var(--border-color);padding:0 2px}.meals-tabs button{border:0;border-bottom:2px solid transparent;padding:10px 12px;color:var(--text-muted);background:transparent;font-size:11px;font-weight:750}.meals-tabs button.active{border-color:var(--accent);color:var(--text-primary)}.meals-tabs span{margin-left:4px;border-radius:99px;padding:2px 5px;background:var(--control-bg);font-size:8px}.meals-loading,.meals-error{min-height:280px;display:grid;place-items:center;padding:30px;color:var(--text-muted)}.meals-error{align-content:center;gap:8px}.meals-error strong{color:var(--danger)}.week-view,.recipes-view,.shopping-view{display:grid;gap:14px}.week-toolbar{display:grid;grid-template-columns:170px 1fr auto auto;align-items:end;gap:12px;padding:13px}.week-toolbar label{display:grid;gap:4px}.week-toolbar label>span{color:var(--text-muted);font-size:9px}.week-toolbar label>div{display:flex;align-items:center;border:1px solid var(--border-color);border-radius:10px;background:var(--field-bg)}.week-toolbar input{min-width:0;width:100%;height:34px;border:0;padding:0 10px;color:var(--text-primary);background:transparent;outline:0}.week-toolbar b{padding-right:8px;color:var(--text-muted);font-size:9px}.week-toolbar p{margin:0;color:var(--text-muted);font-size:10px;line-height:1.4}.week-grid{display:grid;grid-template-columns:repeat(7,minmax(260px,1fr));gap:8px;overflow-x:auto;padding-bottom:4px}.day-card{display:grid;align-content:start;gap:12px;min-height:360px;padding:11px}.day-card.today{border-color:color-mix(in srgb,var(--accent) 42%,var(--border-color));box-shadow:inset 0 2px 0 var(--accent)}.day-card>header{display:flex;justify-content:space-between;gap:7px;border-bottom:1px solid var(--border-color);padding-bottom:9px}.day-card>header span,.day-card>header strong{display:block}.day-card>header span{color:var(--text-muted);font-size:9px;text-transform:capitalize}.day-card>header strong{margin-top:2px;font-size:13px}.day-nutrition{text-align:right}.day-nutrition b,.day-nutrition small{display:block}.day-nutrition b{font-size:9px}.day-nutrition small{margin-top:2px;color:var(--text-muted);font-size:7px}.meal-slots{display:grid;gap:9px}.meal-slot{display:grid;gap:4px}.meal-slot>span{color:var(--text-muted);font-size:8px;font-weight:750;text-transform:uppercase}.meal-slot__empty,.meal-slot__filled{width:100%;min-height:48px;border:1px dashed var(--border-color);border-radius:10px;padding:7px;color:var(--text-muted);background:var(--control-bg);text-align:left;font-size:9px}.meal-slot__filled{position:relative;border-style:solid;color:var(--text-primary);background:color-mix(in srgb,var(--accent) 6%,var(--card-soft))}.meal-slot__filled b,.meal-slot__filled small{display:block;padding-right:13px}.meal-slot__filled b{overflow:hidden;text-overflow:ellipsis;white-space:nowrap;font-size:10px}.meal-slot__filled small{margin-top:3px;color:var(--text-muted);font-size:7px}.meal-slot__filled i{position:absolute;top:4px;right:6px;color:var(--text-muted);font-size:15px;font-style:normal}.recipes-view>header,.shopping-view>header{display:flex;align-items:center;justify-content:space-between;gap:15px}.recipes-view h2,.shopping-view h2{margin:0;font-size:20px}.recipes-view header p,.shopping-view header p{margin:3px 0 0;color:var(--text-muted);font-size:10px}.recipe-grid{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:10px}.recipe-card{display:grid;grid-template-columns:82px minmax(0,1fr);gap:11px;padding:11px}.recipe-card__visual{display:grid;place-items:center;width:82px;height:82px;border-radius:13px;color:var(--accent);background:color-mix(in srgb,var(--accent) 9%,var(--control-bg)) center/cover}.recipe-card__copy{min-width:0}.recipe-card__copy>span{color:var(--accent);font-size:8px;font-weight:800;text-transform:uppercase}.recipe-card h3{overflow:hidden;margin:4px 0;text-overflow:ellipsis;white-space:nowrap;font-size:14px}.recipe-card p{margin:0;color:var(--text-muted);font-size:9px}.recipe-card__copy>div{display:flex;justify-content:space-between;gap:5px;margin-top:10px}.recipe-card__copy b,.recipe-card__copy small{font-size:8px}.recipe-card__copy small{color:var(--text-muted)}.recipe-card footer{grid-column:1/-1;display:flex;justify-content:flex-end;gap:6px;border-top:1px solid var(--border-color);padding-top:8px}.empty-recipes{display:grid;place-items:center;align-content:center;gap:8px;min-height:300px;padding:30px;text-align:center}.empty-recipes>svg{color:var(--accent);font-size:36px}.empty-recipes h3,.empty-recipes p{margin:0}.empty-recipes p{color:var(--text-muted);font-size:10px}.shopping-list{display:grid;padding:6px 14px}.shopping-list article{display:flex;justify-content:space-between;gap:20px;border-bottom:1px solid var(--border-color);padding:11px 2px}.shopping-list article:last-child{border:0}.shopping-list span{font-size:11px}.shopping-list strong{font-size:11px}.recipe-picker{display:grid;gap:12px}.recipe-picker__list{display:grid;gap:6px;max-height:410px;overflow:auto}.recipe-picker__list button{display:flex;align-items:center;justify-content:space-between;gap:10px;border:1px solid var(--border-color);border-radius:12px;padding:10px;color:var(--text-primary);background:var(--card-soft);text-align:left}.recipe-picker__list b,.recipe-picker__list small{display:block}.recipe-picker__list b{font-size:11px}.recipe-picker__list small{margin-top:3px;color:var(--text-muted);font-size:8px}@media(max-width:1050px){.week-toolbar{grid-template-columns:160px 1fr}.week-toolbar :deep(.ui-button){width:100%}.recipe-grid{grid-template-columns:repeat(2,minmax(0,1fr))}}@media(max-width:680px){.week-label{min-width:0}.week-toolbar{grid-template-columns:1fr}.recipe-grid{grid-template-columns:1fr}.recipes-view>header,.shopping-view>header{align-items:stretch;flex-direction:column}.meals-tabs{overflow-x:auto}.meals-tabs button{white-space:nowrap}}
</style>

<style scoped>
.recipe-library-actions{display:flex;align-items:center;gap:8px}.recipe-library-actions :deep(.ui-input){min-width:220px}@media(max-width:680px){.recipe-library-actions{align-items:stretch;flex-direction:column}.recipe-library-actions :deep(.ui-input){min-width:0}}
</style>
