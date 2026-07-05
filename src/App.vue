<template>
  <DefaultLayout />
  <Transition name="app-splash">
    <AppSplashScreen v-if="showSplash" />
  </Transition>
</template>

<script setup>
import { onBeforeUnmount, ref, watch } from 'vue'
import DefaultLayout from './app/layouts/default/DefaultLayout.vue'
import AppSplashScreen from './app/components/common/AppSplashScreen.vue'
import { authStore } from './app/stores/auth.store.js'

const showSplash = ref(false)
let hasShownAuthorizedSplash = false
let splashTimer = null

function runAuthorizedSplash() {
  if (hasShownAuthorizedSplash) return
  hasShownAuthorizedSplash = true
  showSplash.value = true
  splashTimer = window.setTimeout(() => {
    showSplash.value = false
  }, 2850)
}

watch(
  () => [authStore.initialized.value, authStore.isAuthenticated.value],
  ([isInitialized, isAuthenticated]) => {
    if (isInitialized && isAuthenticated) runAuthorizedSplash()
  },
  { immediate: true },
)

onBeforeUnmount(() => {
  if (splashTimer) window.clearTimeout(splashTimer)
})
</script>

<style scoped>
.app-splash-enter-active,
.app-splash-leave-active {
  transition:
    opacity 0.32s var(--ease-out),
    transform 0.32s var(--ease-out);
}

.app-splash-enter-from,
.app-splash-leave-to {
  opacity: 0;
  transform: scale(1.01);
}

@media (prefers-reduced-motion: reduce) {
  .app-splash-enter-active,
  .app-splash-leave-active {
    transition: none;
  }
}
</style>
