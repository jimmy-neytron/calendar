<template>
  <UiModal
    v-if="activeModal"
    :key="renderKey"
    v-model="isOpen"
    :title="activeModal.title"
    width="860px"
    :close-on-overlay="!activeModal.isBlocking"
    :close-on-escape="!activeModal.isBlocking"
    :hide-close="activeModal.isBlocking"
    :overlay-class="{ 'global-admin-modal-lock': activeModal.isBlocking }"
    :dialog-class="[`global-admin-modal-dialog--${activeModal.modalType}`, { 'global-admin-modal-dialog--blocking': activeModal.isBlocking }]"
    @close="handleModalClose"
  >
    <template #header-badge>
      <div class="global-admin-modal__badge">
        <UiIcon :name="activeModal.style.icon" />
        <span>{{ activeModal.style.label }}</span>
      </div>
    </template>

    <article class="global-admin-modal" :class="`global-admin-modal--${activeModal.modalType}`">
      <div class="global-admin-modal__content" v-html="activeModal.contentHtml" />
      <footer v-if="activeModal.buttons.length">
        <a
          v-for="button in linkButtons"
          :key="button.key"
          :class="button.variant"
          :href="button.url"
          target="_blank"
          rel="noreferrer"
          @click="handleButtonDismiss"
        >
          {{ button.label }}
        </a>
        <button
          v-for="button in closeButtons"
          :key="button.key"
          type="button"
          :class="button.variant"
          @click="closeModal"
        >
          {{ button.label }}
        </button>
      </footer>
    </article>
  </UiModal>
</template>

<script setup>
import { computed, onBeforeUnmount, onMounted, ref, watch } from 'vue'
import { adminApi } from '../../modules/admin/api/admin.api.js'
import { authStore } from '../../stores/auth.store.js'
import UiIcon from '../ui/UiIcon.vue'
import UiModal from '../ui/UiModal.vue'
import {
  getAdminModalRow,
  mapAdminModal,
  matchesAdminModalAudience,
} from '../../modules/admin/services/adminModalMapper.js'

const DISMISSED_KEY = 'workspace-admin-modal-dismissed'
const activeModal = ref(null)
const isOpen = ref(false)
const renderKey = ref(0)
let lockObserver = null
const linkButtons = computed(() => activeModal.value?.buttons.filter((button) => button.action === 'link') || [])
const closeButtons = computed(() => activeModal.value?.buttons.filter((button) => button.action === 'close') || [])

function mapModal(row) {
  return mapAdminModal(row, { sanitizeContent: true, filterButtons: true })
}

function rememberDismiss() {
  if (!activeModal.value) return
  window.localStorage.setItem(DISMISSED_KEY, activeModal.value.id)
}

function handleModalClose() {
  if (activeModal.value?.isBlocking) {
    restoreBlockingModal()
    return
  }
  rememberDismiss()
}

function handleButtonDismiss() {
  if (!activeModal.value?.isBlocking) rememberDismiss()
}

function closeModal() {
  if (activeModal.value?.isBlocking) {
    restoreBlockingModal()
    return
  }
  rememberDismiss()
  isOpen.value = false
}

async function loadActiveModal() {
  try {
    const { data, error } = await adminApi.getActiveModal()
    if (error) return
    const row = getAdminModalRow(data)
    if (!row) {
      activeModal.value = null
      isOpen.value = false
      syncBlockingGuard()
      return
    }

    const modal = mapModal(row)
    if (!modal) {
      activeModal.value = null
      isOpen.value = false
      syncBlockingGuard()
      return
    }

    if (!matchesAdminModalAudience(modal.audience, authStore.currentUser.value)) {
      activeModal.value = null
      isOpen.value = false
      syncBlockingGuard()
      return
    }

    const previousId = activeModal.value?.id
    activeModal.value = modal
    if (previousId !== modal.id) {
      isOpen.value = shouldOpenModal(modal)
    }
    syncBlockingGuard()
  } catch (error) {
    console.warn('Failed to load active admin modal:', error.message)
  }
}

function shouldOpenModal(modal) {
  if (modal.displayMode === 'always') return true
  return window.localStorage.getItem(DISMISSED_KEY) !== modal.id
}

function restoreBlockingModal() {
  if (!activeModal.value?.isBlocking) return
  isOpen.value = true
  renderKey.value += 1
  syncBlockingGuard()
}

function syncBlockingGuard() {
  lockObserver?.disconnect()
  lockObserver = null
  if (!activeModal.value?.isBlocking || !isOpen.value) return

  lockObserver = new MutationObserver(() => {
    if (!activeModal.value?.isBlocking || !isOpen.value) return
    if (!document.querySelector('.global-admin-modal-lock')) restoreBlockingModal()
  })
  lockObserver.observe(document.body, { childList: true, subtree: true })
}

onMounted(() => {
  loadActiveModal()
})

watch(() => authStore.currentUserId.value, (userId, previousUserId) => {
  if (userId && userId !== previousUserId) loadActiveModal()
})

watch(isOpen, (value) => {
  if (!value && activeModal.value?.isBlocking) restoreBlockingModal()
})

onBeforeUnmount(() => {
  lockObserver?.disconnect()
})
</script>

<style scoped>
.global-admin-modal{display:grid;gap:18px}.global-admin-modal__badge{display:inline-flex;align-items:center;gap:9px;width:max-content;max-width:100%;border:1px solid color-mix(in srgb,var(--admin-modal-accent,var(--accent)) 48%,var(--border-color));border-radius:8px;padding:9px 11px;color:var(--admin-modal-accent,var(--accent));background:color-mix(in srgb,var(--admin-modal-accent,var(--accent)) 12%,var(--control-bg));font-size:11px;font-weight:900;letter-spacing:.08em;text-transform:uppercase}.global-admin-modal__badge svg{font-size:17px}.global-admin-modal__content{max-width:100%;overflow-wrap:anywhere;color:var(--text-secondary);font-size:14px;line-height:1.72}.global-admin-modal__content :deep(h1),.global-admin-modal__content :deep(h2),.global-admin-modal__content :deep(h3),.global-admin-modal__content :deep(h4){margin:0 0 12px;color:var(--text-primary);line-height:1.15}.global-admin-modal__content :deep(h1){font-size:32px}.global-admin-modal__content :deep(h2){font-size:27px}.global-admin-modal__content :deep(h3){font-size:22px}.global-admin-modal__content :deep(h4){font-size:18px}.global-admin-modal__content :deep(p){margin:0 0 12px}.global-admin-modal__content :deep(ul){margin:0 0 12px;padding-left:20px}.global-admin-modal__content :deep(a){color:var(--admin-modal-accent,var(--accent));font-weight:800}.global-admin-modal footer{display:flex;justify-content:flex-end;gap:8px;flex-wrap:wrap;border-top:1px solid var(--border-color);padding-top:14px}.global-admin-modal footer a,.global-admin-modal footer button{display:inline-flex;align-items:center;justify-content:center;min-height:38px;border:0;border-radius:999px;padding:0 15px;text-decoration:none;font-size:12px;font-weight:850}.global-admin-modal footer .primary{color:var(--text-inverse);background:var(--admin-modal-accent,var(--accent))}.global-admin-modal footer .secondary{color:var(--text-primary);border:1px solid var(--border-color);background:var(--control-bg)}.global-admin-modal--notice{--admin-modal-accent:var(--accent)}.global-admin-modal--warning{--admin-modal-accent:#f59e0b}.global-admin-modal--danger,.global-admin-modal--maintenance{--admin-modal-accent:#ef4444}.global-admin-modal--success{--admin-modal-accent:#22c55e}:global(.global-admin-modal-lock){z-index:10000;background:rgba(3,4,9,.9)}:global(.global-admin-modal-dialog--notice),:global(.global-admin-modal-dialog--warning),:global(.global-admin-modal-dialog--danger),:global(.global-admin-modal-dialog--success),:global(.global-admin-modal-dialog--maintenance){position:relative;border-color:color-mix(in srgb,var(--admin-modal-accent,var(--accent)) 46%,var(--border-strong));background:linear-gradient(180deg,color-mix(in srgb,var(--admin-modal-accent,var(--accent)) 8%,var(--panel-bg)),var(--panel-bg) 190px)}:global(.global-admin-modal-dialog--notice){--admin-modal-accent:var(--accent)}:global(.global-admin-modal-dialog--warning){--admin-modal-accent:#f59e0b}:global(.global-admin-modal-dialog--danger),:global(.global-admin-modal-dialog--maintenance){--admin-modal-accent:#ef4444}:global(.global-admin-modal-dialog--success){--admin-modal-accent:#22c55e}:global(.global-admin-modal-dialog--notice::before),:global(.global-admin-modal-dialog--warning::before),:global(.global-admin-modal-dialog--danger::before),:global(.global-admin-modal-dialog--success::before),:global(.global-admin-modal-dialog--maintenance::before){position:absolute;top:0;left:0;right:0;height:4px;background:var(--admin-modal-accent,var(--accent));content:""}:global(.global-admin-modal-dialog--blocking){box-shadow:0 24px 80px rgba(0,0,0,.48),0 0 0 1px color-mix(in srgb,var(--admin-modal-accent,#ef4444) 38%,transparent)}@media(max-width:520px){.global-admin-modal footer{display:grid}.global-admin-modal footer a,.global-admin-modal footer button{width:100%}}
</style>
