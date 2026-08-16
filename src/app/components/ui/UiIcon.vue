<template>
  <svg
    class="ui-icon"
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    stroke-width="1.8"
    stroke-linecap="round"
    stroke-linejoin="round"
    aria-hidden="true"
  >
    <path v-for="(path, index) in paths" :key="index" :d="path" />
    <circle v-for="(circle, index) in circles" :key="`c-${index}`" v-bind="circle" />
  </svg>
</template>

<script setup>
import { computed } from 'vue'
import { resolveUiIcon } from './uiIcons.js'

const props = defineProps({ name: { type: String, required: true } })
const current = computed(() => resolveUiIcon(props.name))
const paths = computed(() => current.value.paths || [])
const circles = computed(() => current.value.circles || [])
</script>

<style scoped>
.ui-icon {
  display: block;
  width: 1em;
  height: 1em;
  flex: 0 0 auto;
}
</style>
