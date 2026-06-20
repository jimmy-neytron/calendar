export async function getStorageQuota() {
  if (!('storage' in navigator) || !('estimate' in navigator.storage)) {
    return { supported: false, usage: 0, quota: 0, percentUsed: 0 }
  }

  const { usage = 0, quota = 0 } = await navigator.storage.estimate()
  return {
    supported: true,
    usage,
    quota,
    percentUsed: quota ? Math.round((usage / quota) * 100) : 0,
  }
}

export function formatBytes(bytes) {
  if (!bytes) return '0 Б'
  const units = ['Б', 'КБ', 'МБ', 'ГБ']
  const exponent = Math.min(Math.floor(Math.log(bytes) / Math.log(1024)), units.length - 1)
  const value = bytes / 1024 ** exponent
  return `${value.toFixed(value >= 10 ? 0 : 1)} ${units[exponent]}`
}
