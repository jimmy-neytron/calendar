import { computed, ref } from 'vue'
import { queryClient } from '../../../query/queryClient.js'
import { queryKeys } from '../../../query/queryKeys.js'
import { investmentStore } from '../../../stores/investment.store'
import { aggregateInvestmentAssets, calculatePortfolioDayChange, calculatePortfolioValueChange, type ValuedHolding } from '../../../utils/investments/investmentPortfolio'
import { loadCryptoQuotes, loadFiatRates } from '../api/investmentMarket.api'

export function useInvestmentPortfolio() {
  const displayCurrency = ref<'RUB' | 'USD'>('RUB')
  const cryptoQuotes = ref<Record<string, Record<string, { price: number; change24h: number; updatedAt: string }>>>({})
  const fiatRates = ref<Record<string, number>>({})
  const isLoadingQuotes = ref(false)
  const marketError = ref('')
  const lastUpdatedAt = ref('')

  const valuedHoldings = computed<ValuedHolding[]>(() => investmentStore.holdings.value.filter((holding) => holding.quantity > 0).map((holding) => {
    const source = investmentStore.sources.value.find((item) => item.id === holding.sourceId)
    const priceRub = holding.assetType === 'crypto' ? Number(cryptoQuotes.value[holding.assetId]?.RUB?.price || 0) : Number(fiatRates.value[`${holding.symbol}:RUB`] || (holding.symbol === 'RUB' ? 1 : 0))
    const priceUsd = holding.assetType === 'crypto' ? Number(cryptoQuotes.value[holding.assetId]?.USD?.price || 0) : Number(fiatRates.value[`${holding.symbol}:USD`] || (holding.symbol === 'USD' ? 1 : 0))
    const costRubRate = Number(fiatRates.value[`${holding.costCurrency}:RUB`] || (holding.costCurrency === 'RUB' ? 1 : 0))
    const costUsdRate = Number(fiatRates.value[`${holding.costCurrency}:USD`] || (holding.costCurrency === 'USD' ? 1 : 0))
    return {
      ...holding,
      sourceName: source?.name || 'Источник удалён', sourceColor: source?.color || '#94a3b8', priceRub, priceUsd,
      valueRub: holding.quantity * priceRub, valueUsd: holding.quantity * priceUsd,
      costRub: holding.costAmount * costRubRate, costUsd: holding.costAmount * costUsdRate,
      change24h: holding.assetType === 'crypto' ? Number(cryptoQuotes.value[holding.assetId]?.USD?.change24h || 0) : 0,
    }
  }))
  const assets = computed(() => aggregateInvestmentAssets(valuedHoldings.value))
  const totalRub = computed(() => assets.value.reduce((sum, asset) => sum + asset.valueRub, 0))
  const totalUsd = computed(() => assets.value.reduce((sum, asset) => sum + asset.valueUsd, 0))
  const total = computed(() => displayCurrency.value === 'RUB' ? totalRub.value : totalUsd.value)
  const invested = computed(() => assets.value.reduce((sum, asset) => sum + (displayCurrency.value === 'RUB' ? asset.costRub : asset.costUsd), 0))
  const hasCost = computed(() => investmentStore.holdings.value.some((holding) => holding.costAmount > 0))
  const costedValue = computed(() => valuedHoldings.value.filter((holding) => holding.costAmount > 0).reduce((sum, holding) => sum + (displayCurrency.value === 'RUB' ? holding.valueRub : holding.valueUsd), 0))
  const profit = computed(() => costedValue.value - invested.value)
  const dayChange = computed(() => calculatePortfolioDayChange(assets.value, displayCurrency.value))
  const allTimeChange = computed(() => {
    const firstSnapshot = investmentStore.snapshots.value[0]
    if (!firstSnapshot) return { amount: 0, percent: 0, since: '' }
    const firstValue = displayCurrency.value === 'RUB' ? firstSnapshot.totalRub : firstSnapshot.totalUsd
    return { ...calculatePortfolioValueChange(total.value, firstValue), since: firstSnapshot.capturedOn }
  })
  const sourceSummaries = computed(() => investmentStore.sources.value.map((source) => {
    const positions = valuedHoldings.value.filter((holding) => holding.sourceId === source.id)
    return { ...source, positionsCount: positions.length, valueRub: positions.reduce((sum, item) => sum + item.valueRub, 0), valueUsd: positions.reduce((sum, item) => sum + item.valueUsd, 0) }
  }).sort((left, right) => (displayCurrency.value === 'RUB' ? right.valueRub - left.valueRub : right.valueUsd - left.valueUsd)))
  const history = computed(() => investmentStore.snapshots.value.map((snapshot) => ({ key: snapshot.capturedOn, value: displayCurrency.value === 'RUB' ? snapshot.totalRub : snapshot.totalUsd })))

  async function refreshMarket() {
    if (!investmentStore.holdings.value.length || isLoadingQuotes.value) return
    isLoadingQuotes.value = true
    marketError.value = ''
    try {
      const cryptoIds = [...new Set(investmentStore.holdings.value.filter((item) => item.assetType === 'crypto').map((item) => item.assetId))]
      const fiatCodes = [...new Set(investmentStore.holdings.value.flatMap((item) => item.assetType === 'fiat' ? [item.symbol, item.costCurrency] : [item.costCurrency]).filter(Boolean).map((item) => item.toUpperCase()))]
      const [nextCryptoQuotes, nextFiatRates] = await queryClient.fetchQuery({
        queryKey: queryKeys.external.investmentMarket(cryptoIds, fiatCodes),
        staleTime: 5 * 60_000,
        queryFn: () => Promise.all([loadCryptoQuotes(cryptoIds), loadFiatRates(fiatCodes)]),
      })
      cryptoQuotes.value = nextCryptoQuotes
      fiatRates.value = nextFiatRates
      lastUpdatedAt.value = new Date().toISOString()
      await Promise.resolve()
      const missingPrices = valuedHoldings.value.filter((holding) => holding.priceRub <= 0 || holding.priceUsd <= 0).length
      if (missingPrices) marketError.value = `Для ${missingPrices} ${missingPrices === 1 ? 'позиции' : 'позиций'} курс пока недоступен — они не включены в итог`
      await investmentStore.captureSnapshot(totalRub.value, totalUsd.value, assets.value.map((asset) => ({ assetId: asset.assetId, symbol: asset.symbol, valueRub: asset.valueRub, valueUsd: asset.valueUsd })))
    } catch (error) {
      marketError.value = error instanceof Error ? error.message : 'Не удалось обновить котировки'
    } finally {
      isLoadingQuotes.value = false
    }
  }

  return { displayCurrency, valuedHoldings, assets, total, totalRub, totalUsd, invested, hasCost, profit, dayChange, allTimeChange, sourceSummaries, history, isLoadingQuotes, marketError, lastUpdatedAt, refreshMarket }
}
