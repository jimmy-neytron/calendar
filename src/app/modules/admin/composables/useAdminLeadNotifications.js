import { ref } from 'vue'
import { adminApi } from '../api/admin.api.js'
import { authStore } from '../../../stores/auth.store.js'

const unreadLeadCount = ref(0)
const unreadLeadCountLoading = ref(false)
let pollingTimer = null

export function useAdminLeadNotifications() {
  async function loadUnreadLeadCount() {
    if (!authStore.isAdmin.value || unreadLeadCountLoading.value) return

    unreadLeadCountLoading.value = true
    try {
      const { data, error } = await adminApi.countUnreadLeads()
      if (!error) unreadLeadCount.value = Number(data || 0)
    } finally {
      unreadLeadCountLoading.value = false
    }
  }

  function setUnreadLeadCount(value) {
    unreadLeadCount.value = Math.max(0, Number(value || 0))
  }

  function startUnreadLeadPolling() {
    if (pollingTimer || !authStore.isAdmin.value) return
    loadUnreadLeadCount()
    pollingTimer = window.setInterval(loadUnreadLeadCount, 45_000)
  }

  function stopUnreadLeadPolling() {
    if (!pollingTimer) return
    window.clearInterval(pollingTimer)
    pollingTimer = null
  }

  return {
    unreadLeadCount,
    unreadLeadCountLoading,
    loadUnreadLeadCount,
    setUnreadLeadCount,
    startUnreadLeadPolling,
    stopUnreadLeadPolling,
  }
}
