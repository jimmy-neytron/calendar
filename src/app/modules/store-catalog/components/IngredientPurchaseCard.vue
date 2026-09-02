<template>
  <article class="ingredient-purchase">
    <div class="ingredient-purchase__need">
      <strong>{{ item.name }}</strong>
      <span>Нужно {{ formatAmount(item.amount, item.unit) }}</span>
    </div>
    <div class="ingredient-purchase__product">
      <UiSelect :model-value="item.product?.id || ''" :disabled="saving" :aria-label="`Товар для ингредиента: ${item.name}`" searchable search-placeholder="Название или код товара" @update:model-value="$emit('link', item.name, item.unit, String($event))">
        <option value="">Выберите товар магазина</option>
        <option v-for="product in compatibleProducts" :key="product.id" :value="product.id">{{ product.name }} · {{ product.productCode }}</option>
      </UiSelect>
      <div class="ingredient-purchase__meta">
        <span v-if="item.packageAmount && item.product?.packageUnit">Упаковка {{ formatAmount(item.packageAmount, item.product.packageUnit) }} · {{ formatMoney(item.product.currentPrice) }}</span>
        <span v-if="!item.confirmed" class="ingredient-purchase__warning">{{ problem }}</span>
        <button v-if="item.product" type="button" @click="packageOpen = !packageOpen">{{ packageOpen ? 'Скрыть' : 'Уточнить фасовку' }}</button>
        <a v-if="item.product?.productUrl" :href="item.product.productUrl" target="_blank" rel="noreferrer">В магазине ↗</a>
      </div>
      <form v-if="packageOpen && item.product" class="ingredient-purchase__package" @submit.prevent="savePackage">
        <label>В одной упаковке<input v-model="packageInput" required type="number" min="0.01" step="any" :aria-label="`Фасовка: ${item.name}`" /></label>
        <span>{{ unitLabel(item.unit) }}</span>
        <UiButton size="sm" type="submit" :disabled="saving">Сохранить</UiButton>
      </form>
    </div>
    <div class="ingredient-purchase__total">
      <strong>{{ formatMoney(item.lineTotal) }}</strong>
      <span>{{ item.packages ? `${item.packages} упак.` : 'Не рассчитано' }}</span>
    </div>
  </article>
</template>

<script setup lang="ts">
import { computed, ref, watch } from 'vue'
import UiButton from '../../../components/ui/UiButton.vue'
import UiSelect from '../../../components/ui/UiSelect.vue'
import type { DailyPurchase, StorePackageUnit, StoreProduct } from '../types/storeCatalog.types'
const props = defineProps<{ item: DailyPurchase; products: StoreProduct[]; saving?: boolean }>()
const emit = defineEmits<{ link: [name: string, unit: StorePackageUnit, productId: string]; 'set-package': [id: string, amount: number, unit: StorePackageUnit] }>()
const packageOpen = ref(false)
const packageInput = ref('')
watch(() => props.item.product, product => { packageInput.value = product?.packageAmount ? String(product.packageAmount) : ''; packageOpen.value = false }, { immediate: true })
const compatibleProducts = computed(() => props.products.filter(product => product.id === props.item.product?.id || !product.packageUnit || product.packageUnit === props.item.unit))
const problem = computed(() => !props.item.product ? 'Выберите товар, чтобы получить цену' : !props.item.packageAmount || props.item.product.packageUnit !== props.item.unit ? 'Укажите фасовку в единицах ингредиента' : 'Нет актуальной цены — обновите источник')
function savePackage() {
  const amount = Number(packageInput.value)
  if (props.item.product && Number.isFinite(amount) && amount > 0) emit('set-package', props.item.product.id, amount, props.item.unit)
}
const unitLabel = (unit: StorePackageUnit) => unit === 'piece' ? 'шт.' : unit === 'ml' ? 'мл' : 'г'
const formatAmount = (amount: number, unit: StorePackageUnit) => `${new Intl.NumberFormat('ru-RU', { maximumFractionDigits: 2 }).format(amount)} ${unitLabel(unit)}`
const formatMoney = (value: number | null) => value == null ? '—' : `${new Intl.NumberFormat('ru-RU', { maximumFractionDigits: 2 }).format(value)} ₽`
</script>

<style scoped>
.ingredient-purchase{display:grid;grid-template-columns:minmax(130px,1fr) minmax(0,2fr) 90px;gap:20px;align-items:start;padding:20px 0;border-top:1px solid var(--border-color)}
.ingredient-purchase__need,.ingredient-purchase__total{display:grid;gap:6px;padding-top:5px}.ingredient-purchase__need strong{font-size:14px}.ingredient-purchase__need span,.ingredient-purchase__total span{font-size:12px;color:var(--text-secondary)}.ingredient-purchase__product{min-width:0}.ingredient-purchase__total{text-align:right}.ingredient-purchase__total strong{font-size:17px}
.ingredient-purchase__meta{display:flex;flex-wrap:wrap;gap:5px 12px;margin-top:8px;color:var(--text-secondary);font-size:11px;line-height:1.5}.ingredient-purchase__meta button,.ingredient-purchase__meta a{border:0;padding:0;background:none;color:var(--text-secondary);text-decoration:underline;cursor:pointer;font:inherit}.ingredient-purchase__warning{color:var(--warning)}
.ingredient-purchase__package{display:flex;align-items:end;gap:8px;margin-top:12px}.ingredient-purchase__package label{display:grid;gap:5px;font-size:11px;color:var(--text-secondary)}.ingredient-purchase__package input{width:110px;height:32px;border:1px solid var(--border-color);border-radius:8px;padding:0 8px;background:var(--field-bg);color:var(--text-primary)}.ingredient-purchase__package>span{padding-bottom:7px;font-size:12px}
@media(max-width:760px){.ingredient-purchase{grid-template-columns:minmax(0,1fr) 90px;gap:12px}.ingredient-purchase__product{grid-column:1/-1;grid-row:2}.ingredient-purchase__total{grid-column:2;grid-row:1}}
</style>
