<template>
  <UiModal :model-value="Boolean(product)" title="Карточка товара" eyebrow="Каталог магазина" width="540px" overlay-class="store-product-overlay" @update:model-value="!$event && $emit('close')">
    <div v-if="product" class="product-details">
      <header class="product-details__hero">
        <div class="product-details__image"><img v-if="product.imageUrl" :src="product.imageUrl" :alt="product.name" /><UiIcon v-else name="shopping" /></div>
        <div><span>{{ product.store }} · {{ product.productCode }}</span><h3>{{ product.name }}</h3><p>{{ product.isWeighted ? 'Весовой товар' : 'Упакованный товар' }}</p></div>
      </header>
      <section class="product-details__price">
        <div><span>{{ priceIssue ? 'Актуальная цена' : 'Цена магазина' }}</span><strong>{{ priceIssue ? 'Не подтверждена' : formatStoreMoney(product.currentPrice) }}</strong><s v-if="!priceIssue && hasStoreDiscount(product)">{{ formatStoreMoney(product.oldPrice) }}</s></div>
        <p v-if="product.isWeighted && product.packageAmount">за {{ formatStoreAmount(product.packageAmount, product.packageUnit) }}<span v-if="!priceIssue && product.unitPrice != null"> · {{ formatStoreMoney(product.unitPrice) }} / кг</span></p>
        <small>Обновлено: {{ formatStoreDate(product.priceUpdatedAt) }}</small>
      </section>
      <section v-if="issues.length" class="product-details__issues" aria-label="Что нужно уточнить">
        <div v-for="issue in issues" :key="issue.kind"><UiIcon name="warning" /><p><strong>{{ issue.title }}</strong><span>{{ issue.description }}</span></p></div>
        <UiButton v-if="priceIssue || product.isWeighted" variant="secondary" icon="refresh" @click="$emit('sources')">Перейти к источникам</UiButton>
      </section>
      <div v-else class="product-details__ready"><UiIcon name="check-circle" />Цена и фасовка готовы для расчёта</div>
      <section class="product-details__section">
        <h4><UiIcon name="ruler" />Фасовка</h4>
        <template v-if="product.isWeighted">
          <dl><div><dt>Минимальный заказ</dt><dd>{{ product.weightMinimum ? formatStoreAmount(product.weightMinimum, 'g') : 'Не указан' }}</dd></div><div><dt>Шаг заказа</dt><dd>{{ product.weightStep ? formatStoreAmount(product.weightStep, 'g') : 'Не указан' }}</dd></div></dl>
          <p class="product-details__hint">Параметры веса обновляются из источника. Итоговую стоимость магазин уточняет после взвешивания.</p>
        </template>
        <form v-else class="product-details__package" @submit.prevent="savePackage">
          <label>В одной упаковке<input v-model="packageAmount" type="number" min="0.01" step="any" required aria-label="Количество в упаковке" :disabled="saving" /></label>
          <label>Единица<UiSelect v-model="packageUnit" aria-label="Единица фасовки" :disabled="saving"><option value="g">г</option><option value="ml">мл</option><option value="piece">шт.</option></UiSelect></label>
          <UiButton type="submit" variant="secondary" :loading="saving">Сохранить фасовку</UiButton>
          <p v-if="packageError" class="product-details__error" role="alert">{{ packageError }}</p>
        </form>
      </section>
      <section class="product-details__section">
        <h4><UiIcon name="link" />Использовать в меню</h4>
        <p class="product-details__hint">Свяжи товар с ингредиентом. Цена будет использоваться в блюдах и закупках этого пространства.</p>
        <form v-if="compatibleRequirements.length" class="product-details__link" @submit.prevent="linkIngredient">
          <UiSelect v-model="requirementKey" aria-label="Ингредиент для товара" searchable search-placeholder="Найти ингредиент" :disabled="saving"><option value="">Выбери ингредиент</option><option v-for="item in compatibleRequirements" :key="`${item.normalizedName}:${item.unit}`" :value="`${item.normalizedName}:${item.unit}`">{{ item.name }} · {{ formatStoreAmount(item.amount, item.unit) }}</option></UiSelect>
          <UiButton type="submit" icon="link" :disabled="!requirementKey" :loading="saving">Связать с ингредиентом</UiButton>
        </form>
        <p v-else class="product-details__hint">{{ requirements.length ? 'Нет ингредиентов с подходящей единицей измерения. Проверь фасовку товара.' : 'Добавь блюда в меню или продукты в закупку — здесь появятся ингредиенты.' }}</p>
      </section>
      <section class="product-details__section">
        <h4><UiIcon name="table" />Данные магазина</h4>
        <dl><div><dt>Магазин</dt><dd>{{ product.priceStoreCode || 'Не подтверждён' }}</dd></div><div><dt>Режим покупки</dt><dd>{{ product.priceCatalogType === '3' ? 'Самовывоз' : 'Доставка' }}<template v-if="product.priceStoreType"> · {{ product.priceStoreType }}</template></dd></div><div><dt>Разделы</dt><dd>{{ sourceNames || 'Не указаны' }}</dd></div></dl>
      </section>
      <footer class="product-details__footer"><a v-if="productUrl" :href="productUrl" target="_blank" rel="noopener noreferrer">Открыть в магазине ↗</a><UiButton variant="secondary" icon="trash" :disabled="saving || deletionDisabled" @click="$emit('remove', product)">Удалить товар</UiButton><UiButton variant="secondary" @click="$emit('close')">Закрыть</UiButton></footer>
    </div>
  </UiModal>
</template>

<script setup lang="ts">
import { computed, onBeforeUnmount, ref, watch } from 'vue'
import UiModal from '../../../components/ui/UiModal.vue'
import UiButton from '../../../components/ui/UiButton.vue'
import UiSelect from '../../../components/ui/UiSelect.vue'
import UiIcon from '../../../components/ui/UiIcon.vue'
import { formatStoreAmount, formatStoreDate, formatStoreMoney, getStoreProductIssues, hasStoreDiscount } from '../services/storeProductPresentation'
import type { DailyIngredientRequirement, StoreCatalogSource, StorePackageUnit, StoreProduct } from '../types/storeCatalog.types'
const props = defineProps<{ product: StoreProduct | null; sources: StoreCatalogSource[]; requirements: DailyIngredientRequirement[]; saving?: boolean; deletionDisabled?: boolean }>()
const emit = defineEmits<{ close: []; sources: []; remove: [product: StoreProduct]; 'set-package': [id: string, amount: number, unit: StorePackageUnit]; link: [name: string, unit: StorePackageUnit, productId: string] }>()
const packageAmount = ref(''), packageUnit = ref<StorePackageUnit>('g'), packageError = ref(''), requirementKey = ref('')
const issues = computed(() => props.product ? getStoreProductIssues(props.product) : [])
const priceIssue = computed(() => issues.value.find(issue => issue.kind === 'price'))
const sourceNames = computed(() => props.sources.filter(source => props.product?.sourceIds.includes(source.id)).map(source => source.name).join(', '))
const productUrl = computed(() => /^https?:\/\//i.test(props.product?.productUrl || '') ? props.product!.productUrl : '')
const compatibleRequirements = computed(() => props.requirements.filter(item => !props.product?.packageUnit || item.unit === props.product.packageUnit))
let previousOverflow: string | undefined
function restoreScroll() {
  if (previousOverflow === undefined || typeof document === 'undefined') return
  document.body.style.overflow = previousOverflow
  previousOverflow = undefined
}
watch(() => Boolean(props.product), opened => {
  if (typeof document === 'undefined') return
  if (opened && previousOverflow === undefined) { previousOverflow = document.body.style.overflow; document.body.style.overflow = 'hidden' }
  else if (!opened) restoreScroll()
}, { immediate: true })
onBeforeUnmount(restoreScroll)
watch(() => [props.product?.id, props.product?.packageAmount, props.product?.packageUnit], () => {
  packageAmount.value = props.product?.packageAmount ? String(props.product.packageAmount) : ''
  packageUnit.value = props.product?.packageUnit || 'g'
  packageError.value = ''
}, { immediate: true })
watch(() => props.product?.id, () => { requirementKey.value = '' })
watch(compatibleRequirements, values => { if (!values.some(item => `${item.normalizedName}:${item.unit}` === requirementKey.value)) requirementKey.value = '' })
function savePackage() {
  if (!props.product || props.product.isWeighted || props.saving) return
  const amount = Number(packageAmount.value)
  if (!Number.isFinite(amount) || amount < 0.01) { packageError.value = 'Укажи количество не меньше 0,01'; return }
  packageError.value = ''
  emit('set-package', props.product.id, amount, packageUnit.value)
}
function linkIngredient() {
  const item = compatibleRequirements.value.find(value => `${value.normalizedName}:${value.unit}` === requirementKey.value)
  if (props.product && item && !props.saving) emit('link', item.name, item.unit, props.product.id)
}
</script>

<style>
.ui-modal.store-product-overlay{justify-items:end;padding:0;background:rgba(3,4,9,.42);backdrop-filter:blur(4px);overscroll-behavior:contain}
.store-product-overlay .ui-modal__dialog{height:100dvh;max-height:100dvh;border-radius:18px 0 0 18px;border-right:0;background:var(--card-solid);box-shadow:-20px 0 70px rgba(0,0,0,.18)}
.store-product-overlay .ui-modal__header{padding:22px 24px 18px}.store-product-overlay .ui-modal__header h2{font-size:18px}.store-product-overlay .ui-modal__body{padding:24px;overscroll-behavior:contain;flex:1}
.store-product-overlay .modal-enter-active,.store-product-overlay .modal-leave-active{transition:transform .25s ease,opacity .2s ease}.store-product-overlay .modal-enter-from,.store-product-overlay .modal-leave-to{transform:translateX(100%);opacity:.5}
@media(max-width:600px){.store-product-overlay .ui-modal__dialog{width:100%;border-radius:0;border:0}.store-product-overlay .ui-modal__header{padding:18px}.store-product-overlay .ui-modal__body{padding:18px}}
@media(prefers-reduced-motion:reduce){.store-product-overlay .modal-enter-active,.store-product-overlay .modal-leave-active{transition:none}}
</style>
<style scoped>
.product-details__footer{flex-wrap:wrap}
.product-details{display:grid;gap:22px;min-width:0}.product-details__hero{display:grid;grid-template-columns:96px minmax(0,1fr);gap:18px;align-items:center}.product-details__image{display:grid;place-items:center;width:96px;height:108px;border-radius:14px;background:var(--control-bg);color:var(--text-muted);font-size:32px;overflow:hidden}.product-details__image img{width:100%;height:100%;object-fit:contain}.product-details__hero span,.product-details__hero p{color:var(--text-secondary);font-size:11px}.product-details__hero h3{font-size:19px;line-height:1.35;letter-spacing:-.025em;margin:7px 0;overflow-wrap:anywhere}.product-details__hero p{margin:0}.product-details__price{padding:18px;border:1px solid var(--border-color);border-radius:13px;background:var(--card-soft)}.product-details__price>div{display:flex;flex-wrap:wrap;align-items:baseline;gap:8px 12px}.product-details__price>div>span{flex-basis:100%;color:var(--text-secondary);font-size:11px}.product-details__price strong{font-size:26px;letter-spacing:-.03em}.product-details__price s{color:var(--text-muted);font-size:14px}.product-details__price p{margin:6px 0;font-size:12px}.product-details__price small{display:block;margin-top:8px;font-size:10px;color:var(--text-secondary)}.product-details__issues{display:grid;gap:12px;padding:15px;border:1px solid color-mix(in srgb,var(--warning) 28%,var(--border-color));border-radius:12px;background:color-mix(in srgb,var(--warning) 5%,transparent)}.product-details__issues>div{display:flex;gap:10px}.product-details__issues svg{color:var(--warning);flex-shrink:0;font-size:17px}.product-details__issues p{display:grid;gap:5px;margin:0;font-size:12px}.product-details__issues span{color:var(--text-secondary);font-size:11px;line-height:1.6}.product-details__issues :deep(.ui-button){justify-self:start}.product-details__ready{display:flex;align-items:center;gap:8px;color:var(--success);font-size:12px}.product-details__section{display:grid;gap:12px;border-top:1px solid var(--border-color);padding-top:18px}.product-details h4{display:flex;align-items:center;gap:8px;margin:0;font-size:13px}.product-details h4 svg{color:var(--text-secondary);font-size:16px}.product-details__hint{margin:0;font-size:11px;color:var(--text-secondary);line-height:1.6}.product-details__package{display:grid;grid-template-columns:1fr 110px;gap:12px}.product-details__package label{display:grid;gap:7px;font-size:11px;color:var(--text-secondary)}.product-details__package input{width:100%;min-width:0;height:36px;padding:0 10px;border:1px solid var(--border-color);border-radius:9px;color:var(--text-primary);background:var(--field-bg)}.product-details__package :deep(.ui-button){grid-column:1/-1;justify-self:start}.product-details__error{grid-column:1/-1;margin:0;color:var(--danger);font-size:11px}.product-details__link{display:grid;gap:10px}.product-details__link :deep(.ui-button){justify-self:start}.product-details dl{display:grid;gap:12px;margin:0;font-size:11px}.product-details dl>div{display:flex;justify-content:space-between;align-items:baseline;gap:20px}.product-details dt{color:var(--text-secondary);flex-shrink:0}.product-details dd{margin:0;text-align:right;overflow-wrap:anywhere}.product-details__footer{display:flex;align-items:center;justify-content:space-between;gap:12px;border-top:1px solid var(--border-color);padding-top:18px}.product-details__footer a{font-size:12px;color:var(--text-primary);text-decoration:underline;text-underline-offset:3px}@media(max-width:380px){.product-details__hero{grid-template-columns:72px minmax(0,1fr);gap:12px}.product-details__image{width:72px;height:84px}.product-details__hero h3{font-size:17px}}
</style>
