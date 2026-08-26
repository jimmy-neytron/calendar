<template>
  <section class="investments-page">
    <UiPageHeader title="Инвестиции" eyebrow="Единый портфель" description="Все активы и источники в одном месте.">
      <template #actions>
        <div class="currency-switch" aria-label="Валюта портфеля"><button v-for="currency in ['RUB', 'USD']" :key="currency" type="button" :class="{ active: displayCurrency === currency }" @click="displayCurrency = currency">{{ currency }}</button></div>
        <UiButton variant="secondary" :disabled="!spendableHoldings.length" @click="openExpense()">Списать</UiButton>
        <UiButton variant="secondary" @click="openSource()">Новый источник</UiButton>
        <UiButton :disabled="!sources.length" @click="openAddAsset()">Добавить актив</UiButton>
      </template>
    </UiPageHeader>

    <nav class="investment-tabs" aria-label="Разделы инвестиций">
      <button v-for="tab in tabs" :key="tab.value" type="button" :class="{ active: activeTab === tab.value }" @click="activeTab = tab.value">{{ tab.label }}</button>
    </nav>

    <section v-if="!sources.length" class="investment-empty panel">
      <span><UiIcon name="wallet" /></span><h2>Собери портфель из любых источников</h2><p>Создай кошелёк, биржу, счёт или место хранения наличных. После этого добавь активы — приложение объединит одинаковые позиции.</p><UiButton @click="openSource()">Создать первый источник</UiButton>
    </section>

    <template v-else-if="activeTab === 'overview'">
      <section class="portfolio-summary panel">
        <div class="portfolio-summary__main">
          <span class="portfolio-summary__eyebrow"><i /> Общая стоимость</span>
          <strong>{{ formatMoney(total) }}</strong>
          <small v-if="lastUpdatedAt">Актуально на {{ formatTime(lastUpdatedAt) }}</small><small v-else>Обнови курсы для расчёта</small>
        </div>
        <div class="portfolio-summary__metrics">
          <article>
            <span class="summary-metric__icon"><UiIcon name="activity" /></span>
            <div><small>Изменение за день</small><strong :class="changeClass(dayChange.amount)">{{ signedMoney(dayChange.amount) }}</strong><em :class="changeClass(dayChange.percent)">{{ signedPercent(dayChange.percent) }}</em></div>
          </article>
          <article>
            <span class="summary-metric__icon"><UiIcon name="chart" /></span>
            <div><small>За всё время</small><template v-if="allTimeChange.since"><strong :class="changeClass(allTimeChange.amount)">{{ signedMoney(allTimeChange.amount) }}</strong><em :class="changeClass(allTimeChange.percent)">{{ signedPercent(allTimeChange.percent) }} · с {{ formatShortDate(allTimeChange.since) }}</em></template><template v-else><strong>Нет истории</strong><em>Нужен первый снимок</em></template></div>
          </article>
          <article>
            <span class="summary-metric__icon"><UiIcon name="wallet" /></span>
            <div><small>{{ hasCost ? 'Результат инвестиций' : 'Сумма вложений' }}</small><strong v-if="hasCost" :class="changeClass(profit)">{{ signedMoney(profit) }}</strong><strong v-else>Не указана</strong><em>{{ hasCost ? `Вложено ${formatMoney(invested)}` : 'Добавляется в позиции' }}</em></div>
          </article>
        </div>
        <button type="button" class="portfolio-refresh" :disabled="isLoadingQuotes" @click="refreshMarket"><UiIcon name="refresh" /><span>{{ isLoadingQuotes ? 'Обновляю…' : 'Обновить' }}</span></button>
      </section>
      <p v-if="marketError" class="market-error"><UiIcon name="warning" /> {{ marketError }}</p>

      <div class="portfolio-grid">
        <section class="portfolio-history panel"><header><div><h2>Динамика портфеля</h2><span>Снимки сохраняются при обновлении курсов</span></div><strong>За всё время</strong></header><InvestmentHistoryChart :points="history" :currency="displayCurrency" /></section>
        <section class="portfolio-allocation panel"><header><h2>Распределение</h2><span>{{ assets.length }} активов</span></header><InvestmentAllocationChart :items="allocationItems" /><div class="allocation-list"><div v-for="item in allocationItems.slice(0, 5)" :key="item.label"><i :style="{ background: item.color }" /><span>{{ item.label }}</span><strong>{{ item.percent }}%</strong></div></div></section>
      </div>

      <section class="top-assets panel"><header><div><h2>Крупнейшие позиции</h2><span>Объединены по всем источникам</span></div><button type="button" @click="activeTab = 'assets'">Все активы →</button></header><div><button v-for="asset in assets.slice(0, 5)" :key="asset.key" type="button" @click="openAssetDetails(asset)"><span class="asset-mark">{{ asset.symbol.slice(0, 3) }}</span><div><strong>{{ asset.name }}</strong><small>{{ asset.quantity }} {{ asset.symbol }} · {{ asset.positions.length }} {{ sourceWord(asset.positions.length) }}</small></div><b>{{ formatMoney(assetValue(asset)) }}</b><em :class="changeClass(asset.change24h)">{{ signedPercent(asset.change24h) }}</em></button></div></section>
    </template>

    <InvestmentAssetsTable
      v-else-if="activeTab === 'assets'"
      :assets="assets"
      :total="total"
      :currency="displayCurrency"
      @add="openAddAsset()"
      @spend="openExpense"
      @edit="editHolding"
      @replace="replaceHolding"
      @delete="confirmHoldingDelete"
      @open-chart="openTokenChart"
    />

    <section v-else-if="activeTab === 'sources'" class="sources-section">
      <header><div><h2>Источники</h2><span>Кошельки, биржи, счета и наличные</span></div><UiButton size="sm" @click="openSource()">Добавить</UiButton></header>
      <div class="sources-grid"><article v-for="source in sourceSummaries" :key="source.id" class="source-card panel" :style="{ '--source-color': source.color }"><header><span><UiIcon :name="sourceIcon(source.type)" /></span><div><strong>{{ source.name }}</strong><small>{{ sourceTypeLabel(source.type) }}</small></div><div><UiIconButton icon="edit" label="Изменить источник" @click="openSource(source)" /><UiIconButton icon="trash" label="Удалить источник" variant="danger" @click="confirmSourceDelete(source)" /></div></header><strong>{{ formatMoney(displayCurrency === 'RUB' ? source.valueRub : source.valueUsd) }}</strong><footer><span>{{ source.positionsCount }} {{ positionWord(source.positionsCount) }}</span><button type="button" @click="openAddAsset(source.id)">+ Актив</button></footer></article></div>
    </section>

    <section v-else class="history-section panel"><header><div><h2>История портфеля</h2><span>Данные сохраняются за всё время аккаунта</span></div><strong>{{ history.length }} {{ snapshotWord(history.length) }}</strong></header><InvestmentHistoryChart :points="history" :currency="displayCurrency" /><div v-if="snapshots.length" class="snapshot-list"><div v-for="snapshot in [...snapshots].reverse().slice(0, 12)" :key="snapshot.id"><span>{{ formatDate(snapshot.capturedOn) }}</span><strong>{{ formatMoney(displayCurrency === 'RUB' ? snapshot.totalRub : snapshot.totalUsd) }}</strong><small>{{ snapshot.positions.length }} активов</small></div></div><section class="expense-history"><header><div><h3>Списания</h3><span>Покупки, переводы и комиссии</span></div><strong>{{ transactions.length ? `${formatMoney(totalSpent)} всего` : '' }}</strong></header><div v-if="transactions.length" class="expense-list"><article v-for="transaction in transactions" :key="transaction.id"><span>{{ transaction.symbol.slice(0, 3) }}</span><div><strong>{{ expenseCategoryLabel(transaction.category) }} · {{ transaction.name }}</strong><small>{{ formatDate(transaction.spentOn) }} · {{ transaction.note || sourceNameById(transaction.sourceId) }}</small></div><b>−{{ formatQuantity(transaction.quantity) }} {{ transaction.symbol }}</b><em>−{{ formatMoney(displayCurrency === 'RUB' ? transaction.valueRub : transaction.valueUsd) }}</em></article></div><div v-else class="expense-empty"><span>Списаний пока нет</span><UiButton size="sm" variant="secondary" @click="openExpense()">Добавить расход</UiButton></div></section></section>

    <InvestmentSourceModal v-model="isSourceOpen" :source="editingSource" @save="saveSource" />
    <InvestmentAssetTypeModal v-model="isAssetTypeOpen" @select="selectAssetType" />
    <InvestmentHoldingModal v-model="isHoldingOpen" :sources="sources" :holding="editingHolding" :preferred-source-id="preferredSourceId" @save="saveHolding" />
    <InvestmentReplaceTokenModal v-model="isReplaceTokenOpen" :holding="replacingHolding" @replace="saveTokenReplacement" />
    <InvestmentTokenChartModal v-model="isTokenChartOpen" :asset="chartAsset" />
    <InvestmentFiatModal v-model="isFiatOpen" :sources="sources" :holding="editingHolding" :preferred-source-id="preferredSourceId" @save="saveHolding" />
    <InvestmentExpenseModal v-model="isExpenseOpen" :holdings="spendableHoldings" :sources="sources" :preferred-holding-id="preferredExpenseHoldingId" :prices="holdingPrices" @save="saveExpense" />
    <UiConfirmModal v-model="isDeleteOpen" :title="deleteTitle" :message="deleteMessage" confirm-label="Удалить" @confirm="performDelete" />
  </section>
</template>

<script setup lang="ts">
import { computed, onMounted, ref } from 'vue'
import UiButton from '../../../components/ui/UiButton.vue'
import UiConfirmModal from '../../../components/ui/UiConfirmModal.vue'
import UiIcon from '../../../components/ui/UiIcon.vue'
import UiIconButton from '../../../components/ui/UiIconButton.vue'
import UiPageHeader from '../../../components/ui/UiPageHeader.vue'
import { useNotification } from '../../../composables/ui/useNotification.js'
import { investmentStore } from '../../../stores/investment.store'
import type { CryptoAssetSearchResult, InvestmentAssetType, InvestmentExpenseCategory, InvestmentHolding, InvestmentSource, InvestmentSourceType } from '../../../types/investment'
import type { AggregatedInvestmentAsset } from '../../../utils/investments/investmentPortfolio'
import InvestmentAllocationChart from '../components/InvestmentAllocationChart.vue'
import InvestmentAssetsTable from '../components/InvestmentAssetsTable.vue'
import InvestmentAssetTypeModal from '../components/InvestmentAssetTypeModal.vue'
import InvestmentExpenseModal from '../components/InvestmentExpenseModal.vue'
import InvestmentFiatModal from '../components/InvestmentFiatModal.vue'
import InvestmentHistoryChart from '../components/InvestmentHistoryChart.vue'
import InvestmentHoldingModal from '../components/InvestmentHoldingModal.vue'
import InvestmentReplaceTokenModal from '../components/InvestmentReplaceTokenModal.vue'
import InvestmentSourceModal from '../components/InvestmentSourceModal.vue'
import InvestmentTokenChartModal from '../components/InvestmentTokenChartModal.vue'
import { useInvestmentPortfolio } from '../composables/useInvestmentPortfolio'

type Tab = 'overview' | 'assets' | 'sources' | 'history'
const tabs: Array<{ value: Tab; label: string }> = [{ value: 'overview', label: 'Обзор' }, { value: 'assets', label: 'Активы' }, { value: 'sources', label: 'Источники' }, { value: 'history', label: 'История' }]
const colors = ['#7c8cf8', '#34d399', '#f59e0b', '#38bdf8', '#a78bfa', '#f87171', '#94a3b8']
const { notify } = useNotification()
const sources = investmentStore.sources
const holdings = investmentStore.holdings
const snapshots = investmentStore.snapshots
const transactions = investmentStore.transactions
const { displayCurrency, valuedHoldings, assets, total, invested, hasCost, profit, dayChange, allTimeChange, sourceSummaries, history, isLoadingQuotes, marketError, lastUpdatedAt, refreshMarket } = useInvestmentPortfolio()
const activeTab = ref<Tab>('overview')
const isSourceOpen = ref(false)
const isAssetTypeOpen = ref(false)
const isHoldingOpen = ref(false)
const isFiatOpen = ref(false)
const isExpenseOpen = ref(false)
const isReplaceTokenOpen = ref(false)
const isTokenChartOpen = ref(false)
const editingSource = ref<InvestmentSource | null>(null)
const editingHolding = ref<InvestmentHolding | null>(null)
const replacingHolding = ref<InvestmentHolding | null>(null)
const chartAsset = ref<AggregatedInvestmentAsset | null>(null)
const preferredSourceId = ref('')
const preferredExpenseHoldingId = ref('')
const isDeleteOpen = ref(false)
const deleteTarget = ref<{ type: 'source' | 'holding'; item: InvestmentSource | InvestmentHolding } | null>(null)
const allocationItems = computed(() => assets.value.map((asset, index) => ({ label: asset.symbol, value: assetValue(asset), color: colors[index % colors.length], percent: total.value > 0 ? Math.round(assetValue(asset) / total.value * 100) : 0 })))
const holdingPrices = computed(() => Object.fromEntries(valuedHoldings.value.map((holding) => [holding.id, { rub: holding.priceRub, usd: holding.priceUsd }])))
const spendableHoldings = computed(() => holdings.value.filter((holding) => holding.quantity > 0))
const totalSpent = computed(() => transactions.value.reduce((sum, transaction) => sum + (displayCurrency.value === 'RUB' ? transaction.valueRub : transaction.valueUsd), 0))
const deleteTitle = computed(() => deleteTarget.value?.type === 'source' ? 'Удалить источник?' : 'Удалить позицию?')
const deleteMessage = computed(() => deleteTarget.value?.type === 'source' ? `Все позиции внутри «${deleteTarget.value.item.name}» также будут удалены.` : `Позиция «${deleteTarget.value?.item.name || ''}» будет удалена из портфеля.`)

onMounted(refreshMarket)
function openSource(source?: InvestmentSource) { editingSource.value = source || null; isSourceOpen.value = true }
function openAddAsset(sourceId = '') { if (!sources.value.length) return openSource(); editingHolding.value = null; preferredSourceId.value = sourceId; isAssetTypeOpen.value = true }
function selectAssetType(type: InvestmentAssetType) { if (type === 'fiat') isFiatOpen.value = true; else isHoldingOpen.value = true }
function editHolding(holding: InvestmentHolding) { editingHolding.value = holding; preferredSourceId.value = ''; if (holding.assetType === 'fiat') isFiatOpen.value = true; else isHoldingOpen.value = true }
function replaceHolding(holding: InvestmentHolding) { replacingHolding.value = holding; isReplaceTokenOpen.value = true }
function openTokenChart(asset: AggregatedInvestmentAsset) { if (asset.assetType !== 'crypto') return; chartAsset.value = asset; isTokenChartOpen.value = true }
function openAssetDetails(asset: AggregatedInvestmentAsset) { if (asset.assetType === 'crypto') openTokenChart(asset); else activeTab.value = 'assets' }
function openExpense(holdingId = '') { if (!spendableHoldings.value.length) return; preferredExpenseHoldingId.value = holdingId; isExpenseOpen.value = true }
async function saveSource(payload: Pick<InvestmentSource, 'name' | 'type' | 'color' | 'note'>) { const result = editingSource.value ? await investmentStore.updateSource(editingSource.value.id, payload) : await investmentStore.createSource(payload); if (!result.ok) return notify(result.message, 'danger'); isSourceOpen.value = false; notify(editingSource.value ? 'Источник обновлён' : 'Источник создан', 'success') }
async function saveHolding(payload: Omit<InvestmentHolding, 'id' | 'workspaceId' | 'userId' | 'createdAt' | 'updatedAt'>) { const next = preferredSourceId.value && !editingHolding.value ? { ...payload, sourceId: preferredSourceId.value } : payload; const result = editingHolding.value ? await investmentStore.updateHolding(editingHolding.value.id, next) : await investmentStore.createHolding(next); if (!result.ok) return notify(result.message, 'danger'); isHoldingOpen.value = false; isFiatOpen.value = false; preferredSourceId.value = ''; notify(editingHolding.value ? 'Позиция обновлена' : 'Актив добавлен', 'success'); await refreshMarket() }
async function saveTokenReplacement(asset: CryptoAssetSearchResult) { if (!replacingHolding.value) return; const previousSymbol = replacingHolding.value.symbol; const result = await investmentStore.replaceHoldingAsset(replacingHolding.value.id, { assetId: asset.id, name: asset.name, symbol: asset.symbol }); if (!result.ok) return notify(result.message, 'danger'); isReplaceTokenOpen.value = false; replacingHolding.value = null; notify(`${previousSymbol} заменён на ${asset.symbol}`, 'success'); await refreshMarket() }
async function saveExpense(payload: { holdingId: string; quantity: number; category: InvestmentExpenseCategory; spentOn: string; note: string; valueRub: number; valueUsd: number }) { const result = await investmentStore.recordExpense(payload); if (!result.ok) return notify(result.message, 'danger'); isExpenseOpen.value = false; preferredExpenseHoldingId.value = ''; notify('Списание сохранено', 'success'); await refreshMarket() }
function confirmSourceDelete(source: InvestmentSource) { deleteTarget.value = { type: 'source', item: source }; isDeleteOpen.value = true }
function confirmHoldingDelete(holding: InvestmentHolding) { deleteTarget.value = { type: 'holding', item: holding }; isDeleteOpen.value = true }
async function performDelete() { if (!deleteTarget.value) return; const result = deleteTarget.value.type === 'source' ? await investmentStore.removeSource(deleteTarget.value.item.id) : await investmentStore.removeHolding(deleteTarget.value.item.id); if (!result.ok) return notify(result.message, 'danger'); isDeleteOpen.value = false; notify('Удалено', 'info') }
function assetValue(asset: AggregatedInvestmentAsset) { return displayCurrency.value === 'RUB' ? asset.valueRub : asset.valueUsd }
function formatMoney(value: number) { return new Intl.NumberFormat('ru-RU', { style: 'currency', currency: displayCurrency.value, maximumFractionDigits: displayCurrency.value === 'RUB' ? 0 : 2 }).format(Number(value) || 0) }
function signedMoney(value: number) { return `${value > 0 ? '+' : ''}${formatMoney(value)}` }
function signedPercent(value: number) { return `${value > 0 ? '+' : ''}${(Number(value) || 0).toFixed(2)}%` }
function formatQuantity(value: number) { return new Intl.NumberFormat('ru-RU', { maximumFractionDigits: 8 }).format(value) }
function formatTime(value: string) { return new Intl.DateTimeFormat('ru-RU', { hour: '2-digit', minute: '2-digit' }).format(new Date(value)) }
function formatDate(value: string) { return new Intl.DateTimeFormat('ru-RU', { day: 'numeric', month: 'long', year: 'numeric' }).format(new Date(`${value}T00:00:00`)) }
function formatShortDate(value: string) { return new Intl.DateTimeFormat('ru-RU', { day: 'numeric', month: 'short', year: 'numeric' }).format(new Date(`${value}T00:00:00`)) }
function changeClass(value: number) { return value > 0 ? 'positive' : value < 0 ? 'negative' : '' }
function sourceIcon(type: InvestmentSourceType) { return ({ wallet: 'wallet', exchange: 'chart', cash: 'wallet', bank: 'home', broker: 'activity', other: 'grid' } as const)[type] }
function sourceTypeLabel(type: InvestmentSourceType) { return ({ wallet: 'Кошелёк', exchange: 'Биржа', cash: 'Наличные', bank: 'Банк', broker: 'Брокер', other: 'Другой источник' } as const)[type] }
function sourceNameById(id: string) { return sources.value.find((source) => source.id === id)?.name || 'Источник удалён' }
function expenseCategoryLabel(category: InvestmentExpenseCategory) { return ({ purchase: 'Покупка', transfer: 'Перевод', fee: 'Комиссия', other: 'Другое' } as const)[category] }
function sourceWord(value: number) { return value === 1 ? 'источник' : value >= 2 && value <= 4 ? 'источника' : 'источников' }
function positionWord(value: number) { return value === 1 ? 'позиция' : value >= 2 && value <= 4 ? 'позиции' : 'позиций' }
function snapshotWord(value: number) { return value === 1 ? 'снимок' : value >= 2 && value <= 4 ? 'снимка' : 'снимков' }
</script>

<style scoped>
.investments-page { display: grid; gap: 12px; padding: 2px; }.currency-switch, .investment-tabs { display: flex; gap: 3px; border: 1px solid var(--border-color); border-radius: 10px; padding: 3px; background: var(--control-bg); }.currency-switch button, .investment-tabs button { border: 0; border-radius: 7px; padding: 7px 11px; color: var(--text-secondary); background: transparent; font-size: 10px; }.currency-switch button.active, .investment-tabs button.active { color: var(--text-primary); background: var(--card-solid); }.investment-tabs { width: max-content; }.positive { color: var(--success) !important; }.negative { color: var(--danger) !important; }
.investment-empty { min-height: 380px; display: grid; justify-items: center; align-content: center; gap: 8px; padding: 30px; text-align: center; }.investment-empty > span { width: 58px; height: 58px; display: grid; place-items: center; border-radius: 17px; color: var(--accent); background: var(--accent-soft); font-size: 25px; }.investment-empty h2, .investment-empty p { margin: 0; }.investment-empty p { max-width: 520px; margin-bottom: 8px; color: var(--text-muted); }
.portfolio-summary { position: relative; display: grid; grid-template-columns: minmax(260px, 1fr) minmax(560px, 1.65fr) auto; align-items: stretch; gap: 12px; overflow: hidden; border-color: var(--border-strong); padding: 14px; background: radial-gradient(circle at 8% 15%, color-mix(in srgb, var(--info) 9%, transparent), transparent 34%), var(--panel-bg); }.portfolio-summary__main { min-width: 0; display: grid; align-content: center; gap: 7px; padding: 6px 10px; }.portfolio-summary__eyebrow { display: flex; align-items: center; gap: 7px; color: var(--text-muted); font-size: 9px; font-weight: 700; text-transform: uppercase; letter-spacing: .08em; }.portfolio-summary__eyebrow i { width: 6px; height: 6px; border-radius: 50%; background: var(--success); box-shadow: 0 0 0 4px color-mix(in srgb, var(--success) 10%, transparent); }.portfolio-summary__main > strong { font-size: clamp(28px, 3vw, 38px); line-height: 1; letter-spacing: -.045em; }.portfolio-summary__main > small { color: var(--text-muted); font-size: 9px; }.portfolio-summary__metrics { display: grid; grid-template-columns: repeat(3, minmax(0, 1fr)); gap: 8px; }.portfolio-summary__metrics article { min-width: 0; display: grid; grid-template-columns: 34px minmax(0, 1fr); align-items: center; gap: 10px; border: 1px solid var(--border-color); border-radius: 12px; padding: 12px; background: color-mix(in srgb, var(--card-solid) 72%, transparent); }.summary-metric__icon { width: 34px; height: 34px; display: grid; place-items: center; border-radius: 10px; color: var(--text-secondary); background: var(--control-bg); }.portfolio-summary__metrics article > div { min-width: 0; display: grid; gap: 4px; }.portfolio-summary__metrics small { color: var(--text-muted); font-size: 8px; }.portfolio-summary__metrics strong { overflow: hidden; font-size: 15px; text-overflow: ellipsis; white-space: nowrap; }.portfolio-summary__metrics em { overflow: hidden; color: var(--text-muted); font-size: 8px; font-style: normal; text-overflow: ellipsis; white-space: nowrap; }.portfolio-refresh { align-self: center; height: 36px; display: inline-flex; align-items: center; gap: 7px; border: 1px solid var(--border-color); border-radius: 999px; padding: 0 12px; color: var(--text-secondary); background: var(--control-bg); font-size: 9px; transition: .18s var(--ease-out); }.portfolio-refresh:hover:not(:disabled) { border-color: var(--border-strong); color: var(--text-primary); background: var(--control-bg-hover); transform: translateY(-1px); }.portfolio-refresh:disabled { opacity: .55; }.market-error { display: flex; align-items: center; gap: 7px; margin: 0; border: 1px solid color-mix(in srgb, var(--danger) 25%, var(--border-color)); border-radius: 9px; padding: 9px 11px; color: var(--danger); font-size: 10px; }
.portfolio-grid { display: grid; grid-template-columns: minmax(0, 1.6fr) minmax(270px, .6fr); gap: 12px; }.portfolio-history, .portfolio-allocation, .top-assets, .history-section { min-width: 0; padding: 16px; }.portfolio-history > header, .portfolio-allocation > header, .top-assets > header, .history-section > header, .sources-section > header { display: flex; align-items: flex-start; justify-content: space-between; gap: 12px; margin-bottom: 13px; }.portfolio-history h2, .portfolio-allocation h2, .top-assets h2, .history-section h2, .sources-section h2 { margin: 0; font-size: 14px; }.portfolio-history header span, .portfolio-allocation header span, .top-assets header span, .history-section header span, .sources-section header span { display: block; margin-top: 3px; color: var(--text-muted); font-size: 9px; }.portfolio-history header > strong, .portfolio-allocation header > span, .history-section header > strong { color: var(--text-muted); font-size: 9px; }.allocation-list { display: grid; gap: 7px; }.allocation-list div { display: grid; grid-template-columns: 7px 1fr auto; align-items: center; gap: 7px; }.allocation-list i { width: 7px; height: 7px; border-radius: 50%; }.allocation-list span { color: var(--text-secondary); font-size: 9px; }.allocation-list strong { font-size: 9px; }
.top-assets > header button, .sources-section footer button { border: 0; padding: 0; color: var(--text-muted); background: transparent; font-size: 9px; }.top-assets > div { display: grid; }.top-assets > div > button { display: grid; grid-template-columns: 38px minmax(0, 1fr) auto 65px; align-items: center; gap: 10px; border: 0; border-top: 1px solid var(--border-color); padding: 10px 2px; color: inherit; background: transparent; text-align: left; }.asset-mark, .asset-cell > i { width: 34px; height: 34px; display: grid; place-items: center; border-radius: 50%; color: var(--accent); background: var(--accent-soft); font-size: 8px; font-style: normal; font-weight: 900; }.top-assets button > div { min-width: 0; display: grid; gap: 3px; }.top-assets button small { color: var(--text-muted); font-size: 8px; }.top-assets button > b { font-size: 11px; }.top-assets button > em { font-size: 9px; font-style: normal; text-align: right; }
.sources-section { display: grid; }.sources-grid { display: grid; grid-template-columns: repeat(3, 1fr); gap: 10px; }.source-card { border-top: 3px solid var(--source-color); padding: 14px; }.source-card > header { display: grid; grid-template-columns: 36px minmax(0, 1fr) auto; align-items: center; gap: 9px; }.source-card > header > span { width: 34px; height: 34px; display: grid; place-items: center; border-radius: 9px; color: var(--source-color); background: color-mix(in srgb, var(--source-color) 9%, var(--control-bg)); }.source-card > header > div:nth-child(2) { min-width: 0; display: grid; gap: 3px; }.source-card > header strong { overflow: hidden; font-size: 11px; text-overflow: ellipsis; white-space: nowrap; }.source-card small, .source-card footer { color: var(--text-muted); font-size: 8px; }.source-card > header > div:last-child { display: flex; align-items: center; gap: 6px; margin-left: 6px; }.source-card > strong { display: block; margin: 18px 0; font-size: 21px; }.source-card footer { display: flex; justify-content: space-between; border-top: 1px solid var(--border-color); padding-top: 10px; }.source-card footer button { color: var(--source-color); }
.snapshot-list { display: grid; margin-top: 12px; }.snapshot-list > div { display: grid; grid-template-columns: 1fr auto 90px; gap: 12px; border-top: 1px solid var(--border-color); padding: 9px 3px; }.snapshot-list span, .snapshot-list small { color: var(--text-muted); font-size: 9px; }.snapshot-list strong { font-size: 10px; }
.expense-history { margin-top: 22px; border-top: 1px solid var(--border-color); padding-top: 16px; }.expense-history > header { display: flex; justify-content: space-between; gap: 12px; margin-bottom: 8px; }.expense-history h3 { margin: 0; font-size: 12px; }.expense-history header span, .expense-history header > strong { display: block; margin-top: 3px; color: var(--text-muted); font-size: 9px; }.expense-list { display: grid; }.expense-list article { display: grid; grid-template-columns: 34px minmax(150px, 1fr) auto minmax(90px, auto); align-items: center; gap: 10px; border-top: 1px solid var(--border-color); padding: 10px 3px; }.expense-list article > span { width: 32px; height: 32px; display: grid; place-items: center; border-radius: 50%; color: var(--danger); background: color-mix(in srgb, var(--danger) 9%, var(--control-bg)); font-size: 8px; font-weight: 900; }.expense-list article > div { min-width: 0; display: grid; gap: 3px; }.expense-list small { overflow: hidden; color: var(--text-muted); font-size: 8px; text-overflow: ellipsis; white-space: nowrap; }.expense-list b { font-size: 9px; }.expense-list em { color: var(--danger); font-size: 10px; font-style: normal; font-weight: 700; text-align: right; }.expense-empty { display: flex; align-items: center; justify-content: space-between; border: 1px dashed var(--border-color); border-radius: 9px; padding: 10px; color: var(--text-muted); font-size: 9px; }
@media (max-width: 1250px) { .portfolio-summary { grid-template-columns: 1fr auto; }.portfolio-summary__metrics { grid-column: 1 / -1; grid-row: 2; }.portfolio-refresh { grid-column: 2; grid-row: 1; }.portfolio-grid { grid-template-columns: 1fr; }.sources-grid { grid-template-columns: repeat(2, 1fr); } }
@media (max-width: 650px) { .portfolio-summary { grid-template-columns: 1fr; padding: 12px; }.portfolio-summary__main { padding: 5px 3px; }.portfolio-summary__metrics { grid-column: auto; grid-row: auto; grid-template-columns: 1fr; }.portfolio-refresh { grid-column: auto; grid-row: auto; justify-content: center; width: 100%; }.investment-tabs { max-width: 100%; overflow-x: auto; }.top-assets > div > button { grid-template-columns: 38px 1fr auto; }.top-assets button > em { display: none; }.sources-grid { grid-template-columns: 1fr; }.snapshot-list > div { grid-template-columns: 1fr auto; }.snapshot-list small { display: none; } }
</style>
