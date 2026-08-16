const rubleFormatter = new Intl.NumberFormat('ru-RU', {
  style: 'currency',
  currency: 'RUB',
  maximumFractionDigits: 0,
})

export function parseAmount(value) {
  const amount = Number(String(value ?? 0).replace(',', '.'))
  return Number.isFinite(amount) ? amount : 0
}

export function toNonNegativeAmount(value) {
  return Math.max(0, Math.round(parseAmount(value) * 100) / 100)
}

export function formatRubles(value) {
  return rubleFormatter.format(parseAmount(value))
}

export function formatNonNegativeRubles(value) {
  return rubleFormatter.format(toNonNegativeAmount(value))
}
