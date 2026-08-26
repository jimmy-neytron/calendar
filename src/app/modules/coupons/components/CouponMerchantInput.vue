<template>
  <label ref="root" class="merchant-input">
    <span class="merchant-input__label">Магазин или сервис</span>
    <span class="merchant-input__control" :class="{ 'merchant-input__control--open': isOpen }">
      <input
        :value="modelValue"
        type="text"
        placeholder="Введите или выберите магазин"
        autocomplete="organization"
        role="combobox"
        :aria-expanded="isOpen"
        aria-autocomplete="list"
        @focus="open"
        @input="handleInput"
        @keydown="handleKeydown"
      />
      <button type="button" aria-label="Показать магазины" @click.prevent="toggle"><svg viewBox="0 0 12 12"><path d="m2.25 4.5 3.75 3 3.75-3" /></svg></button>
    </span>

    <Transition name="merchant-options">
      <span v-if="isOpen && (filteredOptions.length || canCreate)" class="merchant-input__panel" role="listbox">
        <button
          v-for="(option, index) in filteredOptions"
          :key="option"
          type="button"
          role="option"
          :aria-selected="normalize(option) === normalize(modelValue)"
          :class="{ active: highlightedIndex === index }"
          @mousedown.prevent="select(option)"
          @mouseenter="highlightedIndex = index"
        >
          <span class="merchant-input__avatar">{{ option.charAt(0).toLocaleUpperCase('ru-RU') }}</span>
          <span><strong>{{ option }}</strong><small>Сохранённый магазин</small></span>
          <svg v-if="normalize(option) === normalize(modelValue)" class="merchant-input__check" viewBox="0 0 16 16"><path d="m3.25 8.25 3 3 6.5-6.5" /></svg>
        </button>
        <button v-if="canCreate" type="button" role="option" class="merchant-input__create" :class="{ active: highlightedIndex === filteredOptions.length }" @mousedown.prevent="acceptNew" @mouseenter="highlightedIndex = filteredOptions.length">
          <span class="merchant-input__avatar merchant-input__avatar--new">+</span>
          <span><strong>Добавить «{{ modelValue.trim() }}»</strong><small>Сохранится вместе с купоном</small></span>
        </button>
      </span>
    </Transition>
  </label>
</template>

<script setup lang="ts">
import { computed, onBeforeUnmount, onMounted, ref } from 'vue'

const props = withDefaults(defineProps<{ modelValue: string; options?: string[] }>(), { options: () => [] })
const emit = defineEmits<{ 'update:modelValue': [value: string] }>()
const root = ref<HTMLElement | null>(null)
const isOpen = ref(false)
const highlightedIndex = ref(-1)
const normalizedOptions = computed(() => Array.from(new Map(props.options.filter(Boolean).map((option) => [normalize(option), option.trim()])).values()))
const filteredOptions = computed(() => {
  const query = normalize(props.modelValue)
  return normalizedOptions.value.filter((option) => !query || normalize(option).includes(query)).slice(0, 7)
})
const canCreate = computed(() => Boolean(props.modelValue.trim()) && !normalizedOptions.value.some((option) => normalize(option) === normalize(props.modelValue)))
const itemCount = computed(() => filteredOptions.value.length + Number(canCreate.value))

function normalize(value: string) { return value.trim().toLocaleLowerCase('ru-RU').replace(/ё/g, 'е') }
function open() { isOpen.value = true; highlightedIndex.value = -1 }
function toggle() { isOpen.value ? close() : open() }
function close() { isOpen.value = false; highlightedIndex.value = -1 }
function handleInput(event: Event) { emit('update:modelValue', (event.target as HTMLInputElement).value); isOpen.value = true; highlightedIndex.value = -1 }
function select(value: string) { emit('update:modelValue', value); close() }
function acceptNew() { emit('update:modelValue', props.modelValue.trim()); close() }
function handleKeydown(event: KeyboardEvent) {
  if (event.key === 'ArrowDown' || event.key === 'ArrowUp') {
    event.preventDefault()
    if (!isOpen.value) return open()
    if (!itemCount.value) return
    const direction = event.key === 'ArrowDown' ? 1 : -1
    highlightedIndex.value = (highlightedIndex.value + direction + itemCount.value) % itemCount.value
  } else if (event.key === 'Enter' && isOpen.value && highlightedIndex.value >= 0) {
    event.preventDefault()
    const option = filteredOptions.value[highlightedIndex.value]
    option ? select(option) : acceptNew()
  } else if (event.key === 'Escape') close()
}
function handleOutsideClick(event: PointerEvent) { if (!root.value?.contains(event.target as Node)) close() }
onMounted(() => document.addEventListener('pointerdown', handleOutsideClick))
onBeforeUnmount(() => document.removeEventListener('pointerdown', handleOutsideClick))
</script>

<style scoped>
.merchant-input { position: relative; min-width: 0; display: grid; gap: 5px; }.merchant-input__label { color: var(--text-secondary); font-size: 11px; font-weight: 700; }.merchant-input__control { display: grid; grid-template-columns: minmax(0, 1fr) 34px; align-items: center; border: 1px solid var(--border-color); border-radius: var(--radius-md); background: var(--field-bg); transition: border .2s var(--ease-out), background .2s var(--ease-out), box-shadow .2s var(--ease-out); }.merchant-input__control:focus-within, .merchant-input__control--open { border-color: var(--accent-border); background: var(--field-bg-focus); box-shadow: 0 0 0 2px var(--accent-soft); }.merchant-input__control input { width: 100%; min-width: 0; min-height: 36px; border: 0; padding: 0 0 0 11px; color: var(--text-primary); background: transparent; outline: 0; }.merchant-input__control > button { height: 28px; display: grid; place-items: center; border: 0; border-left: 1px solid var(--border-color); color: var(--text-muted); background: transparent; cursor: pointer; }.merchant-input__control > button svg { width: 12px; height: 12px; fill: none; stroke: currentColor; stroke-linecap: round; stroke-linejoin: round; stroke-width: 1.7; transition: transform .18s var(--ease-out); }.merchant-input__control--open > button svg { transform: rotate(180deg); }
.merchant-input__panel { position: absolute; z-index: 20; top: calc(100% + 6px); right: 0; left: 0; display: grid; gap: 3px; max-height: 270px; overflow-y: auto; border: 1px solid var(--border-strong); border-radius: 12px; padding: 5px; background: color-mix(in srgb, var(--card-solid) 97%, transparent); box-shadow: 0 18px 42px rgb(0 0 0 / 28%); backdrop-filter: blur(18px); }.merchant-input__panel > button { width: 100%; min-width: 0; display: grid; grid-template-columns: 32px minmax(0, 1fr) 18px; align-items: center; gap: 9px; border: 0; border-radius: 9px; padding: 7px 9px; color: var(--text-secondary); background: transparent; text-align: left; cursor: pointer; }.merchant-input__panel > button:hover, .merchant-input__panel > button.active { color: var(--text-primary); background: var(--control-bg-hover); }.merchant-input__panel > button > span:nth-child(2) { min-width: 0; display: grid; gap: 3px; }.merchant-input__panel strong, .merchant-input__panel small { overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }.merchant-input__panel strong { font-size: 10px; }.merchant-input__panel small { color: var(--text-muted); font-size: 8px; }.merchant-input__avatar { width: 29px; height: 29px; display: grid; place-items: center; border-radius: 9px; color: var(--accent); background: var(--accent-soft); font-size: 11px; font-weight: 800; }.merchant-input__avatar--new { color: var(--success); background: color-mix(in srgb, var(--success) 10%, transparent); font-size: 17px; }.merchant-input__check { width: 15px; fill: none; stroke: var(--accent); stroke-linecap: round; stroke-linejoin: round; stroke-width: 1.8; }.merchant-options-enter-active, .merchant-options-leave-active { transition: opacity .14s var(--ease-out), transform .14s var(--ease-out); }.merchant-options-enter-from, .merchant-options-leave-to { opacity: 0; transform: translateY(-4px); }
</style>
