// A snapshot is an estimate, never a promise about the future checkout price.
export function isStorePriceCurrent(price: unknown, verified: unknown, receivedAt: unknown, now = Date.now()): boolean {
  if (verified !== true || typeof receivedAt !== 'string' || price == null || price === '') return false
  const value = Number(price)
  const timestamp = Date.parse(receivedAt)
  const age = now - timestamp
  return Number.isFinite(value) && value > 0 && Number.isFinite(timestamp) && age >= -60000
}
