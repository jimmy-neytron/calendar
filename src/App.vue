<template>
  <DefaultLayout />
  <Transition name="route-skeleton">
    <RouteLoadingOverlay
      v-if="navigationStore.isNavigating.value && navigationStore.showPageSkeleton.value"
      :title="navigationStore.targetTitle.value"
      :standalone="navigationStore.targetStandalone.value"
    />
  </Transition>
  <div
    v-if="navigationStore.isNavigating.value && !navigationStore.showPageSkeleton.value"
    class="route-progress"
    role="progressbar"
    aria-label="Загрузка страницы"
  />
</template>

<script setup>
import DefaultLayout from './app/layouts/default/DefaultLayout.vue'
import RouteLoadingOverlay from './app/components/common/RouteLoadingOverlay.vue'
import { navigationStore } from './app/stores/navigation.store.js'
</script>

<style scoped>
.route-progress {
  position: fixed;
  z-index: 110;
  top: 0;
  left: 0;
  width: 35%;
  height: 2px;
  background: linear-gradient(90deg, transparent, var(--accent), transparent);
  animation: route-progress 0.9s ease-in-out infinite;
}

.route-skeleton-enter-active,
.route-skeleton-leave-active { transition: opacity .14s ease; }
.route-skeleton-enter-from,
.route-skeleton-leave-to { opacity: 0; }

@keyframes route-progress {
  from { transform: translateX(-100%); }
  to { transform: translateX(390%); }
}
</style>
