<template>
  <div class="notification-bell" ref="rootRef">
    <button class="notification-bell__button" type="button" :aria-label="label" @click="isOpen = !isOpen">
      <span>🔔</span>
      <b v-if="unreadCount">{{ unreadCount > 9 ? '9+' : unreadCount }}</b>
    </button>

    <transition name="fade">
      <div v-if="isOpen" class="notification-bell__popover">
        <NotificationCenter />
      </div>
    </transition>
  </div>
</template>

<script setup>
import { computed, onBeforeUnmount, onMounted, ref } from 'vue'
import NotificationCenter from './NotificationCenter.vue'
import { notificationStore } from '../../stores/notification.store.js'

const rootRef = ref(null)
const isOpen = ref(false)
const unreadCount = computed(() => notificationStore.unreadCount.value)
const label = computed(() => unreadCount.value ? `Уведомления: ${unreadCount.value} новых` : 'Уведомления')

function handleDocumentClick(event) {
  if (!rootRef.value?.contains(event.target)) isOpen.value = false
}

onMounted(() => document.addEventListener('click', handleDocumentClick))
onBeforeUnmount(() => document.removeEventListener('click', handleDocumentClick))
</script>

<style scoped>
.notification-bell {
  position: relative;
}

.notification-bell__button {
  position: relative;
  display: grid;
  place-items: center;
  width: 30px;
  height: 30px;
  border: 1px solid var(--border-color);
  border-radius: 50%;
  color: var(--text-primary);
  background: var(--control-bg-solid);
  cursor: pointer;
  transition: border-color 0.18s var(--ease-out), background 0.18s var(--ease-out), transform 0.18s var(--ease-out);
}

.notification-bell__button:hover {
  border-color: var(--border-strong);
  background: var(--control-bg-hover);
  transform: translateY(-1px);
}

.notification-bell__button span {
  font-size: 13px;
}

.notification-bell__button b {
  position: absolute;
  top: -5px;
  right: -4px;
  min-width: 16px;
  height: 16px;
  display: grid;
  place-items: center;
  border: 1px solid var(--bg-primary);
  border-radius: var(--radius-pill);
  padding: 0 4px;
  color: var(--text-inverse);
  background: var(--danger);
  font-size: 9px;
  line-height: 1;
}

.notification-bell__popover {
  position: absolute;
  top: calc(100% + 10px);
  right: 0;
  z-index: 50;
  width: min(420px, calc(100vw - 24px));
  border: 1px solid var(--border-color);
  border-radius: var(--radius-lg);
  padding: 12px;
  background: var(--panel-bg);
  box-shadow: var(--shadow-lg);
}

@media (max-width: 620px) {
  .notification-bell__popover {
    position: fixed;
    top: var(--header-height);
    right: 10px;
    left: 10px;
    width: auto;
  }
}
</style>
