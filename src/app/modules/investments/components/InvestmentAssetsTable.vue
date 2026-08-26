<template>
  <section class="assets-panel panel">
    <header class="assets-panel__header">
      <div>
        <h2>Активы</h2>
        <span>{{ assets.length }} {{ assetWord(assets.length) }} · {{ formatMoney(total) }} в портфеле</span>
      </div>
      <UiButton icon="plus" size="sm" @click="emit('add')">Добавить актив</UiButton>
    </header>

    <div v-if="assets.length" class="asset-toolbar">
      <div class="asset-search">
        <UiIcon name="search" />
        <input v-model="search" type="search" placeholder="Название или тикер" aria-label="Найти актив" />
        <kbd>/</kbd>
      </div>
      <div class="asset-filters" aria-label="Фильтр активов">
        <button v-for="item in filters" :key="item.value" type="button" :class="{ active: filter === item.value }" @click="filter = item.value">
          {{ item.label }} <span>{{ item.count }}</span>
        </button>
      </div>
    </div>

    <div v-if="visibleAssets.length" class="assets-table-wrap">
      <table class="assets-table">
        <thead><tr><th>Актив</th><th class="numeric-column">Цена</th><th class="numeric-column">Баланс</th><th class="numeric-column">Стоимость</th><th class="numeric-column">24 ч</th><th class="actions-heading">Действия</th></tr></thead>
        <tbody>
          <template v-for="asset in visibleAssets" :key="asset.key">
            <tr class="asset-row" :class="{ expanded: expandedAsset === asset.key }" @click="toggle(asset.key)">
              <td>
                <span class="asset-cell">
                  <button type="button" class="asset-token-button" :title="asset.assetType === 'crypto' ? `Открыть график ${asset.name}` : undefined" @click.stop="asset.assetType === 'crypto' ? emit('openChart', asset) : toggle(asset.key)">
                    <i :data-type="asset.assetType">{{ asset.symbol.slice(0, 3) }}</i>
                    <span><strong>{{ asset.name }}</strong><small>{{ asset.symbol }} · {{ asset.assetType === 'fiat' ? 'Валюта' : 'Криптоактив' }}</small></span>
                  </button>
                  <button type="button" class="source-toggle" @click.stop="toggle(asset.key)">{{ asset.positions.length }} {{ sourceWord(asset.positions.length) }} <UiIcon :name="expandedAsset === asset.key ? 'up' : 'down'" /></button>
                </span>
              </td>
              <td class="numeric-cell price-cell">{{ formatMoney(assetPrice(asset)) }}</td>
              <td class="numeric-cell"><strong class="balance-value">{{ formatQuantity(asset.quantity) }}</strong><small class="balance-symbol">{{ asset.symbol }}</small></td>
              <td class="numeric-cell"><div class="asset-value"><strong>{{ formatMoney(assetValue(asset)) }}</strong><small>{{ assetShare(asset) }}% портфеля</small></div></td>
              <td class="numeric-cell"><span class="change-value" :class="changeClass(asset.change24h)">{{ signedPercent(asset.change24h) }}</span></td>
              <td>
                <div class="asset-actions">
                  <button v-if="asset.positions.length === 1 && asset.assetType === 'crypto'" type="button" class="quick-action quick-action--replace" @click.stop="emit('replace', asset.positions[0])"><UiIcon name="refresh" /> Заменить</button>
                  <button v-if="asset.positions.length === 1" type="button" class="icon-action" title="Списать актив" aria-label="Списать актив" @click.stop="emit('spend', asset.positions[0].id)"><UiIcon name="minus" /></button>
                  <button v-if="asset.positions.length === 1" type="button" class="icon-action" title="Изменить позицию" aria-label="Изменить позицию" @click.stop="emit('edit', asset.positions[0])"><UiIcon name="edit" /></button>
                  <button v-else type="button" class="quick-action" @click.stop="toggle(asset.key)"><UiIcon name="grid" /> Открыть позиции</button>
                </div>
              </td>
            </tr>
            <tr v-if="expandedAsset === asset.key" class="asset-details">
              <td colspan="6">
                <div class="position-list">
                  <article v-for="position in asset.positions" :key="position.id">
                    <i class="source-color" :style="{ background: position.sourceColor }" />
                    <span><strong>{{ position.sourceName }}</strong><small>{{ position.assetType === 'fiat' ? 'Обычная валюта' : position.network || 'Сеть не указана' }}</small></span>
                    <b>{{ formatQuantity(position.quantity) }} {{ position.symbol }}</b>
                    <strong>{{ formatMoney(holdingValue(position)) }}</strong>
                    <div>
                      <button type="button" class="quick-action quick-action--primary" @click.stop="emit('spend', position.id)"><UiIcon name="minus" /> Списать</button>
                      <button v-if="position.assetType === 'crypto'" type="button" class="quick-action" @click.stop="emit('replace', position)"><UiIcon name="refresh" /> Заменить</button>
                      <UiIconButton icon="edit" label="Изменить позицию" size="sm" @click.stop="emit('edit', position)" />
                      <UiIconButton icon="trash" label="Удалить позицию" size="sm" variant="danger" @click.stop="emit('delete', position)" />
                    </div>
                  </article>
                </div>
              </td>
            </tr>
          </template>
        </tbody>
      </table>
    </div>

    <div v-else class="section-empty">
      <span><UiIcon :name="assets.length ? 'search' : 'chart'" /></span>
      <strong>{{ assets.length ? 'Ничего не найдено' : 'Активов пока нет' }}</strong>
      <small>{{ assets.length ? 'Попробуй изменить запрос или фильтр.' : 'Добавь первую позицию — курсы и стоимость рассчитаются автоматически.' }}</small>
      <UiButton v-if="!assets.length" size="sm" @click="emit('add')">Добавить актив</UiButton>
    </div>
  </section>
</template>

<script setup lang="ts">
import { computed, onBeforeUnmount, onMounted, ref } from 'vue'
import UiButton from '../../../components/ui/UiButton.vue'
import UiIcon from '../../../components/ui/UiIcon.vue'
import UiIconButton from '../../../components/ui/UiIconButton.vue'
import type { InvestmentAssetType, InvestmentHolding } from '../../../types/investment'
import type { AggregatedInvestmentAsset, ValuedHolding } from '../../../utils/investments/investmentPortfolio'

type Currency = 'RUB' | 'USD'
type AssetFilter = 'all' | InvestmentAssetType

const props = defineProps<{ assets: AggregatedInvestmentAsset[]; total: number; currency: Currency }>()
const emit = defineEmits<{
  add: []
  spend: [holdingId: string]
  edit: [holding: InvestmentHolding]
  replace: [holding: InvestmentHolding]
  delete: [holding: InvestmentHolding]
  openChart: [asset: AggregatedInvestmentAsset]
}>()

const search = ref('')
const filter = ref<AssetFilter>('all')
const expandedAsset = ref('')
const filters = computed(() => [
  { value: 'all' as const, label: 'Все', count: props.assets.length },
  { value: 'crypto' as const, label: 'Крипто', count: props.assets.filter((asset) => asset.assetType === 'crypto').length },
  { value: 'fiat' as const, label: 'Валюты', count: props.assets.filter((asset) => asset.assetType === 'fiat').length },
])
const visibleAssets = computed(() => {
  const query = search.value.trim().toLocaleLowerCase('ru-RU')
  return props.assets.filter((asset) => (filter.value === 'all' || asset.assetType === filter.value) && (!query || `${asset.name} ${asset.symbol}`.toLocaleLowerCase('ru-RU').includes(query)))
})

onMounted(() => window.addEventListener('keydown', focusSearch))
onBeforeUnmount(() => window.removeEventListener('keydown', focusSearch))

function focusSearch(event: KeyboardEvent) {
  if (event.key !== '/' || event.ctrlKey || event.metaKey || event.altKey) return
  const target = event.target as HTMLElement | null
  if (target?.matches('input, textarea, select, [contenteditable="true"]')) return
  event.preventDefault()
  document.querySelector<HTMLInputElement>('.asset-search input')?.focus()
}
function toggle(key: string) { expandedAsset.value = expandedAsset.value === key ? '' : key }
function assetValue(asset: AggregatedInvestmentAsset) { return props.currency === 'RUB' ? asset.valueRub : asset.valueUsd }
function assetPrice(asset: AggregatedInvestmentAsset) { const position = asset.positions[0]; return props.currency === 'RUB' ? position.priceRub : position.priceUsd }
function holdingValue(holding: ValuedHolding) { return props.currency === 'RUB' ? holding.valueRub : holding.valueUsd }
function assetShare(asset: AggregatedInvestmentAsset) { return props.total > 0 ? Math.round(assetValue(asset) / props.total * 1000) / 10 : 0 }
function formatMoney(value: number) { return new Intl.NumberFormat('ru-RU', { style: 'currency', currency: props.currency, maximumFractionDigits: props.currency === 'RUB' ? 0 : 2 }).format(Number(value) || 0) }
function formatQuantity(value: number) { return new Intl.NumberFormat('ru-RU', { maximumFractionDigits: 8 }).format(value) }
function signedPercent(value: number) { return `${value > 0 ? '+' : ''}${(Number(value) || 0).toFixed(2)}%` }
function changeClass(value: number) { return value > 0 ? 'positive' : value < 0 ? 'negative' : 'neutral' }
function sourceWord(value: number) { return value === 1 ? 'источник' : value >= 2 && value <= 4 ? 'источника' : 'источников' }
function assetWord(value: number) { return value === 1 ? 'актив' : value >= 2 && value <= 4 ? 'актива' : 'активов' }
</script>

<style scoped>
.assets-panel { min-width: 0; overflow: hidden; border-color: var(--border-strong); padding: 0; }
.assets-panel__header { display: flex; align-items: center; justify-content: space-between; gap: 16px; padding: 17px 18px; }
.assets-panel__header h2 { margin: 0; font-size: 16px; letter-spacing: -.025em; }
.assets-panel__header span { display: block; margin-top: 4px; color: var(--text-muted); font-size: 9px; }
.asset-toolbar { display: grid; grid-template-columns: minmax(240px, 360px) auto; align-items: center; justify-content: space-between; gap: 12px; border-top: 1px solid var(--border-color); padding: 10px 18px; background: color-mix(in srgb, var(--control-bg) 38%, transparent); }
.asset-search { height: 34px; display: grid; grid-template-columns: 17px 1fr auto; align-items: center; gap: 7px; border: 1px solid var(--border-color); border-radius: 9px; padding: 0 10px; color: var(--text-muted); background: var(--field-bg); }
.asset-search:focus-within { border-color: var(--accent-border); background: var(--field-bg-focus); box-shadow: 0 0 0 2px var(--accent-soft); }
.asset-search input { min-width: 0; border: 0; color: var(--text-primary); background: transparent; outline: 0; font: inherit; font-size: 10px; }
.asset-search kbd { border: 1px solid var(--border-color); border-radius: 5px; padding: 1px 5px; color: var(--text-muted); background: var(--card-solid); font-size: 8px; }
.asset-filters { display: flex; gap: 2px; border: 1px solid var(--border-color); border-radius: 9px; padding: 3px; background: var(--control-bg); }
.asset-filters button { border: 0; border-radius: 6px; padding: 6px 9px; color: var(--text-muted); background: transparent; font-size: 8px; }
.asset-filters button span { margin-left: 3px; opacity: .6; }
.asset-filters button.active { color: var(--text-primary); background: var(--card-solid); box-shadow: var(--shadow-sm); }
.assets-table-wrap { overflow-x: auto; padding: 0 10px 10px; }
.assets-table { width: 100%; min-width: 900px; border-collapse: separate; border-spacing: 0 6px; }
.assets-table th { padding: 4px 12px; color: var(--text-muted); font-size: 7px; font-weight: 700; text-align: left; text-transform: uppercase; letter-spacing: .08em; }
.assets-table td { border-top: 1px solid var(--border-color); border-bottom: 1px solid var(--border-color); padding: 10px 12px; background: color-mix(in srgb, var(--card-solid) 72%, transparent); font-size: 9px; vertical-align: middle; transition: border-color .16s, background .16s; }
.assets-table td:first-child { border-left: 1px solid var(--border-color); border-radius: 11px 0 0 11px; padding-left: 12px; }.assets-table td:last-child { border-right: 1px solid var(--border-color); border-radius: 0 11px 11px 0; padding-right: 12px; }
.asset-row { cursor: pointer; }.asset-row:hover td, .asset-row.expanded td { border-color: var(--border-strong); background: var(--control-bg); }
.asset-cell { display: grid; grid-template-columns: minmax(130px, 1fr) auto; align-items: center; gap: 8px; }.asset-token-button { min-width: 0; display: grid; grid-template-columns: 40px minmax(80px, 1fr); align-items: center; gap: 10px; border: 0; padding: 0; color: inherit; background: transparent; text-align: left; cursor: pointer; }.asset-token-button > i { width: 40px; height: 40px; display: grid; place-items: center; border: 1px solid color-mix(in srgb, var(--info) 18%, transparent); border-radius: 50%; color: var(--info); background: color-mix(in srgb, var(--info) 9%, var(--control-bg)); font-size: 9px; font-style: normal; font-weight: 900; }.asset-token-button > i[data-type='fiat'] { border-color: color-mix(in srgb, var(--success) 20%, transparent); color: var(--success); background: color-mix(in srgb, var(--success) 9%, var(--control-bg)); }.asset-token-button > span { min-width: 0; display: grid; gap: 3px; }.asset-token-button:hover strong { color: var(--accent-light, var(--accent)); }.asset-cell strong { overflow: hidden; font-size: 11px; text-overflow: ellipsis; white-space: nowrap; }.asset-cell small, .balance-symbol { color: var(--text-muted); font-size: 8px; }
.source-toggle { display: inline-flex; align-items: center; gap: 3px; border: 0; padding: 0; color: var(--text-muted); background: transparent; font-size: 8px; }.source-toggle:hover { color: var(--text-primary); }
.numeric-column, .numeric-cell { text-align: right !important; }.price-cell { color: var(--text-secondary); }.balance-value { display: block; margin-bottom: 3px; font-size: 10px; }.asset-value { min-width: 120px; display: grid; gap: 3px; }.asset-value strong { font-size: 12px; }.asset-value small { color: var(--text-muted); font-size: 8px; }
.change-value { font-size: 9px; font-weight: 700; }.change-value.positive { color: var(--success); }.change-value.negative { color: var(--danger); }.change-value.neutral { color: var(--text-muted); }
.asset-actions { display: flex; align-items: center; justify-content: flex-end; gap: 5px; }
.quick-action, .icon-action { min-height: 28px; display: inline-flex; align-items: center; justify-content: center; gap: 5px; border: 1px solid var(--border-color); border-radius: 8px; padding: 0 8px; color: var(--text-secondary); background: transparent; font-size: 8px; white-space: nowrap; transition: .16s var(--ease-out); }.quick-action--replace { color: var(--text-primary); background: var(--control-bg); }.icon-action { width: 28px; padding: 0; }.quick-action:hover, .icon-action:hover { border-color: var(--border-strong); color: var(--text-primary); background: var(--control-bg-hover); transform: translateY(-1px); }.actions-heading { text-align: right !important; }
.assets-table .asset-details td { border: 0; padding: 0 12px 8px; background: transparent !important; }.position-list { display: grid; margin-top: -7px; border: 1px solid var(--border-color); border-radius: 0 0 11px 11px; background: var(--card-soft); }.position-list article { display: grid; grid-template-columns: 4px minmax(150px, 1fr) minmax(110px, auto) minmax(110px, auto) auto; align-items: center; gap: 12px; padding: 10px 12px; }.position-list article + article { border-top: 1px solid var(--border-color); }.source-color { width: 4px; height: 28px; border-radius: 4px; }.position-list article > span { display: grid; gap: 3px; }.position-list article small { color: var(--text-muted); font-size: 8px; }.position-list article > div { display: flex; align-items: center; justify-content: flex-end; gap: 5px; }
.section-empty { min-height: 290px; display: grid; justify-items: center; align-content: center; gap: 8px; padding: 24px; color: var(--text-muted); text-align: center; }.section-empty > span { width: 48px; height: 48px; display: grid; place-items: center; border-radius: 14px; color: var(--info); background: color-mix(in srgb, var(--info) 9%, var(--control-bg)); font-size: 21px; }.section-empty strong { color: var(--text-primary); font-size: 13px; }.section-empty small { max-width: 380px; font-size: 10px; line-height: 1.5; }
@media (max-width: 800px) { .assets-panel__header { padding: 14px; }.asset-toolbar { grid-template-columns: 1fr; padding: 10px 14px; }.asset-filters { width: max-content; }.assets-table-wrap { padding-inline: 6px; }.assets-table { min-width: 760px; }.assets-table th:nth-child(2), .assets-table td:nth-child(2) { display: none; } }
</style>
