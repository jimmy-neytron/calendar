<template>
  <svg class="parameter-category-icon" viewBox="0 0 48 48" fill="none" aria-hidden="true">
    <g v-if="category === 'clothes'">
      <path d="M17 12 11 16l4 8 4-2v15h18V22l4 2 4-8-6-4-5-2c-1 4-3 6-6 6s-5-2-6-6l-5 2Z" />
      <path d="M20 31h14M24 12c.5 2 2 3 4 3s3.5-1 4-3" />
    </g>
    <g v-else-if="category === 'personal'">
      <circle cx="24" cy="17" r="7" />
      <path d="M12 39c1-8 5-12 12-12s11 4 12 12M8 10v28M6 14h4M6 20h4M6 26h4M6 32h4" />
    </g>
    <g v-else>
      <path d="M9 12h30v24H9zM15 18h18M15 24h12M15 30h8" />
      <path d="M5 8v8M1 12h8M39 38l5 5M44 38l-5 5" />
    </g>
  </svg>
</template>

<script setup lang="ts">
import type { PersonalParameterCategory } from '../../../types/personalParameter'

defineProps<{ category: PersonalParameterCategory }>()
</script>

<style scoped>
.parameter-category-icon{display:block;width:100%;height:100%;stroke:currentColor;stroke-width:1.8;stroke-linecap:round;stroke-linejoin:round}
</style>
