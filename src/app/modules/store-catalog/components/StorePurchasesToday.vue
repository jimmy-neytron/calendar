<template>
  <section class="purchase-main panel">
    <header class="section-head">
      <div class="section-head__copy"><small><UiIcon name="shopping" />{{ eyebrow }}</small><h2>{{ title }}</h2><p>{{ description }}</p></div>
      <div class="section-head__actions">
        <label v-if="showDatePicker" class="date-field">Дата<input :value="date" type="date" @input="$emit('change-date', ($event.target as HTMLInputElement).value)" /></label>
        <UiButton variant="secondary" icon="copy" :disabled="!remaining.length" @click="copyList">Копировать список</UiButton>
        <slot name="actions" />
      </div>
    </header>
    <div v-if="purchases.length" class="purchase-overview" :class="{ 'purchase-overview--simple': !pricingEnabled }">
      <div class="overview-progress">
        <span class="metric-label">Собираем корзину</span>
        <div class="overview-progress__value"><strong>{{ boughtCount }}<span> / {{ purchases.length }}</span></strong><span>{{ boughtCount === purchases.length ? 'Всё куплено' : 'куплено' }}</span><UiIcon v-if="boughtCount === purchases.length" name="check-circle" /></div>
        <progress :value="boughtCount" :max="purchases.length" aria-label="Прогресс закупки" />
      </div>
      <div v-if="pricingEnabled" class="overview-cost"><span class="metric-label">{{ unresolvedCount ? 'Известная часть суммы' : 'Плановая стоимость' }}</span><strong>{{ unresolvedCount && !total ? 'Нужны цены' : formatMoney(total) }}</strong><span>За весь список · с учётом упаковок</span></div>
      <button v-if="pricingEnabled" class="overview-prices" type="button" @click="filter = unresolvedCount ? 'unresolved' : 'all'">
        <UiIcon :name="unresolvedCount ? 'warning' : 'check-circle'" />
        <span><strong>{{ unresolvedCount ? 'Без расчёта: ' + unresolvedCount : 'Все цены рассчитаны' }}</strong><small>{{ unresolvedCount ? 'Уточнить товары, цены и фасовку' : 'Фактическая сумма зависит от магазина' }}</small></span><UiIcon name="right" />
      </button>
      <p v-else class="overview-hint">Отмечай продукты по мере покупки.<br>Одинаковые ингредиенты уже объединены.</p>
    </div>
    <template v-if="purchases.length">
      <div class="purchase-filters">
        <div class="filter-tabs" aria-label="Фильтр списка">
          <button v-for="option in filterOptions" :key="option.id" type="button" :aria-pressed="filter === option.id" @click="filter = option.id">{{ option.label }}<span>{{ option.count }}</span></button>
        </div>
        <UiInput v-model="query" placeholder="Найти продукт…" aria-label="Найти ингредиент закупки" />
      </div>
      <div class="purchase-list">
        <IngredientPurchaseCard v-for="item in visiblePurchases" :key="purchaseKey(item)" :item="item" :products="products" :saving="saving" :bought="isBought(item)" :pricing-enabled="pricingEnabled" checkable @toggle="toggle(item)" @link="(name, unit, id) => $emit('link', name, unit, id)" @set-package="(id, amount, unit) => $emit('set-package', id, amount, unit)" />
      </div>
      <div v-if="!visiblePurchases.length" class="empty-state">
        <UiIcon :name="filter === 'remaining' && !remaining.length ? 'check-circle' : 'search'" />
        <strong>{{ filter === 'remaining' && !remaining.length ? 'Всё куплено. Можно готовить!' : 'Нет подходящих продуктов' }}</strong>
        <span>{{ query ? 'Попробуй другое название или сбрось фильтры.' : 'Выбери другой фильтр, чтобы увидеть остальные позиции.' }}</span>
        <UiButton variant="secondary" @click="clearFilters">Показать весь список</UiButton>
      </div>
      <footer class="purchase-footer"><span>{{ storageUnavailable ? 'Не удалось сохранить отметки. Они доступны до закрытия раздела.' : 'Отметки — на этом устройстве, отдельно для каждого периода.' }}</span><button v-if="boughtCount" type="button" @click="reset">Снять отметки</button></footer>
    </template>
    <div v-else class="empty-state empty-state--new"><span class="empty-state__icon"><UiIcon name="shopping" /></span><strong>Начнём со списка</strong><span>Добавь продукты вручную или запланируй блюда.<br>Ингредиенты из меню появятся здесь автоматически.</span><slot name="empty-actions" /></div>
    <p v-if="copyStatus" class="copy-status" role="status">{{ copyStatus }}</p>
  </section>
</template>

<script setup lang="ts">
import { computed, ref, toRef, watch } from 'vue'
import UiButton from '../../../components/ui/UiButton.vue'
import UiIcon from '../../../components/ui/UiIcon.vue'
import UiInput from '../../../components/ui/UiInput.vue'
import IngredientPurchaseCard from './IngredientPurchaseCard.vue'
import { purchaseKey, usePurchaseChecklist, type PurchaseFilter } from '../composables/usePurchaseChecklist'
import type { DailyPurchase, StorePackageUnit, StoreProduct } from '../types/storeCatalog.types'
const props = withDefaults(defineProps<{ purchases: DailyPurchase[]; products: StoreProduct[]; date?: string; total: number; unresolvedCount: number; eyebrow?: string; title?: string; description?: string; showDatePicker?: boolean; saving?: boolean; pricingEnabled?: boolean; checklistScope?: string }>(), {
  date: '', eyebrow: 'Расчёт закупки', title: 'Что нужно купить', description: 'Количество упаковок рассчитано по меню и фасовке товара.', showDatePicker: true, pricingEnabled: true, checklistScope: '',
})
defineEmits<{ 'change-date': [date: string]; link: [name: string, unit: StorePackageUnit, productId: string]; 'set-package': [id: string, amount: number, unit: StorePackageUnit] }>()
const { query, filter, storageUnavailable, isBought, boughtCount, remaining, visiblePurchases, toggle, reset, clearFilters, copyText } = usePurchaseChecklist(toRef(props, 'purchases'), toRef(props, 'checklistScope'))
const filterOptions = computed<Array<{ id: PurchaseFilter; label: string; count: number }>>(() => [
  { id: 'all', label: 'Все', count: props.purchases.length },
  { id: 'remaining', label: 'Купить', count: remaining.value.length },
  { id: 'bought', label: 'Куплено', count: boughtCount.value },
  ...(props.pricingEnabled ? [{ id: 'unresolved' as const, label: 'Без расчёта', count: props.unresolvedCount }] : []),
])
const copyStatus = ref('')
watch(() => props.checklistScope, () => { copyStatus.value = '' })
async function copyList() {
  try { await navigator.clipboard.writeText(copyText(props.title)); copyStatus.value = 'Список скопирован — только то, что осталось купить.' }
  catch { copyStatus.value = 'Не удалось скопировать список. Разреши доступ к буферу обмена в браузере.' }
}
const formatMoney = (value: number) => new Intl.NumberFormat('ru-RU', { maximumFractionDigits: 2 }).format(value) + ' ₽'
</script>

<style scoped>
.purchase-main{min-width:0;overflow:hidden;padding:24px}.section-head{display:flex;align-items:center;justify-content:space-between;gap:20px;margin-bottom:24px}.section-head__copy{min-width:0}.section-head small{display:flex;align-items:center;gap:7px;color:var(--text-secondary);font-size:10px;font-weight:750;letter-spacing:.09em;text-transform:uppercase}.section-head small svg{font-size:15px}.section-head h2{margin:9px 0 7px;font-size:25px;letter-spacing:-.04em;line-height:1.2}.section-head p{max-width:510px;margin:0;color:var(--text-secondary);font-size:12px;line-height:1.6}.section-head__actions{display:flex;flex-wrap:wrap;gap:8px;justify-content:flex-end}.date-field{display:grid;gap:5px;font-size:12px}.date-field input{min-height:36px;border:1px solid var(--border-color);border-radius:9px;padding:0 10px;color:var(--text-primary);background:var(--field-bg)}
.purchase-overview{display:grid;grid-template-columns:1fr 1fr 1.2fr;gap:24px;align-items:center;padding:22px;margin-bottom:24px;border:1px solid var(--border-color);border-radius:16px;background:linear-gradient(115deg,color-mix(in srgb,var(--success) 6%,var(--card-soft)),var(--card-soft))}.purchase-overview--simple{grid-template-columns:1fr 1fr}.metric-label{color:var(--text-secondary);font-size:11px}.overview-progress{display:grid;gap:10px}.overview-progress__value{display:flex;align-items:baseline;gap:8px}.overview-progress__value>strong{font-size:28px;line-height:1;letter-spacing:-.04em}.overview-progress__value strong span{font-size:18px;color:var(--text-muted);font-weight:500}.overview-progress__value>span{color:var(--text-secondary);font-size:11px}.overview-progress__value svg{color:var(--success)}progress{width:100%;height:5px;border:0;border-radius:8px;overflow:hidden;appearance:none;background:var(--border-color);color:var(--success)}progress::-webkit-progress-bar{background:var(--border-color)}progress::-webkit-progress-value{background:var(--success);border-radius:8px}progress::-moz-progress-bar{background:var(--success)}.overview-cost{display:grid;gap:7px;padding-left:24px;border-left:1px solid var(--border-color)}.overview-cost>strong{font-size:26px;letter-spacing:-.04em}.overview-cost>span:last-child{font-size:10px;color:var(--text-secondary)}.overview-prices{display:flex;align-items:center;gap:12px;border:0;background:transparent;color:var(--text-primary);text-align:left;padding:8px 0}.overview-prices>svg:first-child{flex-shrink:0;color:var(--warning);font-size:21px}.overview-prices>svg:last-child{color:var(--text-muted);flex-shrink:0}.overview-prices span{display:grid;gap:6px;flex:1}.overview-prices strong{font-size:12px}.overview-prices small,.overview-hint{font-size:11px;line-height:1.5;color:var(--text-secondary)}
.purchase-filters{display:flex;align-items:center;justify-content:space-between;gap:16px;margin-bottom:18px}.filter-tabs{display:flex;gap:4px;flex-wrap:wrap}.filter-tabs button{display:flex;align-items:center;gap:7px;border:1px solid transparent;border-radius:9px;min-height:36px;padding:6px 10px;background:transparent;color:var(--text-secondary);font-size:12px;white-space:nowrap}.filter-tabs button[aria-pressed=true]{background:var(--accent-soft);color:var(--text-primary);border-color:var(--accent-border)}.filter-tabs span{font-size:10px;color:var(--text-muted);font-variant-numeric:tabular-nums}.purchase-filters :deep(.ui-input){width:220px;flex-shrink:0}.purchase-list{display:grid;gap:8px}.purchase-footer{display:flex;align-items:center;justify-content:space-between;gap:12px;padding-top:18px;color:var(--text-muted);font-size:10px;line-height:1.5}.purchase-footer button{border:0;background:none;color:var(--text-secondary);font:inherit;text-decoration:underline;white-space:nowrap;padding:5px}.empty-state{display:grid;justify-items:center;align-content:center;gap:12px;min-height:240px;padding:20px;color:var(--text-secondary);text-align:center;font-size:12px;line-height:1.6}.empty-state>strong{font-size:18px;color:var(--text-primary)}.empty-state>svg{font-size:26px;color:var(--success)}.empty-state__icon{display:grid;place-items:center;width:60px;height:60px;background:var(--accent-soft);border-radius:20px;color:var(--accent);font-size:28px;margin-bottom:4px}.copy-status{margin:14px 0 0;color:var(--text-secondary);font-size:12px}.purchase-main button:focus-visible{outline:2px solid var(--accent);outline-offset:3px}
@media(max-width:1050px){.section-head{align-items:flex-start;flex-direction:column}.section-head__actions{justify-content:flex-start}.purchase-overview{grid-template-columns:1fr 1fr;gap:18px}.overview-prices{grid-column:1/-1;border-top:1px solid var(--border-color);padding-top:15px}.purchase-filters{align-items:stretch;flex-direction:column}.purchase-filters :deep(.ui-input){width:100%}}
@media(max-width:560px){.purchase-main{padding:16px}.section-head h2{font-size:22px}.section-head__actions{width:100%}.section-head__actions :deep(.ui-button){flex:1;min-height:40px}.purchase-overview{padding:16px;gap:16px}.overview-cost{padding-left:16px}.overview-cost>strong{font-size:22px}.purchase-overview--simple{grid-template-columns:1fr}.overview-hint{margin:0}.filter-tabs{gap:2px}.filter-tabs button{font-size:11px;padding:6px 8px;min-height:40px}.purchase-footer{align-items:flex-start;flex-direction:column}}
</style>
