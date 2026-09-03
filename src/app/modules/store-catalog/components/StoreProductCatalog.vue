<template>
  <section class="catalog-panel panel">
    <header class="section-head">
      <div><small><UiIcon name="shopping" />Каталог для твоего меню</small><h2>Товары магазина</h2><p>Выбери товар, чтобы посмотреть подробности, уточнить фасовку или связать его с ингредиентом.</p></div>
      <span>{{ products.length }} товаров</span>
    </header>
    <StorePriceNotice :entries="withoutPrice" @select="selectedId = $event" @sources="$emit('sources')" @filter="showWithoutPrice" />
    <div class="catalog-toolbar">
      <label class="search"><UiIcon name="search" /><input v-model="query" type="search" placeholder="Название или код товара" aria-label="Найти товар в каталоге" /></label>
      <UiSelect v-model="sourceId" aria-label="Раздел каталога"><option value="">Все разделы</option><option value="without-source">Без источника</option><option v-for="source in sources" :key="source.id" :value="source.id">{{ source.name }}</option></UiSelect>
      <UiSelect v-model="packageFilter" aria-label="Фильтр фасовки"><option value="all">Любая фасовка</option><option value="known">Фасовка указана</option><option value="missing">Без фасовки</option></UiSelect>
    </div>
    <div class="catalog-filters">
      <div class="catalog-filter-tabs" aria-label="Фильтр цены"><button type="button" :aria-pressed="priceFilter === 'all'" @click="priceFilter = 'all'">Все товары <b>{{ products.length }}</b></button><button type="button" :aria-pressed="priceFilter === 'missing'" @click="priceFilter = 'missing'">Без актуальной цены <b>{{ withoutPrice.length }}</b></button></div>
      <div class="discount"><UiToggle v-model="discountOnly" label="Показывать только товары со скидкой" /><span>Только скидки</span></div>
    </div>
    <div v-if="!filtered.length" class="empty-state"><UiIcon :name="products.length ? 'search' : 'shopping'" /><strong>{{ products.length ? 'Ничего не найдено' : 'Каталог пока пуст' }}</strong><span>{{ products.length ? 'Попробуй другое название или сбрось фильтры.' : 'Добавь источник и обнови каталог, чтобы увидеть товары.' }}</span><UiButton variant="secondary" @click="products.length ? resetFilters() : $emit('sources')">{{ products.length ? 'Сбросить фильтры' : 'Настроить источники' }}</UiButton></div>
    <template v-else>
      <div v-if="chosen.length" class="catalog-selection" aria-label="Действия с выбранными товарами">
        <span aria-live="polite"><strong>{{ chosen.length }}</strong> выбрано</span>
        <UiButton v-if="chosen.length < filtered.length" size="sm" variant="ghost" :disabled="deletionBusy" @click="selectFiltered">Выбрать все {{ filtered.length }}</UiButton>
        <UiButton size="sm" variant="ghost" :disabled="deletionBusy" @click="clearSelection">Отменить</UiButton>
        <UiButton size="sm" variant="secondary" icon="trash" :disabled="deletionBusy" @click="requestRemoval(chosen)">Удалить</UiButton>
      </div>
      <div class="catalog-table">
        <div class="catalog-list-heading"><UiCheckbox :model-value="allPageSelected" :disabled="deletionBusy" label="Выбрать товары на текущей странице" @update:model-value="togglePageSelection" /><span>Товар</span><span>Фасовка</span><span>Цена</span><span>Обновление</span><span /></div>
        <ul class="catalog-list" aria-label="Товары магазина">
          <li v-for="{ product, issues } in paged" :key="product.id" class="catalog-list-item">
            <UiCheckbox input-class="product-checkbox" :model-value="checked.has(product.id)" :disabled="deletionBusy" :label="'Выбрать товар: ' + product.name" @update:model-value="toggle(product.id)" />
            <button class="product-row" type="button" :class="{ 'product-row--selected': selectedId === product.id }" :aria-label="'Открыть товар: ' + product.name" aria-haspopup="dialog" title="Открыть карточку товара" @click="selectedId = product.id">
              <span class="product-row__identity"><span class="product-row__image"><img v-if="product.imageUrl" :src="product.imageUrl" alt="" loading="lazy" /><UiIcon v-else name="shopping" /></span><span class="product-row__copy"><strong>{{ product.name }}</strong><small>Код {{ product.productCode }} · {{ product.store }} · {{ product.priceStoreCode || 'Магазин не подтверждён' }}</small></span></span>
              <span class="product-row__package"><strong>{{ product.packageAmount && product.packageUnit ? formatStoreAmount(product.packageAmount, product.packageUnit) : 'Уточните фасовку' }}</strong><small v-if="product.isWeighted">Весовой товар</small></span>
              <span class="product-row__price"><s v-if="!issues.some(issue => issue.kind === 'price') && hasStoreDiscount(product)">{{ formatStoreMoney(product.oldPrice) }}</s><strong>{{ issues.some(issue => issue.kind === 'price') ? 'Нет цены' : formatStoreMoney(product.currentPrice) }}</strong><small v-if="product.isWeighted && product.packageAmount">за {{ formatStoreAmount(product.packageAmount, product.packageUnit) }}</small><small v-if="product.isWeighted && product.unitPrice != null && !issues.some(issue => issue.kind === 'price')">{{ formatStoreMoney(product.unitPrice) }} / кг</small></span>
              <span class="product-row__updated" :title="formatStoreDate(product.priceUpdatedAt)"><span aria-hidden="true" />{{ formatStoreUpdateAge(product.priceUpdatedAt) }}</span>
              <span class="product-row__open" aria-hidden="true"><UiIcon name="right" /></span>
            </button>
            <UiButton class="product-remove" size="sm" variant="ghost" icon="trash" icon-only :aria-label="'Удалить товар: ' + product.name" title="Удалить товар" :disabled="deletionBusy" @click="requestRemoval([product])" />
          </li>
        </ul>
      </div>
      <footer class="catalog-footer"><span>Показано {{ paged.length }} из {{ filtered.length }}</span><nav v-if="pageCount > 1" class="pagination" aria-label="Страницы каталога"><UiButton variant="secondary" icon="left" icon-only title="Предыдущая страница" :disabled="page === 1" @click="page--" /><span>{{ page }} / {{ pageCount }}</span><UiButton variant="secondary" icon="right" icon-only title="Следующая страница" :disabled="page === pageCount" @click="page++" /></nav></footer>
    </template>
    <StoreProductDetailsDrawer :product="selected" :sources="sources" :requirements="requirements" :saving="saving" :deletion-disabled="deletionBusy" @remove="requestRemoval([$event])" @close="selectedId = ''" @sources="openSources" @set-package="(id, amount, unit) => $emit('set-package', id, amount, unit)" @link="(name, unit, id) => $emit('link', name, unit, id)" />
  </section>
</template>

<script setup lang="ts">
import { computed, toRef } from 'vue'
import UiButton from '../../../components/ui/UiButton.vue'
import UiCheckbox from '../../../components/ui/UiCheckbox.vue'
import UiIcon from '../../../components/ui/UiIcon.vue'
import UiSelect from '../../../components/ui/UiSelect.vue'
import UiToggle from '../../../components/ui/UiToggle.vue'
import StorePriceNotice from './StorePriceNotice.vue'
import StoreProductDetailsDrawer from './StoreProductDetailsDrawer.vue'
import { useStoreProductCatalog } from '../composables/useStoreProductCatalog'
import { useStoreProductSelection } from '../composables/useStoreProductSelection'
import { formatStoreAmount, formatStoreDate, formatStoreMoney, formatStoreUpdateAge, hasStoreDiscount } from '../services/storeProductPresentation'
import type { DailyIngredientRequirement, StoreCatalogSource, StorePackageUnit, StoreProduct } from '../types/storeCatalog.types'
const props = defineProps<{ products: StoreProduct[]; sources: StoreCatalogSource[]; requirements: DailyIngredientRequirement[]; saving?: boolean; syncing?: boolean }>()
const emit = defineEmits<{ 'start-link': [product: StoreProduct]; 'set-package': [productId: string, amount: number, unit: StorePackageUnit]; link: [name: string, unit: StorePackageUnit, productId: string]; sources: []; remove: [products: StoreProduct[]] }>()
const { query, sourceId, packageFilter, priceFilter, discountOnly, page, pageCount, paged, filtered, withoutPrice, selectedId, selected, resetFilters, showWithoutPrice } = useStoreProductCatalog(toRef(props, 'products'))
const { checked, chosen, toggle, selectPage, selectFiltered, clear: clearSelection } = useStoreProductSelection(toRef(props, 'products'), filtered)
const deletionBusy = computed(() => props.saving || props.syncing || props.sources.some(source => source.status === 'syncing'))
const allPageSelected = computed(() => paged.value.length > 0 && paged.value.every(({ product }) => checked.value.has(product.id)))
function togglePageSelection(selected: boolean) { selected ? selectPage(paged.value) : clearSelection() }
function requestRemoval(products: StoreProduct[]) {
  if (deletionBusy.value || !products.length) return
  selectedId.value = ''
  emit('remove', [...products])
}
function openSources() { selectedId.value = ''; emit('sources') }
</script>

<style scoped>
.catalog-selection{display:flex;align-items:center;gap:6px;margin-bottom:10px;border-radius:10px;padding:7px 8px 7px 12px;background:var(--control-bg)}.catalog-selection>span{margin-right:auto;color:var(--text-secondary);font-size:11px}.catalog-selection>span strong{color:var(--text-primary);font-variant-numeric:tabular-nums}.catalog-table{overflow:hidden;border:1px solid var(--border-color);border-radius:13px;background:var(--card-solid)}.catalog-list-item{display:grid;grid-template-columns:20px minmax(0,1fr) 30px;align-items:center;gap:10px;min-width:0;padding:5px 10px;transition:background-color .14s}.catalog-list-item:hover{background:color-mix(in srgb,var(--control-bg) 72%,transparent)}.catalog-list-item:has(.product-row--selected){background:var(--accent-soft)}.product-remove{width:30px;color:var(--text-muted);opacity:0;transition:opacity .14s,color .14s,background-color .14s}.catalog-list-item:hover .product-remove,.product-remove:focus-visible{opacity:1}.product-remove:hover:not(:disabled){color:var(--danger);background:color-mix(in srgb,var(--danger) 8%,transparent)}
.catalog-panel{min-width:0;padding:24px}.section-head{display:flex;align-items:center;justify-content:space-between;gap:18px}.section-head>div{min-width:0}.section-head small{display:flex;align-items:center;gap:7px;color:var(--text-secondary);font-size:10px;font-weight:750;text-transform:uppercase;letter-spacing:.1em}.section-head small svg{font-size:15px}.section-head h2{margin:8px 0;font-size:25px;letter-spacing:-.03em}.section-head p{margin:0;max-width:650px;color:var(--text-secondary);font-size:12px;line-height:1.6}.section-head>span{flex-shrink:0;border:1px solid var(--border-color);border-radius:99px;padding:7px 10px;color:var(--text-secondary);font-size:11px}
.catalog-toolbar{display:grid;grid-template-columns:minmax(200px,1fr) 200px 180px;gap:10px;margin:22px 0 12px}.search{display:flex;align-items:center;gap:8px;min-height:36px;border:1px solid var(--border-color);border-radius:9px;padding:0 12px;color:var(--text-muted);background:var(--field-bg)}.search input{width:100%;min-width:0;min-height:36px;border:0;outline:0;color:var(--text-primary);background:transparent;font-size:12px}.search:focus-within{outline:2px solid var(--accent);outline-offset:2px}.catalog-filters{display:flex;align-items:center;justify-content:space-between;gap:12px;margin-bottom:18px}.catalog-filter-tabs{display:flex;gap:4px;flex-wrap:wrap}.catalog-filter-tabs button{min-height:36px;border:1px solid transparent;border-radius:9px;padding:7px 11px;color:var(--text-secondary);background:transparent;font-size:11px}.catalog-filter-tabs button[aria-pressed=true]{border-color:var(--accent-border);color:var(--text-primary);background:var(--accent-soft)}.catalog-filter-tabs b{margin-left:6px;font-size:10px;font-weight:500;color:var(--text-muted)}.discount{display:flex;align-items:center;gap:8px;min-height:36px;color:var(--text-secondary);font-size:11px;white-space:nowrap}
.catalog-list-heading{display:grid;grid-template-columns:20px minmax(240px,1fr) 120px 110px 145px 72px;align-items:center;gap:14px;min-height:38px;padding:0 10px;border-bottom:1px solid var(--border-color);color:var(--text-muted);background:color-mix(in srgb,var(--control-bg) 55%,transparent);font-size:9px}.catalog-list-heading>span:nth-child(4){text-align:right}.catalog-list{margin:0;padding:0;list-style:none}.catalog-list li+li{border-top:1px solid color-mix(in srgb,var(--border-color) 75%,transparent)}.product-row{display:grid;grid-template-columns:minmax(240px,1fr) 120px 110px 145px 30px;align-items:center;gap:14px;width:100%;min-width:0;border:0;border-radius:8px;padding:5px 4px;background:transparent;color:var(--text-primary);text-align:left}.product-row:focus-visible{outline:2px solid var(--accent);outline-offset:0}.product-row__identity{display:flex;align-items:center;gap:11px;min-width:0}.product-row__image{display:grid;place-items:center;flex-shrink:0;width:42px;height:46px;overflow:hidden;border:1px solid var(--border-color);border-radius:9px;background:var(--card-soft);color:var(--text-muted);font-size:18px}.product-row__image img{width:100%;height:100%;object-fit:contain}.product-row__copy{display:grid;gap:4px;min-width:0}.product-row__copy strong{overflow:hidden;font-size:12px;font-weight:650;line-height:1.35;text-overflow:ellipsis;white-space:nowrap}.product-row__copy small{overflow:hidden;color:var(--text-muted);font-size:8px;line-height:1.4;text-overflow:ellipsis;white-space:nowrap}.product-row__package{display:grid;gap:3px;color:var(--text-secondary)}.product-row__package strong{font-size:10px;font-weight:600}.product-row__package small{color:var(--text-muted);font-size:8px}.product-row__price{display:grid;justify-items:end;gap:2px;text-align:right}.product-row__price strong{font-size:14px;font-weight:720;font-variant-numeric:tabular-nums;letter-spacing:-.02em}.product-row__price s,.product-row__price small{color:var(--text-muted);font-size:8px;font-weight:400}.product-row__updated{display:inline-flex;align-items:center;justify-self:start;gap:7px;color:var(--text-secondary);font-size:9px;line-height:1.2}.product-row__updated>span{width:5px;height:5px;flex:0 0 auto;border-radius:50%;background:var(--text-muted)}.product-row__open{display:grid;width:26px;height:26px;place-items:center;justify-self:end;border-radius:8px;color:var(--text-muted);transition:color .14s,background-color .14s}.product-row__open svg{font-size:14px;transition:transform .14s}.product-row:hover .product-row__open{color:var(--text-primary);background:var(--control-bg)}.product-row:hover .product-row__open svg{transform:translateX(1px)}.catalog-footer{display:flex;align-items:center;justify-content:space-between;gap:12px;padding-top:14px;color:var(--text-muted);font-size:10px}.pagination{display:flex;align-items:center;gap:12px}.empty-state{display:grid;place-items:center;align-content:center;gap:12px;min-height:260px;color:var(--text-secondary);text-align:center}.empty-state>svg{font-size:30px}.empty-state strong{font-size:17px;color:var(--text-primary)}.empty-state span{font-size:12px}
@media(max-width:1100px){.catalog-toolbar{grid-template-columns:1fr 1fr}.search{grid-column:1/-1}.catalog-list-heading{grid-template-columns:20px minmax(200px,1fr) 90px 90px 125px 56px;gap:10px}.product-row{grid-template-columns:minmax(200px,1fr) 90px 90px 125px 24px;gap:10px}}
@media(max-width:820px){.catalog-panel{padding:16px}.section-head{align-items:flex-start}.section-head>span{display:none}.section-head h2{font-size:22px}.catalog-filters{align-items:flex-start;flex-direction:column;gap:8px}.catalog-selection{flex-wrap:wrap}.catalog-list-heading{display:none}.catalog-list-item{grid-template-columns:18px minmax(0,1fr) 28px;gap:7px;padding:9px 7px}.product-remove{opacity:1}.product-row{grid-template-columns:minmax(0,1fr) 88px;grid-template-rows:auto auto auto;gap:7px 9px;padding:3px}.product-row__identity{grid-column:1;grid-row:1;gap:9px}.product-row__image{width:42px;height:46px;border-radius:9px}.product-row__copy strong{font-size:12px}.product-row__copy small{font-size:8px}.product-row__package{grid-column:1;grid-row:2;padding-left:51px}.product-row__price{grid-column:2;grid-row:1;align-self:center}.product-row__price strong{font-size:13px}.product-row__updated{grid-column:1/-1;grid-row:3;margin-left:51px}.product-row__open{display:none}.catalog-filter-tabs button{padding:7px 9px}}
</style>
