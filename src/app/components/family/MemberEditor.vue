<template>
  <section class="member-editor">
    <header>
      <h2>Профили семьи</h2>
      <p>Цветные профили помогают быстро понять, кому относится событие.</p>
    </header>

    <div class="member-editor__list">
      <article v-for="member in members" :key="member.id" class="member-editor__card">
        <span class="member-editor__avatar" :style="{ background: member.color }">{{ member.avatar }}</span>
        <input :value="member.name" @input="$emit('update', member.id, { name: $event.target.value })" />
        <UiColorPicker :model-value="member.color" label="Цвет" @update:model-value="$emit('update', member.id, { color: $event })" />
        <UiIconButton icon="close" label="Удалить участника" variant="danger" @click="$emit('delete', member.id)" />
      </article>
    </div>

    <form class="member-editor__form" @submit.prevent="createMember">
      <UiInput v-model="form.name" label="Имя" placeholder="Участник семьи" />
      <UiColorPicker v-model="form.color" label="Цвет участника" />
      <UiButton icon="＋">Добавить</UiButton>
    </form>
  </section>
</template>

<script setup>
import { reactive } from 'vue'
import UiButton from '../ui/UiButton.vue'
import UiInput from '../ui/UiInput.vue'
import UiColorPicker from '../ui/UiColorPicker.vue'
import UiIconButton from '../ui/UiIconButton.vue'
import { MEMBER_COLORS } from '../../utils/constants/calendarConstants.js'

const props = defineProps({
  members: { type: Array, default: () => [] },
})

const emit = defineEmits(['add', 'update', 'delete'])

const form = reactive({
  name: '',
  color: MEMBER_COLORS[props.members.length % MEMBER_COLORS.length],
})

const createMember = () => {
  if (!form.name.trim()) return
  emit('add', { ...form })
  form.name = ''
  form.color = MEMBER_COLORS[Math.floor(Math.random() * MEMBER_COLORS.length)]
}
</script>

<style scoped>
.member-editor {
  display: grid;
  gap: 8px;
  border: 1px solid var(--border-color);
  border-radius: var(--radius-lg);
  padding: 12px;
  background: var(--control-bg);
}

.member-editor p {
  color: var(--text-muted);
}

.member-editor__list {
  display: grid;
  gap: 8px;
}

.member-editor__card,
.member-editor__form {
  display: grid;
  grid-template-columns: auto minmax(0, 1fr) auto auto;
  align-items: center;
  gap: 8px;
}

.member-editor__card {
  border: 1px solid var(--border-color);
  border-radius: var(--radius-md);
  padding: 8px;
  background: var(--control-bg);
}

.member-editor__avatar {
  display: grid;
  place-items: center;
  width: 30px;
  height: 30px;
  border-radius: 50%;
  color: white;
  font-weight: 700;
}

.member-editor input:not([type='color']) {
  min-height: 34px;
  border: 1px solid var(--border-color);
  border-radius: var(--radius-md);
  padding: 0 9px;
  color: var(--text-primary);
  background: var(--control-bg);
  outline: none;
}

@media (max-width: 620px) {
  .member-editor__card,
  .member-editor__form {
    grid-template-columns: 1fr;
  }
}
</style>
