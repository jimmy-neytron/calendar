<template>
  <section class="recipe-library">
    <header class="library-heading"><div><h2>Блюда и их состав</h2><p>Выберите блюдо, чтобы посмотреть ингредиенты и настроить покупки.</p></div><UiButton icon="plus" @click="$emit('create')">Новое блюдо</UiButton></header>
    <div class="library-layout">
      <aside class="library-sidebar panel">
        <UiInput v-model="query" placeholder="Найти блюдо или ингредиент" aria-label="Поиск блюд" />
        <UiSelect v-model="filter" aria-label="Фильтр блюд"><option value="all">Все блюда</option><option value="own">Мои блюда</option><option value="popular">Популярные</option></UiSelect>
        <div class="library-list" aria-label="Блюда">
          <button v-for="recipe in visibleRecipes" :key="recipe.id" type="button" :aria-pressed="selected?.id === recipe.id" @click="selectedId = recipe.id">
            <img v-if="recipe.imageUrl" :src="recipe.imageUrl" alt="" loading="lazy" />
            <span v-else class="recipe-placeholder"><UiIcon name="utensils" /></span>
            <span class="library-list__copy"><strong>{{ recipe.title }}</strong><small>{{ recipe.ingredients.length }} ингредиентов · {{ recipe.servings }} порц.</small></span>
            <UiIcon name="right" />
          </button>
        </div>
        <p v-if="!visibleRecipes.length" class="library-empty">Ничего не найдено. Измените запрос или добавьте своё блюдо.</p>
      </aside>
      <article v-if="selected" class="recipe-detail panel">
        <header class="recipe-detail__header">
          <div><small>{{ selected.id.startsWith('popular:') ? 'Популярное блюдо' : 'Мой рецепт' }}</small><h2>{{ selected.title }}</h2><p>{{ selected.servings }} порц. в рецепте<span v-if="selected.nutritionPerServing.calories != null"> · {{ Math.round(selected.nutritionPerServing.calories) }} ккал / порция</span></p></div>
          <div class="recipe-detail__actions">
            <UiButton v-if="selected.id.startsWith('popular:')" variant="secondary" icon="copy" @click="$emit('copy', selected)">Сохранить себе</UiButton>
            <template v-else><UiButton variant="secondary" icon="edit" @click="$emit('edit', selected)">Изменить состав</UiButton><UiIconButton icon="trash" label="Удалить блюдо" variant="danger" @click="$emit('remove', selected)" /></template>
          </div>
        </header>
        <MealRecipeProducts v-if="isAdmin" :recipe="selected" @shopping="$emit('shopping')" />
        <section v-else class="recipe-ingredients">
          <h3>Ингредиенты на {{ selected.servings }} порц.</h3>
          <div v-for="ingredient in selected.ingredients" :key="ingredient.id"><span>{{ ingredient.name }}</span><strong>{{ ingredient.amount }} {{ ingredient.unit === 'piece' ? 'шт.' : ingredient.unit === 'ml' ? 'мл' : 'г' }}</strong></div>
          <p v-if="!selected.ingredients.length">Состав не указан. Добавьте ингредиенты в редакторе блюда.</p>
        </section>
        <details v-if="selected.instructions" class="recipe-instructions"><summary>Как приготовить</summary><p>{{ selected.instructions }}</p></details>
      </article>
      <div v-else class="library-empty panel"><UiIcon name="utensils" /><h3>Здесь будет состав блюда</h3><p>Выберите рецепт из списка или создайте новый.</p></div>
    </div>
  </section>
</template>

<script setup lang="ts">
import { computed, defineAsyncComponent, ref, watch } from 'vue'
import UiButton from '../../../components/ui/UiButton.vue'
import UiIconButton from '../../../components/ui/UiIconButton.vue'
import UiIcon from '../../../components/ui/UiIcon.vue'
import UiInput from '../../../components/ui/UiInput.vue'
import UiSelect from '../../../components/ui/UiSelect.vue'
import type { MealRecipe } from '../types/meals.types'
const MealRecipeProducts = defineAsyncComponent(() => import('./MealRecipeProducts.vue'))
const props = defineProps<{ recipes: MealRecipe[]; isAdmin: boolean }>()
defineEmits<{ create: []; edit: [recipe: MealRecipe]; copy: [recipe: MealRecipe]; remove: [recipe: MealRecipe]; shopping: [] }>()
const query = ref('')
const filter = ref('all')
const selectedId = ref('')
const normalize = (value: string) => value.toLocaleLowerCase('ru-RU').replace(/ё/g, 'е').trim()
const visibleRecipes = computed(() => props.recipes.filter(recipe => {
  const popular = recipe.id.startsWith('popular:')
  return (filter.value === 'all' || (filter.value === 'popular' ? popular : !popular))
    && normalize([recipe.title, ...recipe.ingredients.map(item => item.name)].join(' ')).includes(normalize(query.value))
}))
const selected = computed(() => visibleRecipes.value.find(recipe => recipe.id === selectedId.value) || visibleRecipes.value[0] || null)
watch(visibleRecipes, recipes => {
  if (!recipes.some(recipe => recipe.id === selectedId.value)) selectedId.value = recipes[0]?.id || ''
}, { immediate: true })
</script>

<style scoped>
.recipe-library{display:grid;gap:20px}.library-heading{display:flex;align-items:center;justify-content:space-between;gap:16px}.library-heading h2{margin:0;font-size:22px}.library-heading p{margin:6px 0 0;color:var(--text-secondary);font-size:13px}.library-layout{display:grid;grid-template-columns:310px minmax(0,1fr);align-items:start;gap:18px}.library-sidebar{display:grid;gap:12px;padding:14px;min-width:0}.library-list{display:grid;gap:4px;max-height:650px;overflow:auto}.library-list button{display:flex;align-items:center;gap:12px;min-width:0;width:100%;padding:12px 8px;border:1px solid transparent;border-radius:10px;background:transparent;color:var(--text-primary);text-align:left;cursor:pointer}.library-list button[aria-pressed=true]{border-color:var(--accent-border);background:var(--accent-soft)}.library-list button:hover{background:var(--control-bg)}.library-list img,.recipe-placeholder{flex:none;width:42px;height:42px;object-fit:cover;border-radius:10px;background:var(--control-bg)}.recipe-placeholder{display:grid;place-items:center;color:var(--text-muted)}.library-list__copy{min-width:0;flex:1;display:grid;gap:6px}.library-list strong{font-size:13px;line-height:1.4}.library-list small{font-size:10px;color:var(--text-secondary)}.library-list button>svg{flex:none;font-size:12px;color:var(--text-muted)}
.recipe-detail{min-width:0;padding:24px}.recipe-detail__header{display:flex;flex-wrap:wrap;justify-content:space-between;align-items:start;gap:16px;padding-bottom:22px;border-bottom:1px solid var(--border-color)}.recipe-detail__header small{color:var(--text-muted);font-size:11px}.recipe-detail__header h2{margin:7px 0;font-size:23px;overflow-wrap:anywhere}.recipe-detail__header p{margin:0;color:var(--text-secondary);font-size:12px}.recipe-detail__actions{display:flex;gap:6px}.recipe-ingredients{padding-top:20px}.recipe-ingredients h3{font-size:15px}.recipe-ingredients>div{display:flex;justify-content:space-between;gap:12px;padding:14px 0;border-bottom:1px solid var(--border-color);font-size:13px}.recipe-ingredients p{color:var(--text-muted);font-size:13px}.recipe-instructions{margin-top:20px;border-top:1px solid var(--border-color);padding-top:18px;font-size:13px}.recipe-instructions summary{cursor:pointer;font-weight:700}.recipe-instructions p{white-space:pre-wrap;line-height:1.7;color:var(--text-secondary)}.library-empty{padding:28px;text-align:center;font-size:13px;color:var(--text-muted);line-height:1.6}
@media(max-width:1050px){.library-layout{grid-template-columns:250px minmax(0,1fr)}.recipe-detail{padding:18px}}
@media(max-width:760px){.library-layout{grid-template-columns:1fr}.library-list{max-height:250px}.library-heading{align-items:stretch;flex-direction:column}.recipe-detail__header h2{font-size:20px}}
</style>
