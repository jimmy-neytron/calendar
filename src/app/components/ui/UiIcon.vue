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

const props = defineProps({ name: { type: String, required: true } })
const icons = {
  close: { paths: ['M6 6l12 12', 'M18 6L6 18'] },
  left: { paths: ['M15 18l-6-6 6-6'] },
  right: { paths: ['M9 18l6-6-6-6'] },
  up: { paths: ['M18 15l-6-6-6 6'] },
  down: { paths: ['M6 9l6 6 6-6'] },
  plus: { paths: ['M12 5v14', 'M5 12h14'] },
  minus: { paths: ['M5 12h14'] },
  trash: { paths: ['M4 7h16', 'M9 7V4h6v3', 'M7 7l1 13h8l1-13', 'M10 11v5', 'M14 11v5'] },
  copy: { paths: ['M8 8h11v11H8z', 'M5 16H4V5h11v1'] },
  edit: { paths: ['M4 20h4l11-11-4-4L4 16v4z', 'M13.5 6.5l4 4'] },
  check: { paths: ['M5 12l4 4L19 6'] },
  calendar: { paths: ['M5 4h14a1 1 0 011 1v15H4V5a1 1 0 011-1z', 'M8 2v4', 'M16 2v4', 'M4 9h16'] },
  activity: { paths: ['M4 12h4l2-6 4 12 2-6h4'] },
  filter: { paths: ['M4 6h16', 'M7 12h10', 'M10 18h4'] },
  refresh: { paths: ['M20 11a8 8 0 10-2 5', 'M20 5v6h-6'] },
  download: { paths: ['M12 3v12', 'M7 10l5 5 5-5', 'M5 21h14'] },
  search: { paths: ['M11 18a7 7 0 100-14 7 7 0 000 14z', 'M20 20l-4-4'] },
  heart: { paths: ['M20.8 4.6a5.5 5.5 0 00-7.8 0L12 5.7l-1.1-1.1a5.5 5.5 0 00-7.8 7.8L12 21l8.8-8.6a5.5 5.5 0 000-7.8z'] },
  sparkles: { paths: ['M12 3l1.3 4.2L17 9l-3.7 1.8L12 15l-1.3-4.2L7 9l3.7-1.8L12 3z', 'M19 15l.7 2.3L22 18l-2.3.7L19 21l-.7-2.3L16 18l2.3-.7L19 15z'] },
  sport: { paths: ['M6 8v8', 'M3 10v4', 'M18 8v8', 'M21 10v4', 'M6 12h12'] },
  chart: { paths: ['M5 20V10', 'M12 20V4', 'M19 20v-7'] },
  users: { paths: ['M16 21v-2a4 4 0 00-4-4H6a4 4 0 00-4 4v2', 'M9 11a4 4 0 100-8 4 4 0 000 8z', 'M22 21v-2a4 4 0 00-3-3.87', 'M16 3.13a4 4 0 010 7.75'] },
  settings: { paths: ['M4 7h6', 'M14 7h6', 'M4 17h10', 'M18 17h2', 'M10 4v6', 'M14 14v6'] },
  movie: { paths: ['M4 6h16v14H4z', 'M4 10h16', 'M8 6l2-3', 'M14 6l2-3'] },
  star: { paths: ['M12 3l2.8 5.7 6.2.9-4.5 4.4 1.1 6.2-5.6-3-5.6 3 1.1-6.2L3 9.6l6.2-.9L12 3z'] },
  key: { paths: ['M14 7a5 5 0 11-1.5 3.6L21 19v2h-3v-2h-2v-2h-2l-2.1-2.1', 'M7 7h.01'] },
  warning: { paths: ['M12 3L2.8 20h18.4L12 3z', 'M12 9v4', 'M12 17h.01'] },
  play: { paths: ['M8 5l11 7-11 7V5z'] },
  grid: { paths: ['M4 4h6v6H4z', 'M14 4h6v6h-6z', 'M4 14h6v6H4z', 'M14 14h6v6h-6z'] },
  table: { paths: ['M4 5h16v14H4z', 'M4 10h16', 'M4 15h16', 'M10 5v14'] },
}
const current = computed(() => icons[props.name] || icons.close)
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
