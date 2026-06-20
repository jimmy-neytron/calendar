<template>
  <label class="ui-input" :class="{ 'ui-input--error': error }">
    <span v-if="label" class="ui-input__label">{{ label }} <b v-if="required">*</b></span>

    <textarea
      v-if="type === 'textarea'"
      class="ui-input__control ui-input__control--textarea"
      :value="modelValue"
      :placeholder="placeholder"
      :disabled="disabled"
      rows="4"
      @input="$emit('update:modelValue', $event.target.value)"
      @focus="$emit('focus', $event)"
      @blur="$emit('blur', $event)"
      @keydown="$emit('keydown', $event)"
    />

    <input
      v-else
      class="ui-input__control"
      :value="modelValue"
      :type="type"
      :placeholder="placeholder"
      :disabled="disabled"
      @input="$emit('update:modelValue', $event.target.value)"
      @focus="$emit('focus', $event)"
      @blur="$emit('blur', $event)"
      @keydown="$emit('keydown', $event)"
    />

    <transition name="fade">
      <span v-if="error" class="ui-input__error">{{ error }}</span>
    </transition>
  </label>
</template>

<script setup>
defineProps({
  modelValue: { type: [String, Number], default: '' },
  type: { type: String, default: 'text' },
  label: { type: String, default: '' },
  placeholder: { type: String, default: '' },
  error: { type: String, default: '' },
  required: { type: Boolean, default: false },
  disabled: { type: Boolean, default: false },
})

defineEmits(['update:modelValue', 'focus', 'blur', 'keydown'])
</script>

<style scoped>
.ui-input {
  display: grid;
  gap: 5px;
}

.ui-input__label {
  font-size: 11px;
  font-weight: 700;
  color: var(--text-secondary);
}

.ui-input__label b {
  color: var(--danger);
}

.ui-input__control {
  width: 100%;
  min-height: 36px;
  border: 1px solid var(--border-color);
  border-radius: var(--radius-md);
  padding: 0 11px;
  color: var(--text-primary);
  background: var(--field-bg);
  outline: none;
  transition: border 0.2s var(--ease-out), background 0.2s var(--ease-out), box-shadow 0.2s var(--ease-out);
}

.ui-input__control:focus {
  border-color: var(--accent-border);
  background: var(--field-bg-focus);
  box-shadow: 0 0 0 2px var(--accent-soft);
}

.ui-input__control--textarea {
  min-height: 76px;
  padding-top: 10px;
  resize: vertical;
}

.ui-input--error .ui-input__control {
  border-color: color-mix(in srgb, var(--danger) 55%, transparent);
}

.ui-input__error {
  color: var(--danger);
  font-size: 11px;
}
</style>
