<template>
  <section class="smart-event-input panel">
    <div class="smart-event-input__icon" aria-hidden="true">✦</div>

    <div class="smart-event-input__content">
      <label for="smart-event-query">Умное добавление</label>
      <input
        id="smart-event-query"
        :value="modelValue"
        type="text"
        autocomplete="off"
        placeholder="Например: Завтра в 12 добавь встречу"
        @input="$emit('update:modelValue', $event.target.value)"
        @keydown.enter.prevent="submit"
      />
      <p v-if="suggestion">
        Создать «{{ suggestion.title }}» · {{ suggestion.preview.dateLabel }} · {{ suggestion.preview.timeLabel }}
      </p>
      <p v-else class="smart-event-input__hint">
        Укажите день и, при необходимости, время
      </p>
    </div>

    <UiButton :disabled="!suggestion" @click="submit">
      Добавить
    </UiButton>
  </section>
</template>

<script setup>
import UiButton from '../ui/UiButton.vue'

const props = defineProps({
  modelValue: { type: String, default: '' },
  suggestion: { type: Object, default: null },
})

const emit = defineEmits(['update:modelValue', 'submit'])

function submit() {
  if (props.suggestion) emit('submit', props.suggestion)
}
</script>

<style scoped>
.smart-event-input {
  display: grid;
  grid-template-columns: auto minmax(0, 1fr) auto;
  align-items: center;
  gap: 12px;
  padding: 12px 14px;
}

.smart-event-input__icon {
  display: grid;
  place-items: center;
  width: 38px;
  height: 38px;
  border-radius: 12px;
  color: var(--success);
  background: color-mix(in srgb, var(--success) 10%, var(--control-bg));
  font-size: 18px;
}

.smart-event-input__content {
  min-width: 0;
}

.smart-event-input label {
  display: block;
  margin-bottom: 3px;
  color: var(--text-muted);
  font-size: 9px;
  font-weight: 800;
  letter-spacing: 0.09em;
  text-transform: uppercase;
}

.smart-event-input input {
  width: 100%;
  border: 0;
  padding: 0;
  color: var(--text-primary);
  background: transparent;
  outline: 0;
  font-size: 14px;
}

.smart-event-input p {
  margin: 4px 0 0;
  color: var(--success);
  font-size: 10px;
}

.smart-event-input .smart-event-input__hint {
  color: var(--text-muted);
}

@media (max-width: 620px) {
  .smart-event-input {
    grid-template-columns: auto minmax(0, 1fr);
  }

  .smart-event-input :deep(.ui-button) {
    grid-column: 1 / -1;
    width: 100%;
  }
}
</style>
