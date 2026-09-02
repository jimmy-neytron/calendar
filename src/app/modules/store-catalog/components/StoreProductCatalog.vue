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
      <label class="discount"><input v-model="discountOnly" type="checkbox" /> Только скидки</label>
    </div>
    <div v-if="!filtered.length" class="empty-state"><UiIcon :name="products.length ? 'search' : 'shopping'" /><strong>{{ products.length ? 'Ничего не найдено' : 'Каталог пока пуст' }}</strong><span>{{ products.length ? 'Попробуй другое название или сбрось фильтры.' : 'Добавь источник и обнови каталог, чтобы увидеть товары.' }}</span><UiButton variant="secondary" @click="products.length ? resetFilters() : $emit('sources')">{{ products.length ? 'Сбросить фильтры' : 'Настроить источники' }}</UiButton></div>
    <template v-else>
      <div class="catalog-selection" aria-label="Выбор товаров для удаления">
        <span aria-live="polite">Выбрано: {{ chosen.length }}</span>
        <UiButton size="sm" variant="secondary" :disabled="deletionBusy" title="Выбрать только текущую страницу вместо предыдущего выбора" @click="selectPage(paged)">Выбрать на странице ({{ paged.length }})</UiButton>
        <UiButton size="sm" variant="secondary" :disabled="deletionBusy" title="Выбрать все результаты текущих фильтров на всех страницах" @click="selectFiltered">Выбрать все найденные ({{ filtered.length }})</UiButton>
        <UiButton v-if="chosen.length" size="sm" variant="ghost" :disabled="deletionBusy" @click="clearSelection">Снять выбор</UiButton>
        <UiButton size="sm" variant="secondary" icon="trash" :disabled="deletionBusy || !chosen.length" @click="requestRemoval(chosen)">Удалить выбранные</UiButton>
        <small class="catalog-selection__hint">Выбор страницы заменяет предыдущий выбор. «Все найденные» учитывает фильтры.</small>
      </div>
      <div class="catalog-list-heading" aria-hidden="true"><span>Товар</span><span>Фасовка</span><span>Цена</span><span>Для расчёта</span><span /></div>
      <ul class="catalog-list" aria-label="Товары магазина">
        <li v-for="{ product, issues } in paged" :key="product.id" class="catalog-list-item">
          <input class="product-checkbox" type="checkbox" :checked="checked.has(product.id)" :disabled="deletionBusy" :aria-label="'Выбрать товар: ' + product.name" @change="toggle(product.id)" />
          <button class="product-row" type="button" :class="{ 'product-row--selected': selectedId === product.id }" :aria-label="'Открыть товар: ' + product.name" aria-haspopup="dialog" @click="selectedId = product.id">
            <span class="product-row__identity"><span class="product-row__image"><img v-if="product.imageUrl" :src="product.imageUrl" alt="" loading="lazy" /><UiIcon v-else name="shopping" /></span><span class="product-row__copy"><strong>{{ product.name }}</strong><small>Код {{ product.productCode }} · {{ product.store }} · {{ product.priceStoreCode || 'Магазин не подтверждён' }}</small></span></span>
            <span class="product-row__package">{{ product.packageAmount && product.packageUnit ? formatStoreAmount(product.packageAmount, product.packageUnit) : 'Уточните фасовку' }}<small v-if="product.isWeighted">Весовой</small></span>
            <span class="product-row__price"><s v-if="!issues.some(issue => issue.kind === 'price') && hasStoreDiscount(product)">{{ formatStoreMoney(product.oldPrice) }}</s><strong>{{ issues.some(issue => issue.kind === 'price') ? 'Нет цены' : formatStoreMoney(product.currentPrice) }}</strong><small v-if="product.isWeighted && product.packageAmount">за {{ formatStoreAmount(product.packageAmount, product.packageUnit) }}</small><small v-if="product.isWeighted && product.unitPrice != null && !issues.some(issue => issue.kind === 'price')">{{ formatStoreMoney(product.unitPrice) }} / кг</small></span>
            <span class="product-row__status" :class="{ 'product-row__status--warning': issues.length }"><UiIcon :name="issues.length ? 'warning' : 'check-circle'" /><span>{{ issues[0]?.title || 'Готов к расчёту' }}</span></span>
            <UiIcon class="product-row__arrow" name="right" />
          </button>
          <UiButton class="product-remove" size="sm" variant="ghost" icon="trash" icon-only :aria-label="'Удалить товар: ' + product.name" :disabled="deletionBusy" @click="requestRemoval([product])" />
        </li>
      </ul>
      <footer class="catalog-footer"><span>Показано {{ paged.length }} из {{ filtered.length }}</span><nav v-if="pageCount > 1" class="pagination" aria-label="Страницы каталога"><UiButton variant="secondary" icon="left" icon-only title="Предыдущая страница" :disabled="page === 1" @click="page--" /><span>{{ page }} / {{ pageCount }}</span><UiButton variant="secondary" icon="right" icon-only title="Следующая страница" :disabled="page === pageCount" @click="page++" /></nav></footer>
    </template>
    <StoreProductDetailsDrawer :product="selected" :sources="sources" :requirements="requirements" :saving="saving" :deletion-disabled="deletionBusy" @remove="requestRemoval([$event])" @close="selectedId = ''" @sources="openSources" @set-package="(id, amount, unit) => $emit('set-package', id, amount, unit)" @link="(name, unit, id) => $emit('link', name, unit, id)" />
  </section>
</template>

<script setup lang="ts">
import { computed, toRef } from 'vue'
import UiButton from '../../../components/ui/UiButton.vue'
import UiIcon from '../../../components/ui/UiIcon.vue'
import UiSelect from '../../../components/ui/UiSelect.vue'
import StorePriceNotice from './StorePriceNotice.vue'
import StoreProductDetailsDrawer from './StoreProductDetailsDrawer.vue'
import { useStoreProductCatalog } from '../composables/useStoreProductCatalog'
import { useStoreProductSelection } from '../composables/useStoreProductSelection'
import { formatStoreAmount, formatStoreMoney, hasStoreDiscount } from '../services/storeProductPresentation'
import type { DailyIngredientRequirement, StoreCatalogSource, StorePackageUnit, StoreProduct } from '../types/storeCatalog.types'
const props = defineProps<{ products: StoreProduct[]; sources: StoreCatalogSource[]; requirements: DailyIngredientRequirement[]; saving?: boolean; syncing?: boolean }>()
const emit = defineEmits<{ 'start-link': [product: StoreProduct]; 'set-package': [productId: string, amount: number, unit: StorePackageUnit]; link: [name: string, unit: StorePackageUnit, productId: string]; sources: []; remove: [products: StoreProduct[]] }>()
const { query, sourceId, packageFilter, priceFilter, discountOnly, page, pageCount, paged, filtered, withoutPrice, selectedId, selected, resetFilters, showWithoutPrice } = useStoreProductCatalog(toRef(props, 'products'))
const { checked, chosen, toggle, selectPage, selectFiltered, clear: clearSelection } = useStoreProductSelection(toRef(props, 'products'), filtered)
const deletionBusy = computed(() => props.saving || props.syncing || props.sources.some(source => source.status === 'syncing'))
function requestRemoval(products: StoreProduct[]) {
  if (deletionBusy.value || !products.length) return
  selectedId.value = ''
  emit('remove', [...products])
}
function openSources() { selectedId.value = ''; emit('sources') }
</script>

<style scoped>
.catalog-selection__hint{flex-basis:100%;color:var(--text-muted);font-size:10px;line-height:1.5}
.catalog-selection{display:flex;align-items:center;flex-wrap:wrap;gap:8px;margin-bottom:12px;padding:10px;border:1px solid var(--border-color);border-radius:10px;background:var(--control-bg)}.catalog-selection>span{margin-right:auto;color:var(--text-secondary);font-size:12px}.catalog-list-item{display:grid;grid-template-columns:20px minmax(0,1fr) 28px;align-items:center;gap:6px}.product-checkbox{width:16px;height:16px;margin:0;accent-color:var(--accent)}.product-checkbox:focus-visible{outline:2px solid var(--accent);outline-offset:3px}.product-remove{color:var(--text-muted)}.product-remove:hover:not(:disabled){color:var(--danger)}.catalog-list-item .product-remove{width:28px}.catalog-list-heading{margin-left:26px;margin-right:34px}
.catalog-panel{min-width:0;padding:24px}.section-head{display:flex;align-items:center;justify-content:space-between;gap:18px}.section-head>div{min-width:0}.section-head small{display:flex;align-items:center;gap:7px;color:var(--text-secondary);font-size:10px;font-weight:750;text-transform:uppercase;letter-spacing:.1em}.section-head small svg{font-size:15px}.section-head h2{margin:8px 0;font-size:25px;letter-spacing:-.03em}.section-head p{margin:0;max-width:650px;color:var(--text-secondary);font-size:12px;line-height:1.6}.section-head>span{flex-shrink:0;border:1px solid var(--border-color);border-radius:99px;padding:7px 10px;color:var(--text-secondary);font-size:11px}
.catalog-toolbar{display:grid;grid-template-columns:minmax(200px,1fr) 200px 180px;gap:10px;margin:22px 0 12px}.search{display:flex;align-items:center;gap:8px;min-height:36px;border:1px solid var(--border-color);border-radius:9px;padding:0 12px;color:var(--text-muted);background:var(--field-bg)}.search input{width:100%;min-width:0;min-height:36px;border:0;outline:0;color:var(--text-primary);background:transparent;font-size:12px}.search:focus-within{outline:2px solid var(--accent);outline-offset:2px}.catalog-filters{display:flex;align-items:center;justify-content:space-between;gap:12px;margin-bottom:18px}.catalog-filter-tabs{display:flex;gap:4px;flex-wrap:wrap}.catalog-filter-tabs button{min-height:36px;border:1px solid transparent;border-radius:9px;padding:7px 11px;color:var(--text-secondary);background:transparent;font-size:11px}.catalog-filter-tabs button[aria-pressed=true]{border-color:var(--accent-border);color:var(--text-primary);background:var(--accent-soft)}.catalog-filter-tabs b{margin-left:6px;font-size:10px;font-weight:500;color:var(--text-muted)}.discount{display:flex;align-items:center;gap:7px;min-height:36px;font-size:11px;color:var(--text-secondary);white-space:nowrap}.discount input{width:15px;height:15px;accent-color:var(--accent)}
.catalog-list-heading,.product-row{display:grid;grid-template-columns:minmax(0,1fr) 110px 110px 155px 18px;align-items:center;gap:18px}.catalog-list-heading{padding:12px 14px;border-bottom:1px solid var(--border-color);color:var(--text-muted);font-size:10px}.catalog-list-heading>span:nth-child(3){text-align:right}.catalog-list{margin:0;padding:0;list-style:none}.catalog-list li+li{border-top:1px solid var(--border-color)}.product-row{width:100%;padding:14px;border:0;border-radius:9px;background:transparent;color:var(--text-primary);text-align:left;transition:background .15s}.product-row:hover,.product-row--selected{background:var(--control-bg)}.product-row:focus-visible{outline:2px solid var(--accent);outline-offset:-2px}.product-row__identity{display:flex;align-items:center;gap:12px;min-width:0}.product-row__image{display:grid;place-items:center;flex-shrink:0;width:46px;height:50px;overflow:hidden;border:1px solid var(--border-color);border-radius:9px;background:var(--card-soft);color:var(--text-muted);font-size:20px}.product-row__image img{width:100%;height:100%;object-fit:contain}.product-row__copy{display:grid;gap:6px;min-width:0}.product-row__copy strong{font-size:13px;font-weight:600;line-height:1.4;overflow-wrap:anywhere}.product-row__copy small{font-size:10px;color:var(--text-muted);line-height:1.4}.product-row__package{display:grid;gap:4px;color:var(--text-secondary);font-size:12px}.product-row__package small,.product-row__price small{font-size:10px;color:var(--text-muted);font-weight:400}.product-row__price{display:grid;gap:3px;text-align:right}.product-row__price strong{font-size:14px;font-variant-numeric:tabular-nums}.product-row__price s{font-size:10px;color:var(--text-muted)}.product-row__status{display:flex;align-items:center;gap:6px;color:var(--success);font-size:10px;line-height:1.4}.product-row__status svg{flex-shrink:0;font-size:14px}.product-row__status--warning{color:var(--warning)}.product-row__arrow{font-size:16px;color:var(--text-muted)}.catalog-footer{display:flex;align-items:center;justify-content:space-between;gap:12px;padding-top:16px;border-top:1px solid var(--border-color);color:var(--text-muted);font-size:11px}.pagination{display:flex;align-items:center;gap:12px}.empty-state{display:grid;place-items:center;align-content:center;gap:12px;min-height:260px;color:var(--text-secondary);text-align:center}.empty-state>svg{font-size:30px}.empty-state strong{font-size:17px;color:var(--text-primary)}.empty-state span{font-size:12px}
@media(max-width:1000px){.catalog-toolbar{grid-template-columns:1fr 1fr}.search{grid-column:1/-1}.catalog-list-heading,.product-row{grid-template-columns:minmax(0,1fr) 80px 90px 125px 14px;gap:12px}.product-row{padding:12px 8px}}
@media(max-width:700px){.catalog-panel{padding:16px}.section-head{align-items:flex-start}.section-head>span{display:none}.section-head h2{font-size:22px}.catalog-filters{align-items:flex-start;flex-direction:column;gap:4px}.catalog-list-heading{display:none}.catalog-list{border-top:1px solid var(--border-color)}.product-row{grid-template-columns:minmax(0,1fr) 85px 14px;gap:8px 10px;padding:14px 0;border-radius:0}.product-row__identity{grid-column:1;grid-row:1;gap:9px}.product-row__image{width:38px;height:44px}.product-row__copy strong{font-size:12px}.product-row__copy small{font-size:9px}.product-row__price{grid-column:2;grid-row:1}.product-row__arrow{grid-column:3;grid-row:1}.product-row__package{grid-column:1;grid-row:2;padding-left:47px;display:flex;flex-wrap:wrap;font-size:10px}.product-row__status{grid-column:1/-1;grid-row:3;padding-left:47px}.product-row__price strong{font-size:12px}.catalog-filter-tabs button{padding:7px 9px}}
@media(max-width:700px){.product-row{grid-template-columns:minmax(0,1fr) 75px}.product-row__arrow{display:none}}
</style>
