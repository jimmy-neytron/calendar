export function pluralizeRu(value, forms) {
  const amount = Math.abs(Number(value || 0))
  const lastTwo = amount % 100
  const last = amount % 10
  if (lastTwo >= 11 && lastTwo <= 14) return forms[2]
  if (last === 1) return forms[0]
  if (last >= 2 && last <= 4) return forms[1]
  return forms[2]
}
