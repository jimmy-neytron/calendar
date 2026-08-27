<template>
  <div
    class="route-loader"
    :class="{ 'route-loader--standalone': standalone }"
    role="status"
    aria-live="polite"
    :aria-label="`Загружается ${title}`"
  >
    <div class="route-loader__content">
      <span class="route-loader__mark" aria-hidden="true"><i /></span>
      <strong>{{ title }}</strong>
      <small>Загрузка</small>
    </div>
  </div>
</template>

<script setup lang="ts">
defineProps<{ title: string; standalone?: boolean }>()
</script>

<style scoped>
.route-loader {
  position: fixed;
  z-index: 19;
  inset: var(--header-height, 58px) 0 0 var(--sidebar-width, 224px);
  display: grid;
  place-items: center;
  color: var(--text-primary);
  background: var(--app-bg, #090909);
}

.route-loader--standalone {
  z-index: 100;
  inset: 0;
}

.route-loader__content {
  display: grid;
  justify-items: center;
  gap: 7px;
  text-align: center;
}

.route-loader__mark {
  position: relative;
  width: 42px;
  height: 42px;
  display: grid;
  place-items: center;
  margin-bottom: 5px;
  border: 1px solid var(--border-color);
  border-radius: 14px;
  background: var(--control-bg);
}

.route-loader__mark::before {
  width: 8px;
  height: 8px;
  border-radius: 3px;
  background: var(--accent);
  box-shadow: 0 0 14px color-mix(in srgb, var(--accent) 55%, transparent);
  content: '';
}

.route-loader__mark i {
  position: absolute;
  inset: 6px;
  border: 1px solid transparent;
  border-top-color: var(--accent);
  border-radius: 10px;
  animation: loader-turn .9s linear infinite;
}

.route-loader__mark i::after {
  position: absolute;
  top: -2px;
  right: 3px;
  width: 4px;
  height: 4px;
  border-radius: 50%;
  background: var(--accent);
  content: '';
}

.route-loader__content strong {
  font-size: 12px;
  font-weight: 800;
}

.route-loader__content small {
  color: var(--text-muted);
  font-size: 8px;
  font-weight: 700;
  letter-spacing: .12em;
  text-transform: uppercase;
}

@keyframes loader-turn {
  to { transform: rotate(360deg); }
}

@media (max-width: 860px) {
  .route-loader { inset: var(--header-height, 58px) 0 76px; }
  .route-loader--standalone { inset: 0; }
}

@media (prefers-reduced-motion: reduce) {
  .route-loader__mark i { animation: none; transform: rotate(35deg); }
}
</style>
