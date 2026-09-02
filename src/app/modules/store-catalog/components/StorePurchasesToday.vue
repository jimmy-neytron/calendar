<template>
  <section class="purchase-main panel">
    <header class="section-head">
      <div><small>{{ eyebrow }}</small><h2>{{ title }}</h2><p>{{ description }}</p></div>
      <label v-if="showDatePicker" class="date-field">Дата<input :value="date" type="date" @input="$emit('change-date', ($event.target as HTMLInputElement).value)" /></label>
    </header>
    <div v-if="purchases.length" class="purchase-overview">
      <div><span>{{ unresolvedCount ? 'Известная часть суммы' : 'Всего за упаковки' }}</span><strong>{{ unresolvedCount && !total ? 'Нужны цены' : formatMoney(total) }}</strong></div>
      <p>Рассчитано {{ purchases.length - unresolvedCount }} из {{ purchases.length }} позиций<span v-if="unresolvedCount">Без товара, фасовки или актуальной цены — не входят в сумму.</span><span v-else>Упаковки округлены вверх. Остатки дома не учтены.</span></p>
    </div>
    <div v-if="purchases.length > 3 || query || onlyUnresolved" class="purchase-filters">
      <UiInput v-model="query" placeholder="Найти ингредиент" aria-label="Найти ингредиент закупки" />
      <button type="button" :aria-pressed="onlyUnresolved" @click="onlyUnresolved = !onlyUnresolved">Требуют внимания · {{ unresolvedCount }}</button>
    </div>
    <IngredientPurchaseCard v-for="item in visiblePurchases" :key="item.normalizedName + ':' + item.unit" :item="item" :products="products" :saving="saving" @link="(name, unit, id) => $emit('link', name, unit, id)" @set-package="(id, amount, unit) => $emit('set-package', id, amount, unit)" />
    <div v-if="!purchases.length" class="empty-state"><UiIcon name="shopping" /><strong>Список пока пуст</strong><span>Запланируйте блюда в «Неделе» или добавьте покупку вручную.</span></div>
    <p v-else-if="!visiblePurchases.length" class="empty-state">Нет позиций по выбранному фильтру.</p>
  </section>
</template>

<script setup lang="ts">
import { computed, ref } from 'vue'
import UiIcon from '../../../components/ui/UiIcon.vue'
import UiInput from '../../../components/ui/UiInput.vue'
import IngredientPurchaseCard from './IngredientPurchaseCard.vue'
import { normalizeIngredientName } from '../services/storeCatalog.service'
import type { DailyPurchase, StorePackageUnit, StoreProduct } from '../types/storeCatalog.types'
const props = withDefaults(defineProps<{ purchases: DailyPurchase[]; products: StoreProduct[]; date?: string; total: number; unresolvedCount: number; eyebrow?: string; title?: string; description?: string; showDatePicker?: boolean; saving?: boolean }>(), {
  date: '', eyebrow: 'Расчёт закупки', title: 'Что нужно купить', description: 'Количество упаковок рассчитано по меню и фасовке товара.', showDatePicker: true,
})
defineEmits<{ 'change-date': [date: string]; link: [name: string, unit: StorePackageUnit, productId: string]; 'set-package': [id: string, amount: number, unit: StorePackageUnit] }>()
const query = ref('')
const onlyUnresolved = ref(false)
const visiblePurchases = computed(() => props.purchases.filter(item => (!onlyUnresolved.value || !item.confirmed) && normalizeIngredientName(item.name).includes(normalizeIngredientName(query.value))))
const formatMoney = (value: number) => new Intl.NumberFormat('ru-RU', { maximumFractionDigits: 2 }).format(value) + ' ₽'
</script>

<style scoped>
.purchase-main{min-width:0;padding:24px}.section-head{display:flex;align-items:center;justify-content:space-between;gap:16px;margin-bottom:22px}.section-head small{color:var(--text-muted);font-size:10px;font-weight:750;letter-spacing:.1em;text-transform:uppercase}.section-head h2{margin:6px 0;font-size:21px}.section-head p{margin:0;color:var(--text-secondary);font-size:12px;line-height:1.6}.date-field{display:grid;gap:5px;font-size:12px}.date-field input{min-height:36px;border:1px solid var(--border-color);border-radius:9px;padding:0 10px;color:var(--text-primary);background:var(--field-bg)}
.purchase-overview{display:flex;align-items:center;gap:32px;padding:18px 20px;margin-bottom:18px;border-radius:12px;background:var(--control-bg)}.purchase-overview>div{display:grid;gap:6px;min-width:160px}.purchase-overview strong{font-size:25px}.purchase-overview>div>span{font-size:11px;color:var(--text-secondary)}.purchase-overview p{margin:0;font-size:13px}.purchase-overview p span{display:block;margin-top:5px;font-size:11px;line-height:1.5;color:var(--text-muted)}
.purchase-filters{display:flex;align-items:center;gap:12px;margin-bottom:16px}.purchase-filters>button{border:1px solid var(--border-color);border-radius:9px;padding:9px 12px;background:transparent;color:var(--text-secondary);font-size:12px;white-space:nowrap}.purchase-filters>button[aria-pressed=true]{background:var(--accent-soft);color:var(--text-primary);border-color:var(--accent-border)}.empty-state{display:grid;place-items:center;align-content:center;gap:10px;min-height:200px;color:var(--text-muted);text-align:center;font-size:13px}.empty-state svg{font-size:28px}
@media(max-width:650px){.purchase-main{padding:16px}.section-head,.purchase-overview,.purchase-filters{align-items:stretch;flex-direction:column}.purchase-overview{gap:14px}.section-head h2{font-size:18px}}
</style>
