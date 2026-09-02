<template>
  <section class="catalog-panel panel">
    <header class="section-head"><div><small>Для ингредиентов ваших блюд</small><h2>Товары магазина</h2><p>Цена зависит от магазина и режима покупки. Снимки старше суток не участвуют в расчёте меню.</p></div><span>{{ filtered.length }} из {{ products.length }}</span></header>
    <p v-if="products.some(product => !product.priceVerified)" class="price-notice">Есть товары без подтверждённой цены. Обновите источники: старый импорт, недоступные и весовые товары не включаются в итог.</p>
    <div class="catalog-toolbar">
      <label class="search"><UiIcon name="search"/><input v-model="query" type="search" placeholder="Название или код товара" /></label>
      <UiSelect v-model="sourceId" aria-label="Раздел каталога"><option value="">Все разделы</option><option v-for="source in sources" :key="source.id" :value="source.id">{{ source.name }}</option></UiSelect>
      <UiSelect v-model="packageFilter" aria-label="Фильтр фасовки"><option value="all">Любая фасовка</option><option value="known">Фасовка указана</option><option value="missing">Без фасовки</option></UiSelect>
      <label class="discount"><input v-model="discountOnly" type="checkbox" /> Только скидки</label>
    </div>
    <div v-if="!filtered.length" class="empty-state"><UiIcon name="search"/><strong>Товары не найдены</strong><span>Измените фильтры или синхронизируйте источник.</span></div>
    <div v-else class="product-grid">
      <article v-for="product in paged" :key="product.id" class="product-card">
        <div class="product-image"><img v-if="product.imageUrl" :src="product.imageUrl" :alt="product.name" loading="lazy"/><UiIcon v-else name="shopping"/></div>
        <div class="product-copy"><small>{{ product.store }} · {{ product.priceStoreCode || 'Магазин не подтверждён' }} · {{ product.sourceIds.length }} разд.</small><h3>{{ product.name }}</h3><span>Код {{ product.productCode }}</span><p>{{ product.packageAmount ? formatAmount(product.packageAmount, product.packageUnit) : 'Уточните фасовку' }}</p><small v-if="product.priceStoreType">{{ product.priceCatalogType === '3' ? 'Самовывоз' : 'Доставка' }} · {{ product.priceStoreType }}</small></div>
        <div class="product-price"><s v-if="hasDiscount(product)">{{ formatMoney(product.oldPrice) }}</s><strong>{{ formatMoney(product.currentPrice) }}</strong><small>{{ formatDate(product.priceUpdatedAt) }}</small><small v-if="!product.priceVerified">Не включена в расчёт</small></div>
        <footer>
          <a v-if="product.priceStoreCode && product.productUrl" :href="product.productUrl" target="_blank" rel="noopener noreferrer">В Магните ↗</a>
          <button type="button" @click="startPackageEdit(product)"><UiIcon name="ruler"/> Фасовка</button>
          <button type="button" :disabled="!requirements.length" @click="$emit('start-link', product)"><UiIcon name="link"/> Связать</button>
        </footer>
        <form v-if="editingId === product.id" class="package-editor" @submit.prevent="savePackage(product.id)">
          <input v-model.number="packageAmount" type="number" min="0.01" step="0.01" required />
          <UiSelect v-model="packageUnit" aria-label="Единица фасовки"><option value="g">г</option><option value="ml">мл</option><option value="piece">шт.</option></UiSelect>
          <button type="submit">Сохранить</button>
        </form>
      </article>
    </div>
    <footer v-if="pageCount > 1" class="pagination"><button :disabled="page === 1" @click="page--">Назад</button><span>{{ page }} / {{ pageCount }}</span><button :disabled="page === pageCount" @click="page++">Дальше</button></footer>
  </section>
</template>

<script setup lang="ts">
import { computed, ref, watch } from 'vue'
import UiIcon from '../../../components/ui/UiIcon.vue'
import UiSelect from '../../../components/ui/UiSelect.vue'
import type { DailyIngredientRequirement, StoreCatalogSource, StorePackageUnit, StoreProduct } from '../types/storeCatalog.types'
const props = defineProps<{ products: StoreProduct[]; sources: StoreCatalogSource[]; requirements: DailyIngredientRequirement[] }>()
const emit = defineEmits<{ 'start-link': [product: StoreProduct]; 'set-package': [productId: string, amount: number, unit: StorePackageUnit] }>()
const query=ref(''),sourceId=ref(''),packageFilter=ref('all'),discountOnly=ref(false),page=ref(1),editingId=ref(''),packageAmount=ref(0),packageUnit=ref<StorePackageUnit>('g');const pageSize=24
const hasDiscount=(p:StoreProduct)=>p.oldPrice!=null&&p.currentPrice!=null&&p.oldPrice>p.currentPrice
const filtered=computed(()=>{const q=query.value.toLocaleLowerCase('ru-RU').trim();return props.products.filter(p=>(!q||p.name.toLocaleLowerCase('ru-RU').includes(q)||p.productCode.includes(q))&&(!sourceId.value||p.sourceIds.includes(sourceId.value))&&(packageFilter.value==='all'||(packageFilter.value==='known'&&p.packageAmount)||(packageFilter.value==='missing'&&!p.packageAmount))&&(!discountOnly.value||hasDiscount(p)))})
const pageCount=computed(()=>Math.max(1,Math.ceil(filtered.value.length/pageSize))),paged=computed(()=>filtered.value.slice((page.value-1)*pageSize,page.value*pageSize));watch([query,sourceId,packageFilter,discountOnly],()=>page.value=1)
function startPackageEdit(p:StoreProduct){editingId.value=p.id;packageAmount.value=p.packageAmount||0;packageUnit.value=p.packageUnit||'g'}function savePackage(id:string){if(packageAmount.value<=0)return;emit('set-package',id,packageAmount.value,packageUnit.value);editingId.value=''}
const formatMoney=(v:number|null)=>v==null?'Нет цены':`${new Intl.NumberFormat('ru-RU',{maximumFractionDigits:2}).format(v)} ₽`;const formatAmount=(v:number,u:StorePackageUnit|null)=>`${v} ${u==='piece'?'шт.':u==='ml'?'мл':'г'}`;const formatDate=(v:string|null)=>v?new Intl.DateTimeFormat('ru-RU',{day:'numeric',month:'short',hour:'2-digit',minute:'2-digit'}).format(new Date(v)):'Не обновлялась'
</script>

<style scoped>
.price-notice{padding:10px;border:1px solid var(--border-color);border-radius:8px;color:var(--text-secondary);font-size:11px;line-height:1.5}.product-card footer a{margin-right:auto;color:var(--info);font-size:10px;align-self:center}
.catalog-panel{padding:24px}.section-head{display:flex;align-items:center;justify-content:space-between;gap:14px}.section-head small{color:var(--info);font-size:11px;font-weight:850;text-transform:uppercase;letter-spacing:.13em}.section-head h2{margin:4px 0}.section-head p{margin:0;color:var(--text-muted);font-size:11px}.section-head>span{border:1px solid var(--border-color);border-radius:99px;padding:6px 9px;color:var(--text-secondary);font-size:10px}.catalog-toolbar{display:grid;grid-template-columns:minmax(220px,1fr) 190px 170px auto;align-items:center;gap:7px;margin:14px 0}.search,.package-editor input{min-height:36px;border:1px solid var(--border-color);border-radius:9px;color:var(--text-primary);background:var(--field-bg)}.search{display:grid;grid-template-columns:28px 1fr;align-items:center;padding:0 7px;color:var(--text-muted)}.search input{min-width:0;border:0;color:var(--text-primary);background:transparent;outline:0}.discount{display:flex;align-items:center;gap:6px;color:var(--text-secondary);font-size:10px;white-space:nowrap}.product-grid{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:12px}.product-card{position:relative;display:grid;grid-template-columns:66px minmax(0,1fr) auto;gap:10px;border:1px solid var(--border-color);border-radius:12px;padding:16px;background:var(--card-solid)}.product-image{display:grid;place-items:center;width:66px;height:72px;overflow:hidden;border-radius:9px;color:var(--text-muted);background:var(--control-bg)}.product-image img{width:100%;height:100%;object-fit:contain}.product-copy{min-width:0}.product-copy small,.product-copy span{color:var(--text-muted);font-size:10px}.product-copy h3{display:-webkit-box;overflow:hidden;margin:5px 0;font-size:14px;line-height:1.35;-webkit-box-orient:vertical;-webkit-line-clamp:3}.product-copy p{margin:5px 0 0;color:var(--text-secondary);font-size:9px}.product-price{text-align:right}.product-price>*{display:block}.product-price s{color:var(--text-muted);font-size:9px}.product-price strong{margin:3px 0;font-size:13px}.product-price small{color:var(--text-muted);font-size:8px}.product-card footer{grid-column:1/-1;display:flex;justify-content:flex-end;gap:5px;border-top:1px solid var(--border-color);padding-top:7px}.product-card footer button,.package-editor button,.pagination button{display:flex;align-items:center;gap:4px;border:1px solid var(--border-color);border-radius:7px;padding:5px 7px;color:var(--text-secondary);background:var(--control-bg);font-size:9px}.package-editor{position:absolute;z-index:2;inset:auto 7px 7px;display:grid;grid-template-columns:1fr 70px auto;gap:5px;border:1px solid var(--border-strong);border-radius:9px;padding:7px;background:var(--card-solid);box-shadow:var(--shadow-md)}.package-editor input{min-width:0;padding:0 7px}.empty-state{display:grid;place-items:center;gap:7px;min-height:300px;color:var(--text-muted);text-align:center}.empty-state span{font-size:10px}.pagination{display:flex;align-items:center;justify-content:center;gap:10px;margin-top:12px}.pagination span{color:var(--text-muted);font-size:10px}@media(max-width:1250px){.product-grid{grid-template-columns:repeat(2,minmax(0,1fr))}.catalog-toolbar{grid-template-columns:1fr 1fr}.discount{min-height:36px}}@media(max-width:700px){.product-grid,.catalog-toolbar{grid-template-columns:1fr}.product-card{grid-template-columns:58px minmax(0,1fr)}.product-price{grid-column:2;text-align:left}.section-head{align-items:flex-start}.section-head p{display:none}}
</style>
