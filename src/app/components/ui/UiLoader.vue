<template>
  <span class="ui-loader" :class="`ui-loader--${size}`" :style="{ color }" />
</template>

<script setup>
defineProps({
  size: { type: String, default: 'md' },
  color: { type: String, default: 'currentColor' },
})
</script>

<style scoped>
.ui-loader {
  display: inline-block;
  border: 2px solid color-mix(in srgb, var(--text-primary) 22%, transparent);
  border-top-color: currentColor;
  border-radius: 50%;
  animation: spin 0.8s linear infinite;
}

.ui-loader--sm { width: 16px; height: 16px; }
.ui-loader--md { width: 24px; height: 24px; }
.ui-loader--lg { width: 36px; height: 36px; }
</style>
