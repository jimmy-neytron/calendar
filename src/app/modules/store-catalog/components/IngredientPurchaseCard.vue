<template>
  <article class="ingredient-purchase" :class="{ 'ingredient-purchase--bought': bought, 'ingredient-purchase--simple': !pricingEnabled, 'ingredient-purchase--editor': !checkable }">
    <label v-if="checkable" class="purchase-check" :title="bought ? 'Вернуть в список покупок' : 'Отметить купленным'">
      <input type="checkbox" :checked="bought" :aria-label="`Куплено: ${item.name}`" @change="$emit('toggle')" />
      <span><UiIcon v-if="bought" name="check" /></span>
    </label>
    <div class="ingredient-purchase__need">
      <strong>{{ item.name }}</strong>
      <span>{{ formatAmount(item.amount, item.unit) }}<b v-if="bought">Куплено</b></span>
    </div>
    <button v-if="pricingEnabled && checkable" class="ingredient-purchase__summary" type="button" :aria-expanded="detailsOpen" @click="detailsOpen = !detailsOpen">
      <UiIcon :name="item.product ? 'link' : 'plus'" /><span><strong>{{ item.product?.name || 'Выбрать товар' }}</strong><small>{{ item.confirmed ? 'Товар и цена учтены' : 'Нужны данные для расчёта' }}</small></span><UiIcon :name="detailsOpen ? 'up' : 'down'" />
    </button>
    <div v-if="pricingEnabled && detailsOpen" class="ingredient-purchase__product">
      <UiSelect :model-value="item.product?.id || ''" :disabled="saving" :aria-label="`Товар для ингредиента: ${item.name}`" searchable search-placeholder="Название или код товара" @update:model-value="$emit('link', item.name, item.unit, String($event))">
        <option value="">Выберите товар магазина</option>
        <option v-for="product in compatibleProducts" :key="product.id" :value="product.id">{{ product.name }} · {{ product.productCode }}</option>
      </UiSelect>
      <div class="ingredient-purchase__meta">
        <span v-if="item.packageAmount && item.product?.packageUnit">{{ item.product.isWeighted ? 'Весовая порция' : 'Упаковка' }} {{ formatAmount(item.packageAmount, item.product.packageUnit) }} · {{ formatMoney(item.product.currentPrice) }}</span>
        <span v-if="item.product?.isWeighted && item.product.unitPrice != null">{{ formatMoney(item.product.unitPrice) }} / кг · итог уточняется при взвешивании</span>
        <span v-if="!item.confirmed" class="ingredient-purchase__warning">{{ problem }}</span>
        <button v-if="item.product && !item.product.isWeighted" type="button" @click="packageOpen = !packageOpen">{{ packageOpen ? 'Скрыть' : 'Уточнить фасовку' }}</button>
        <a v-if="item.product?.productUrl" :href="item.product.productUrl" target="_blank" rel="noreferrer">В магазине ↗</a>
      </div>
      <form v-if="packageOpen && item.product" class="ingredient-purchase__package" @submit.prevent="savePackage">
        <label>В одной упаковке<input v-model="packageInput" required type="number" min="0.01" step="any" :aria-label="`Фасовка: ${item.name}`" /></label>
        <span>{{ unitLabel(item.unit) }}</span>
        <UiButton size="sm" type="submit" :disabled="saving">Сохранить</UiButton>
      </form>
    </div>
    <div v-if="pricingEnabled" class="ingredient-purchase__total">
      <strong>{{ formatMoney(item.lineTotal) }}</strong>
      <span>{{ item.packages ? item.product?.isWeighted ? formatAmount(item.packages * (item.product.weightStep || 0), 'g') : `${item.packages} упак.` : 'Не рассчитано' }}</span>
    </div>
  </article>
</template>

<script setup lang="ts">
import { computed, ref, watch } from 'vue'
import UiButton from '../../../components/ui/UiButton.vue'
import UiIcon from '../../../components/ui/UiIcon.vue'
import UiSelect from '../../../components/ui/UiSelect.vue'
import type { DailyPurchase, StorePackageUnit, StoreProduct } from '../types/storeCatalog.types'
const props = withDefaults(defineProps<{ item: DailyPurchase; products: StoreProduct[]; saving?: boolean; bought?: boolean; pricingEnabled?: boolean; checkable?: boolean }>(), { pricingEnabled: true })
const emit = defineEmits<{ toggle: []; link: [name: string, unit: StorePackageUnit, productId: string]; 'set-package': [id: string, amount: number, unit: StorePackageUnit] }>()
const detailsOpen = ref(!props.checkable)
const packageOpen = ref(false)
const packageInput = ref('')
watch(() => props.item.product, product => { packageInput.value = product?.packageAmount ? String(product.packageAmount) : ''; packageOpen.value = false }, { immediate: true })
const compatibleProducts = computed(() => props.products.filter(product => product.id === props.item.product?.id || !product.packageUnit || product.packageUnit === props.item.unit))
const problem = computed(() => {
  const product = props.item.product
  if (!product) return 'Выберите товар, чтобы получить цену'
  if (product.isWeighted && (!props.item.packageAmount || !product.weightStep || !product.weightMinimum)) return 'Не получены параметры веса — обновите источник'
  if (product.isWeighted && props.item.unit !== 'g') return 'Для весового товара укажите ингредиент в граммах'
  if (!props.item.packageAmount || product.packageUnit !== props.item.unit) return 'Укажите фасовку в единицах ингредиента'
  return 'Нет актуальной цены — обновите источник'
})
function savePackage() {
  const amount = Number(packageInput.value)
  if (props.item.product && !props.item.product.isWeighted && Number.isFinite(amount) && amount > 0) emit('set-package', props.item.product.id, amount, props.item.unit)
}
const unitLabel = (unit: StorePackageUnit) => unit === 'piece' ? 'шт.' : unit === 'ml' ? 'мл' : 'г'
const formatAmount = (amount: number, unit: StorePackageUnit) => `${new Intl.NumberFormat('ru-RU', { maximumFractionDigits: 2 }).format(amount)} ${unitLabel(unit)}`
const formatMoney = (value: number | null) => value == null ? '—' : `${new Intl.NumberFormat('ru-RU', { maximumFractionDigits: 2 }).format(value)} ₽`
</script>

<style scoped>
.ingredient-purchase{display:grid;grid-template-columns:30px minmax(130px,1fr) minmax(0,1.5fr) 95px;gap:16px;align-items:center;padding:16px;border:1px solid var(--border-color);border-radius:12px;background:var(--card-solid);transition:border-color .15s,background .15s}.ingredient-purchase:hover{border-color:var(--border-strong)}.ingredient-purchase--simple{grid-template-columns:30px minmax(0,1fr)}.ingredient-purchase--bought{background:color-mix(in srgb,var(--success) 4%,var(--card-solid))}.ingredient-purchase--bought .ingredient-purchase__need>strong{text-decoration:line-through;color:var(--text-muted)}.purchase-check{position:relative;display:grid;place-items:center;width:30px;min-height:40px;cursor:pointer}.purchase-check input{position:absolute;inset:0;width:100%;height:100%;margin:0;opacity:0;cursor:pointer}.purchase-check>span{display:grid;place-items:center;pointer-events:none;width:23px;height:23px;border:1.5px solid var(--border-strong);border-radius:7px;color:var(--text-inverse)}.purchase-check input:checked+span{border-color:var(--success);background:var(--success);color:#fff}.purchase-check input:focus-visible+span{outline:2px solid var(--accent);outline-offset:4px}.ingredient-purchase__need b{margin-left:8px;font-size:10px;font-weight:500;color:var(--success)}.ingredient-purchase__summary{display:flex;align-items:center;gap:9px;min-width:0;border:0;border-radius:8px;background:transparent;color:var(--text-secondary);padding:7px;text-align:left}.ingredient-purchase__summary>svg{flex-shrink:0;font-size:15px}.ingredient-purchase__summary span{display:grid;gap:4px;flex:1;min-width:0}.ingredient-purchase__summary strong{overflow:hidden;text-overflow:ellipsis;white-space:nowrap;font-size:11px;font-weight:500}.ingredient-purchase__summary small{font-size:10px;color:var(--text-muted)}.ingredient-purchase__summary:hover{background:var(--control-bg)}.ingredient-purchase__product{grid-column:2/-1;border-top:1px solid var(--border-color);padding-top:14px}.ingredient-purchase__total{grid-column:4;grid-row:1}
.ingredient-purchase__need,.ingredient-purchase__total{display:grid;gap:6px;padding-top:5px}.ingredient-purchase__need strong{font-size:14px}.ingredient-purchase__need span,.ingredient-purchase__total span{font-size:12px;color:var(--text-secondary)}.ingredient-purchase__product{min-width:0}.ingredient-purchase__total{text-align:right}.ingredient-purchase__total strong{font-size:17px}
.ingredient-purchase__meta{display:flex;flex-wrap:wrap;gap:5px 12px;margin-top:8px;color:var(--text-secondary);font-size:11px;line-height:1.5}.ingredient-purchase__meta button,.ingredient-purchase__meta a{border:0;padding:0;background:none;color:var(--text-secondary);text-decoration:underline;cursor:pointer;font:inherit}.ingredient-purchase__warning{color:var(--warning)}
.ingredient-purchase__package{display:flex;align-items:end;gap:8px;margin-top:12px}.ingredient-purchase__package label{display:grid;gap:5px;font-size:11px;color:var(--text-secondary)}.ingredient-purchase__package input{width:110px;height:32px;border:1px solid var(--border-color);border-radius:8px;padding:0 8px;background:var(--field-bg);color:var(--text-primary)}.ingredient-purchase__package>span{padding-bottom:7px;font-size:12px}
@media(max-width:760px){.ingredient-purchase{grid-template-columns:28px minmax(0,1fr) 85px;gap:10px;padding:12px}.ingredient-purchase--simple{grid-template-columns:28px minmax(0,1fr)}.ingredient-purchase__summary{grid-column:2/-1;grid-row:2;padding-left:0}.ingredient-purchase__product{grid-column:1/-1;grid-row:3}.ingredient-purchase__total{grid-column:3;grid-row:1}.ingredient-purchase__need strong{font-size:13px;overflow-wrap:anywhere}.ingredient-purchase__total strong{font-size:15px}.ingredient-purchase__package{flex-wrap:wrap}}
</style>

<style scoped>
.ingredient-purchase--editor{grid-template-columns:minmax(100px,1fr) minmax(0,2fr) 90px;margin-bottom:8px}.ingredient-purchase--editor .ingredient-purchase__product{grid-column:2;grid-row:1;border:0;padding:0}.ingredient-purchase--editor .ingredient-purchase__total{grid-column:3}@media(max-width:760px){.ingredient-purchase--editor{grid-template-columns:minmax(0,1fr) 85px}.ingredient-purchase--editor .ingredient-purchase__product{grid-column:1/-1;grid-row:2}.ingredient-purchase--editor .ingredient-purchase__total{grid-column:2}}
</style>
