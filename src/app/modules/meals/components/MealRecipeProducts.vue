<template>
  <section class="recipe-products">
    <header><h3>Ингредиенты → товары магазина</h3><p>Состав на {{ recipe.servings }} порц. Выбор товара сохраняется сразу для этого ингредиента во всех блюдах и неделях.</p></header>
    <p v-if="catalog.loading.value" role="status">Загружаем товары…</p>
    <div v-else-if="catalog.error.value" role="alert"><p>{{ catalog.error.value }}</p><UiButton variant="secondary" @click="catalog.loadCatalog">Повторить</UiButton></div>
    <template v-else>
      <p v-if="!purchases.length">Состав не указан. Добавьте ингредиенты через «Изменить состав» или сохраните популярное блюдо себе.</p>
      <p v-else-if="!catalog.products.value.length">Товаров пока нет. Добавьте источник цен в «Закупке».</p>
      <IngredientPurchaseCard v-for="item in purchases" :key="item.normalizedName + ':' + item.unit" :item="item" :products="catalog.products.value" :saving="catalog.saving.value" @link="linkProduct" @set-package="setPackage" />
    </template>
    <footer><p>Здесь показаны целые упаковки для рецепта, не стоимость съеденной порции. Общую закупку по меню смотрите в «Закупке».</p><UiButton variant="secondary" icon="shopping" @click="$emit('shopping')">К закупке недели</UiButton></footer>
  </section>
</template>

<script setup lang="ts">
import { computed, onMounted } from 'vue'
import UiButton from '../../../components/ui/UiButton.vue'
import IngredientPurchaseCard from '../../store-catalog/components/IngredientPurchaseCard.vue'
import { useStoreCatalog } from '../../store-catalog/composables/useStoreCatalog'
import { calculateDailyPurchases, getRecipeRequirements } from '../../store-catalog/services/storeCatalog.service'
import { useNotification } from '../../../composables/ui/useNotification.js'
import type { StorePackageUnit } from '../../store-catalog/types/storeCatalog.types'
import type { MealRecipe } from '../types/meals.types'
const props = defineProps<{ recipe: MealRecipe }>()
defineEmits<{ shopping: [] }>()
const catalog = useStoreCatalog()
const { notify } = useNotification()
const purchases = computed(() => calculateDailyPurchases(getRecipeRequirements(props.recipe), catalog.links.value, catalog.products.value))
async function run(action: () => Promise<void>) {
  try { await action(); notify('Изменения сохранены', 'success') }
  catch (error) { notify(error instanceof Error ? error.message : 'Не удалось сохранить изменения', 'danger') }
}
function linkProduct(name: string, unit: StorePackageUnit, id: string) { void run(() => catalog.linkProduct(name, unit, id)) }
function setPackage(id: string, amount: number, unit: StorePackageUnit) { void run(() => catalog.setPackage(id, amount, unit)) }
onMounted(catalog.loadCatalog)
</script>

<style scoped>
.recipe-products{padding-top:22px}.recipe-products h3{margin:0 0 8px;font-size:15px}.recipe-products p{font-size:12px;color:var(--text-secondary);line-height:1.6}.recipe-products header p{margin:0 0 18px}.recipe-products footer{display:flex;flex-wrap:wrap;align-items:center;justify-content:space-between;gap:12px;border-top:1px solid var(--border-color);padding-top:16px}.recipe-products footer p{flex:1;min-width:180px;margin:0;font-size:11px}
</style>
