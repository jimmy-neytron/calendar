<template>
  <label class="ui-checkbox" :class="{ 'ui-checkbox--checked': modelValue, 'ui-checkbox--disabled': disabled }">
    <input
      :class="inputClass"
      type="checkbox"
      :checked="modelValue"
      :disabled="disabled"
      :aria-label="label || undefined"
      @change="onChange"
    />
    <span class="ui-checkbox__box" aria-hidden="true"><span /></span>
    <span v-if="$slots.default" class="ui-checkbox__label"><slot /></span>
  </label>
</template>

<script setup lang="ts">
const props = withDefaults(defineProps<{ modelValue?: boolean; disabled?: boolean; label?: string; inputClass?: string }>(), {
  modelValue: false,
  disabled: false,
  label: '',
  inputClass: '',
})
const emit = defineEmits<{ 'update:modelValue': [value: boolean] }>()

function onChange(event: Event) {
  emit('update:modelValue', (event.target as HTMLInputElement).checked)
}
</script>

<style scoped>
.ui-checkbox{position:relative;display:inline-flex;align-items:center;gap:8px;min-width:18px;min-height:18px;color:var(--text-secondary);cursor:pointer;user-select:none}.ui-checkbox input{position:absolute;width:1px;height:1px;overflow:hidden;opacity:0;pointer-events:none}.ui-checkbox__box{display:grid;width:18px;height:18px;flex:0 0 auto;place-items:center;border:1px solid var(--border-strong);border-radius:6px;background:var(--field-bg);transition:border-color .16s,background-color .16s,box-shadow .16s,transform .12s}.ui-checkbox__box span{width:8px;height:5px;border:0 solid #fff;border-width:0 0 2px 2px;opacity:0;transform:translateY(-1px) rotate(-45deg) scale(.7);transition:opacity .12s,transform .12s}.ui-checkbox--checked .ui-checkbox__box{border-color:var(--accent);background:var(--accent)}.ui-checkbox--checked .ui-checkbox__box span{opacity:1;transform:translateY(-1px) rotate(-45deg) scale(1)}.ui-checkbox:hover:not(.ui-checkbox--disabled) .ui-checkbox__box{border-color:color-mix(in srgb,var(--accent) 55%,var(--border-strong))}.ui-checkbox:has(input:focus-visible) .ui-checkbox__box{box-shadow:0 0 0 3px color-mix(in srgb,var(--accent) 22%,transparent)}.ui-checkbox:active:not(.ui-checkbox--disabled) .ui-checkbox__box{transform:scale(.92)}.ui-checkbox--disabled{cursor:not-allowed;opacity:.5}.ui-checkbox__label{font-size:11px;line-height:1.35}
@media(prefers-reduced-motion:reduce){.ui-checkbox__box,.ui-checkbox__box span{transition:none}}
</style>
