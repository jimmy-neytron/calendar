import { ref } from 'vue'
import { formatBytes, getStorageQuota } from '../../utils/storage/storageQuota.js'

export function useStorageQuota() {
  const quota = ref({ supported: false, usage: 0, quota: 0, percentUsed: 0 })
  const isWarning = ref(false)

  const refreshQuota = async () => {
    quota.value = await getStorageQuota()
    isWarning.value = quota.value.percentUsed >= 85
    return quota.value
  }

  return {
    quota,
    isWarning,
    formatBytes,
    refreshQuota,
  }
}
