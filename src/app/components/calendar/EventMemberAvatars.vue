<template>
  <span
    v-if="eventMembers.length"
    class="event-member-avatars"
    :class="{ 'event-member-avatars--compact': compact }"
    :title="memberNames"
    :aria-label="`Участники: ${memberNames}`"
  >
    <span
      v-for="member in visibleMembers"
      :key="member.id"
      class="event-member-avatars__avatar"
      :style="{ '--member-color': member.color }"
    >
      {{ member.avatar || member.name?.slice(0, 1) || '?' }}
    </span>
    <span v-if="hiddenCount" class="event-member-avatars__more">+{{ hiddenCount }}</span>
  </span>
</template>

<script setup>
import { computed } from 'vue'

const props = defineProps({
  memberIds: { type: Array, default: () => [] },
  members: { type: Array, default: () => [] },
  compact: { type: Boolean, default: false },
})

const eventMembers = computed(() => props.memberIds
  .map((memberId) => props.members.find((member) => member.id === memberId))
  .filter(Boolean))
const visibleMembers = computed(() => eventMembers.value.slice(0, props.compact ? 2 : 3))
const hiddenCount = computed(() => Math.max(0, eventMembers.value.length - visibleMembers.value.length))
const memberNames = computed(() => eventMembers.value.map((member) => member.name).join(', '))
</script>

<style scoped>
.event-member-avatars {
  display: inline-flex;
  align-items: center;
  flex: 0 0 auto;
  padding-left: 4px;
}

.event-member-avatars__avatar,
.event-member-avatars__more {
  display: grid;
  place-items: center;
  width: 20px;
  height: 20px;
  margin-left: -4px;
  border: 2px solid var(--control-bg);
  border-radius: 50%;
  color: #071016;
  background: var(--member-color, var(--control-bg-hover));
  font-size: 9px;
  font-weight: 800;
  line-height: 1;
}

.event-member-avatars__more {
  color: var(--text-secondary);
  background: var(--control-bg-hover);
}

.event-member-avatars--compact .event-member-avatars__avatar,
.event-member-avatars--compact .event-member-avatars__more {
  width: 17px;
  height: 17px;
  font-size: 8px;
}
</style>
