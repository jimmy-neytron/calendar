<template>
  <svg class="garment-icon" viewBox="0 0 48 48" fill="none" aria-hidden="true">
    <path v-if="category === 'top'" d="M16 11 7 17l5 9 5-3v15h22V23l5 3 5-9-9-6-6-2c-1 4-4 6-7 6s-6-2-7-6l-4 2Z" />
    <path v-else-if="category === 'bottom'" d="M15 8h18l3 32-11-1-1-20-1 20-11 1 3-32Z" />
    <path v-else-if="category === 'outerwear'" d="M17 9 8 16l5 10 5-3v17h20V23l5 3 5-10-9-7-5-2-6 7-6-7-5 2ZM28 14v26M23 21h-5M33 21h5" />
    <path v-else-if="category === 'shoes'" d="M7 29c5 0 9-3 11-9l6 4c4 3 8 5 15 5 3 0 5 2 5 5v4H7v-9ZM9 33h33" />
    <path v-else-if="category === 'accessory'" d="M13 19h22l4 21H9l4-21ZM18 20v-5a6 6 0 0 1 12 0v5" />
    <path v-else d="M18 8h12l3 7 6 25H9l6-25 3-7ZM18 8c0 4 2 6 6 6s6-2 6-6" />
  </svg>
</template>

<script setup lang="ts">
import type { WardrobeCategory } from '../../../types/wardrobe'
defineProps<{ category: WardrobeCategory }>()
</script>

<style scoped>.garment-icon{display:block;width:100%;height:100%;stroke:currentColor;stroke-width:1.8;stroke-linecap:round;stroke-linejoin:round}</style>

