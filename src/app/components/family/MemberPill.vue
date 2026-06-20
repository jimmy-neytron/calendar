<template>
  <span class="member-pill" :style="{ '--member-color': member.color }">
    <span class="member-pill__avatar">{{ member.avatar }}</span>
    <span v-if="showName">{{ member.name }}</span>
  </span>
</template>

<script setup>
defineProps({
  member: { type: Object, required: true },
  showName: { type: Boolean, default: true },
})
</script>

<style scoped>
.member-pill {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  min-height: 24px;
  border: 1px solid color-mix(in srgb, var(--member-color) 44%, transparent);
  border-radius: var(--radius-pill);
  padding: 2px 8px 2px 3px;
  background: color-mix(in srgb, var(--member-color) 10%, transparent);
  color: var(--text-primary);
  font-size: 11px;
  font-weight: 600;
}

.member-pill__avatar {
  display: grid;
  place-items: center;
  width: 18px;
  height: 18px;
  border-radius: 50%;
  color: #071016;
  background: var(--member-color);
}
</style>
