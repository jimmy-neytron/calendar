<template>
  <section class="meal-cost-planner">
    <nav v-if="pricingEnabled" class="cost-sections" aria-label="Расчёт и настройки каталога">
      <button :class="{ active: section === 'estimate' }" @click="section = 'estimate'"><UiIcon name="wallet" />Список покупок<b>{{ purchases.length }}</b></button>
      <button :class="{ active: section === 'catalog' }" @click="section = 'catalog'"><UiIcon name="table" />Товары магазина<b>{{ catalog.products.value.length }}</b></button>
      <button :class="{ active: section === 'sources' }" @click="section = 'sources'"><UiIcon name="link" />Источники цен<b>{{ catalog.sources.value.length }}</b></button>
    </nav>

    <div v-if="pricingEnabled && catalog.loading.value" class="catalog-notice"><UiIcon name="refresh" /><span>Обновляем цены. Список уже доступен.</span></div>
    <div v-if="pricingEnabled && catalog.error.value" class="catalog-notice"><UiIcon name="warning" /><span>Цены недоступны: {{ catalog.error.value }}. Список можно использовать без расчёта.</span><UiButton size="sm" variant="secondary" @click="catalog.loadCatalog">Повторить</UiButton></div>

    <div class="cost-content">
      <section v-if="section === 'estimate'" class="estimate-view">
        <nav class="period-picker" aria-label="Период расчёта">
          <button :class="{ active: period === 'week' }" :aria-pressed="period === 'week'" @click="period = 'week'"><strong><UiIcon name="calendar" /> Вся неделя</strong><span>{{ weekLabel }}</span></button>
          <button v-for="day in days" :key="day.key" :class="{ active: period === day.key, today: day.isToday }" :aria-pressed="period === day.key" @click="period = day.key"><strong>{{ day.isToday ? 'Сегодня' : day.weekday }}</strong><span>{{ day.dayLabel }}</span></button>
        </nav>
        <div v-if="pricingEnabled && !catalog.loading.value && !catalog.error.value && !catalog.sources.value.length" class="setup-hint panel"><UiIcon name="link" /><div><strong>Хочешь рассчитать бюджет?</strong><span>Подключи каталог магазина. Список и отметки покупок работают и без него.</span></div><UiButton size="sm" variant="secondary" @click="section = 'sources'">Настроить</UiButton></div>
        <StorePurchasesToday
          :purchases="purchases"
          :products="catalog.products.value"
          :total="confirmedTotal"
          :unresolved-count="unresolvedCount"
          :show-date-picker="false"
          :pricing-enabled="pricingEnabled"
          :checklist-scope="`${week.workspaceId}:${weekStart}:${period}`"
          :eyebrow="period === 'week' ? 'Закупка на неделю' : 'Закупка на день'"
          :title="periodTitle"
          :description="periodDescription"
          :saving="catalog.saving.value"
          @link="linkProduct"
          @set-package="setPackage"
        >
          <template #actions><UiButton v-if="canAdd" icon="plus" :disabled="saving || (period !== 'week' && period < shoppingMinDate)" :title="period !== 'week' && period < shoppingMinDate ? 'Выбери сегодня или будущий день' : ''" @click="$emit('add', period)">Добавить продукт</UiButton></template>
          <template #empty-actions><UiButton variant="secondary" icon="calendar" @click="$emit('plan')">Перейти к меню</UiButton></template>
        </StorePurchasesToday>
        <slot name="extra" :period="period" />
      </section>
      <StoreProductCatalog v-else-if="section === 'catalog'" :products="catalog.products.value" :sources="catalog.sources.value" :requirements="requirements" :saving="catalog.saving.value" :syncing="Boolean(catalog.syncingSourceId.value)" @remove="productsToDelete = $event" @start-link="openLinkDialog" @set-package="setPackage" @link="linkProduct" @sources="section = 'sources'" />
      <StoreCatalogSources v-else :sources="catalog.sources.value" :saving="catalog.saving.value" :syncing-source-id="catalog.syncingSourceId.value" @create="openNewSource" @toggle="toggleSource" @sync="syncSource" @edit="openSourceEditor" @remove="sourceRemoval = { source: $event, clearProducts: false }" @clear="sourceRemoval = { source: $event, clearProducts: true }" />
    </div>

    <StoreSourceEditorModal v-if="editingSource || creatingSource" :key="editingSource?.id || 'new'" :source="editingSource || undefined" :saving="catalog.saving.value" :server-error="sourceFormError" @close="closeSourceEditor" @save="saveSource" />
    <StoreProductsDeleteModal v-if="productsToDelete.length" :products="productsToDelete" :saving="catalog.saving.value" @close="productsToDelete = []" @confirm="confirmProductRemoval" />
    <StoreSourceDeleteModal v-if="sourceRemoval" :source="sourceRemoval.source" :clear-products="sourceRemoval.clearProducts" :saving="catalog.saving.value" @close="sourceRemoval = null" @confirm="confirmSourceRemoval" />

    <UiModal v-model="linkDialogOpen" title="Связать товар с ингредиентом" width="460px">
      <div class="link-dialog">
        <p><strong>{{ selectedProduct?.name }}</strong><span>Связь будет использоваться во всех неделях этого пространства.</span></p>
        <label>Ингредиент<UiSelect v-model="selectedRequirementKey" aria-label="Ингредиент для товара" searchable search-placeholder="Найти ингредиент"><option value="">Выберите ингредиент</option><option v-for="item in requirements" :key="`${item.normalizedName}:${item.unit}`" :value="`${item.normalizedName}:${item.unit}`">{{ item.name }} · {{ unitLabel(item.unit) }}</option></UiSelect></label>
        <div><UiButton variant="secondary" @click="linkDialogOpen = false">Отмена</UiButton><UiButton :disabled="!selectedRequirementKey" :loading="catalog.saving.value" @click="saveDialogLink">Связать</UiButton></div>
      </div>
    </UiModal>
  </section>
</template>

<script setup lang="ts">
import { computed, onMounted, ref, watch } from 'vue'
import UiButton from '../../../components/ui/UiButton.vue'
import UiIcon from '../../../components/ui/UiIcon.vue'
import UiSelect from '../../../components/ui/UiSelect.vue'
import UiModal from '../../../components/ui/UiModal.vue'
import { useNotification } from '../../../composables/ui/useNotification.js'
import StoreCatalogSources from '../../store-catalog/components/StoreCatalogSources.vue'
import StoreSourceEditorModal from '../../store-catalog/components/StoreSourceEditorModal.vue'
import StoreSourceDeleteModal from '../../store-catalog/components/StoreSourceDeleteModal.vue'
import StoreProductCatalog from '../../store-catalog/components/StoreProductCatalog.vue'
import StoreProductsDeleteModal from '../../store-catalog/components/StoreProductsDeleteModal.vue'
import StorePurchasesToday from '../../store-catalog/components/StorePurchasesToday.vue'
import { useStoreCatalog } from '../../store-catalog/composables/useStoreCatalog'
import { calculateDailyPurchases, getDailyRequirements, getWeekRequirements } from '../../store-catalog/services/storeCatalog.service'
import type { StoreCatalogSource, StorePackageUnit, StoreProduct, StoreSourceDraft } from '../../store-catalog/types/storeCatalog.types'
import { mealPlanStore } from '../stores/mealPlan.store'
import type { MealWeek } from '../types/meals.types'

interface WeekDay { key: string; weekday: string; dayLabel: string; isToday: boolean }
const props = withDefaults(defineProps<{ week: MealWeek; weekStart: string; weekLabel: string; days: WeekDay[]; pricingEnabled?: boolean; canAdd?: boolean; saving?: boolean; shoppingMinDate?: string }>(), { pricingEnabled: true, shoppingMinDate: '' })
defineEmits<{ add: [period: string]; plan: [] }>()
const catalog = useStoreCatalog()
const { notify } = useNotification()
const section = ref<'estimate' | 'catalog' | 'sources'>('estimate')
const period = ref('week')
const linkDialogOpen = ref(false)
const selectedProduct = ref<StoreProduct | null>(null)
const selectedRequirementKey = ref('')
const productsToDelete = ref<StoreProduct[]>([])
const editingSource = ref<StoreCatalogSource | null>(null)
const creatingSource = ref(false)
const sourceFormError = ref('')
const sourceRemoval = ref<{ source: StoreCatalogSource; clearProducts: boolean } | null>(null)

const requirements = computed(() => period.value === 'week'
  ? getWeekRequirements(props.week, props.weekStart, mealPlanStore.recipeById.value)
  : getDailyRequirements(props.week, period.value, mealPlanStore.recipeById.value))
const purchases = computed(() => calculateDailyPurchases(requirements.value, catalog.links.value, catalog.products.value))
const confirmedTotal = computed(() => purchases.value.reduce((sum, item) => sum + (item.lineTotal || 0), 0))
const unresolvedCount = computed(() => purchases.value.filter((item) => !item.confirmed).length)
const selectedDay = computed(() => props.days.find((day) => day.key === period.value))
const periodTitle = computed(() => period.value === 'week' ? 'Всё для меню недели' : `Закупка на ${selectedDay.value?.dayLabel || ''}`)
const periodDescription = computed(() => period.value === 'week'
  ? 'Продукты из меню и твои дополнения — в одном списке. Отмечай то, что уже в корзине.'
  : 'Показаны ингредиенты только для блюд и ручных покупок выбранного дня.')

async function action(run: () => Promise<unknown>, success: string) {
  try { await run(); notify(success, 'success'); return true }
  catch (reason) { notify(reason instanceof Error ? reason.message : 'Не удалось выполнить действие', 'danger'); return false }
}
function linkProduct(name: string, unit: StorePackageUnit, productId: string) {
  void action(() => catalog.linkProduct(name, unit, productId), productId ? 'Товар привязан к ингредиенту' : 'Связь с товаром удалена')
}
function setPackage(productId: string, amount: number, unit: StorePackageUnit) { void action(() => catalog.setPackage(productId, amount, unit), 'Фасовка сохранена') }
function toggleSource(id: string, enabled: boolean) { void action(() => catalog.toggleSource(id, enabled), enabled ? 'Автообновление включено' : 'Автообновление выключено') }
function syncSource(id: string) { void action(() => catalog.syncSource(id), 'Цены обновлены') }
async function confirmProductRemoval() {
  const ids = productsToDelete.value.map(product => product.id)
  if (!ids.length) return
  if (await action(() => catalog.removeProducts(ids), `Удалено товаров: ${ids.length}`)) productsToDelete.value = []
}
async function saveSource(draft: StoreSourceDraft) {
  const source = editingSource.value
  if (catalog.saving.value || (!source && !creatingSource.value)) return
  sourceFormError.value = ''
  try {
    if (source) await catalog.editSource(source.id, draft)
    else await catalog.addSource(draft)
    notify(source ? 'Источник сохранён' : 'Источник добавлен. Нажми «Обновить сейчас», чтобы загрузить товары.', 'success')
    closeSourceEditor()
  } catch (reason) {
    sourceFormError.value = reason instanceof Error ? reason.message
      : reason && typeof reason === 'object' && 'message' in reason ? String(reason.message) : 'Не удалось сохранить источник. Попробуй ещё раз.'
  }
}
function openNewSource() { sourceFormError.value = ''; editingSource.value = null; creatingSource.value = true }
function openSourceEditor(source: StoreCatalogSource) { sourceFormError.value = ''; creatingSource.value = false; editingSource.value = source }
function closeSourceEditor() {
  if (catalog.saving.value) return
  editingSource.value = null; creatingSource.value = false; sourceFormError.value = ''
}
async function confirmSourceRemoval(deleteProducts: boolean) {
  const pending = sourceRemoval.value
  if (!pending) return
  const run = () => pending.clearProducts ? catalog.clearSourceProducts(pending.source.id) : catalog.removeSource(pending.source.id, deleteProducts)
  const message = pending.clearProducts ? 'Категория очищена. Для повторной загрузки нажмите «Обновить сейчас».'
    : deleteProducts ? 'Источник и его товары удалены. Общие товары других источников сохранены.'
      : 'Источник удалён. Товары и привязки сохранены.'
  if (await action(run, message)) sourceRemoval.value = null
}
function openLinkDialog(product: StoreProduct) { selectedProduct.value = product; selectedRequirementKey.value = ''; linkDialogOpen.value = true }
async function saveDialogLink() {
  const item = requirements.value.find((value) => `${value.normalizedName}:${value.unit}` === selectedRequirementKey.value)
  if (!selectedProduct.value || !item) return
  const saved = await action(() => catalog.linkProduct(item.name, item.unit, selectedProduct.value!.id), 'Цена привязана к ингредиенту')
  if (saved) linkDialogOpen.value = false
}
const unitLabel = (unit: StorePackageUnit) => unit === 'piece' ? 'шт.' : unit === 'ml' ? 'мл' : 'г'
watch(() => props.weekStart, () => { period.value = 'week' })
onMounted(() => { if (props.pricingEnabled) void catalog.loadCatalog() })
</script>

<style scoped>
.meal-cost-planner{display:grid;gap:12px}.cost-sections{display:grid;grid-template-columns:repeat(3,1fr);gap:5px;border:1px solid var(--border-color);border-radius:11px;padding:5px;background:var(--card-solid)}.cost-sections button{display:grid;grid-template-columns:24px 1fr auto;align-items:center;gap:6px;min-height:38px;border:1px solid transparent;border-radius:8px;padding:5px 9px;color:var(--text-secondary);background:transparent;text-align:left}.cost-sections button.active{border-color:var(--accent-border);color:var(--text-primary);background:var(--accent-soft)}.cost-sections b{border-radius:99px;padding:3px 6px;color:var(--text-muted);background:var(--control-bg);font-size:11px}.estimate-view{display:grid;gap:10px}.period-picker{display:grid;grid-template-columns:1.5fr repeat(7,1fr);gap:5px;overflow:auto}.period-picker button{display:grid;gap:3px;min-width:76px;border:1px solid var(--border-color);border-radius:9px;padding:8px;color:var(--text-secondary);background:var(--card-solid);text-align:left}.period-picker button strong{text-transform:capitalize}.period-picker button span{color:var(--text-muted);font-size:9px}.period-picker button.active{border-color:var(--accent-border);color:var(--text-primary);background:var(--accent-soft)}.period-picker button.today:not(.active){border-color:color-mix(in srgb,var(--success) 28%,var(--border-color))}.setup-hint{display:grid;grid-template-columns:30px minmax(0,1fr) auto;align-items:center;gap:10px;padding:10px 12px;color:var(--info);background:color-mix(in srgb,var(--info) 6%,var(--card-solid))}.setup-hint strong,.setup-hint span{display:block}.setup-hint span{margin-top:2px;color:var(--text-secondary);font-size:12px}.cost-state{display:grid;place-items:center;gap:8px;min-height:300px;color:var(--text-secondary)}.cost-state--error svg{color:var(--danger)}.link-dialog{display:grid;gap:14px}.link-dialog p{margin:0}.link-dialog p strong,.link-dialog p span{display:block}.link-dialog p span{margin-top:4px;color:var(--text-muted);font-size:10px}.link-dialog label{display:grid;gap:5px;color:var(--text-secondary);font-size:10px;font-weight:750}.link-dialog>div{display:flex;justify-content:flex-end;gap:7px;border-top:1px solid var(--border-color);padding-top:12px}@media(max-width:800px){.period-picker{grid-template-columns:repeat(8,minmax(82px,1fr))}.setup-hint{grid-template-columns:26px 1fr}.setup-hint :deep(.ui-button){grid-column:1/-1}}@media(max-width:560px){.cost-sections button{grid-template-columns:22px 1fr}.cost-sections b{display:none}.cost-sections button{font-size:9px}}
</style>

<style scoped>
.cost-content{min-width:0}.estimate-view{gap:16px}.cost-sections{display:flex;gap:8px;border:0;border-bottom:1px solid var(--border-color);border-radius:0;padding:0 0 12px;background:transparent}.cost-sections button{display:flex;gap:8px;padding:8px 12px;border-radius:9px;font-size:12px}.cost-sections button>svg{font-size:16px}.cost-sections button.active{background:var(--card-solid);border-color:var(--border-strong)}.cost-sections b{font-size:10px}.period-picker{gap:8px}.period-picker button{min-height:66px;padding:12px;border-radius:12px}.period-picker button strong{display:flex;align-items:center;gap:4px;font-size:12px}.period-picker button span{font-size:10px}.period-picker button.active{box-shadow:inset 0 -2px 0 var(--accent)}.setup-hint{background:var(--card-soft);color:var(--text-secondary);padding:14px 18px;border-style:dashed}.setup-hint strong{font-size:12px}.setup-hint span{font-size:11px;line-height:1.5}.catalog-notice{display:flex;align-items:center;gap:10px;padding:12px;color:var(--text-secondary);font-size:12px;line-height:1.5}.catalog-notice>span{flex:1}.catalog-notice>svg{flex-shrink:0}.meal-cost-planner button:focus-visible{outline:2px solid var(--accent);outline-offset:2px}@media(max-width:560px){.cost-sections{overflow:auto;gap:4px}.cost-sections button{flex-shrink:0;font-size:11px;padding:8px}.period-picker{gap:5px}.period-picker button{padding:10px}.period-picker button:first-child{min-width:150px}.period-picker{grid-template-columns:150px repeat(7,82px)}}
</style>
