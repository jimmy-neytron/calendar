<template>
  <span
    ref="rootRef"
    class="ui-select"
    :class="{
      'ui-select--open': isOpen,
      'ui-select--compact': compact,
      'ui-select--pill': pill,
      'ui-select--error': error,
      'ui-select--disabled': disabled,
    }"
  >
    <button
      ref="triggerRef"
      class="ui-select__trigger"
      type="button"
      role="combobox"
      :disabled="disabled"
      :aria-label="ariaLabel || undefined"
      :aria-controls="listboxId"
      :aria-expanded="isOpen"
      :aria-invalid="error ? 'true' : undefined"
      aria-haspopup="listbox"
      @click="toggle"
      @focus="$emit('focus', $event)"
      @blur="$emit('blur', $event)"
      @keydown="handleTriggerKeydown"
    >
      <span class="ui-select__value">{{ selectedOption?.label || placeholder }}</span>
      <span class="ui-select__indicator" aria-hidden="true">
        <svg viewBox="0 0 12 12">
          <path d="m2.25 4.5 3.75 3 3.75-3" />
        </svg>
      </span>
    </button>

    <Teleport to="body">
      <Transition name="ui-select-panel">
        <div
          v-if="isOpen"
          :id="listboxId"
          ref="panelRef"
          class="ui-select__panel"
          role="listbox"
          tabindex="-1"
          :style="panelStyle"
          :aria-label="ariaLabel || undefined"
          @keydown="handlePanelKeydown"
        >
          <div class="ui-select__options">
            <button
              v-for="(option, index) in options"
              :key="option.key"
              class="ui-select__option"
              :class="{
                'ui-select__option--selected': isSelected(option),
                'ui-select__option--highlighted': index === highlightedIndex,
              }"
              type="button"
              role="option"
              :disabled="option.disabled"
              :aria-selected="isSelected(option)"
              @mouseenter="highlightedIndex = index"
              @click="selectOption(option)"
            >
              <span>{{ option.label }}</span>
              <svg v-if="isSelected(option)" class="ui-select__check" viewBox="0 0 16 16" aria-hidden="true">
                <path d="m3.25 8.25 3 3 6.5-6.5" />
              </svg>
            </button>
          </div>
        </div>
      </Transition>
    </Teleport>
  </span>
</template>

<script setup>
import {
  Fragment,
  computed,
  getCurrentInstance,
  nextTick,
  onBeforeUnmount,
  onMounted,
  ref,
  useSlots,
} from 'vue'

const props = defineProps({
  modelValue: { type: [String, Number], default: '' },
  modelModifiers: { type: Object, default: () => ({}) },
  ariaLabel: { type: String, default: '' },
  placeholder: { type: String, default: 'Выберите' },
  compact: { type: Boolean, default: false },
  pill: { type: Boolean, default: false },
  error: { type: [String, Boolean], default: false },
  disabled: { type: Boolean, default: false },
})

const emit = defineEmits(['update:modelValue', 'change', 'focus', 'blur'])
const slots = useSlots()
const instance = getCurrentInstance()
const rootRef = ref(null)
const triggerRef = ref(null)
const panelRef = ref(null)
const isOpen = ref(false)
const highlightedIndex = ref(-1)
const panelStyle = ref({})
const listboxId = `ui-select-${instance?.uid ?? Math.random().toString(36).slice(2)}`

const options = computed(() => collectOptions(slots.default?.() || []))
const selectedOption = computed(() => options.value.find(isSelected))

function collectOptions(nodes, result = []) {
  nodes.forEach((node, index) => {
    if (!node) return

    if (node.type === 'option') {
      result.push({
        key: node.key ?? `${String(node.props?.value)}-${index}`,
        value: node.props?.value ?? '',
        label: getNodeText(node.children).trim(),
        disabled: Boolean(node.props?.disabled),
      })
      return
    }

    if (node.type === Fragment || Array.isArray(node.children)) {
      collectOptions(Array.isArray(node.children) ? node.children : [], result)
    }
  })

  return result
}

function getNodeText(children) {
  if (typeof children === 'string' || typeof children === 'number') return String(children)
  if (Array.isArray(children)) return children.map((child) => getNodeText(child?.children ?? child)).join('')
  return ''
}

function isSelected(option) {
  return option.value === props.modelValue
}

function toggle() {
  if (props.disabled) return
  isOpen.value ? close() : open()
}

async function open() {
  isOpen.value = true
  highlightedIndex.value = Math.max(0, options.value.findIndex(isSelected))
  await nextTick()
  updatePanelPosition()
  panelRef.value?.focus?.()
}

function close({ restoreFocus = false } = {}) {
  isOpen.value = false
  highlightedIndex.value = -1
  if (restoreFocus) nextTick(() => triggerRef.value?.focus())
}

function selectOption(option) {
  if (option.disabled) return

  const value = props.modelModifiers.number ? Number(option.value) : option.value
  emit('update:modelValue', value)
  emit('change', value)
  close({ restoreFocus: true })
}

function moveHighlight(direction) {
  if (!options.value.length) return

  let nextIndex = highlightedIndex.value
  do {
    nextIndex = (nextIndex + direction + options.value.length) % options.value.length
  } while (options.value[nextIndex]?.disabled && nextIndex !== highlightedIndex.value)

  highlightedIndex.value = nextIndex
  nextTick(() => {
    panelRef.value
      ?.querySelectorAll('.ui-select__option')
      ?.[nextIndex]
      ?.scrollIntoView({ block: 'nearest' })
  })
}

function handleTriggerKeydown(event) {
  if (['ArrowDown', 'ArrowUp'].includes(event.key)) {
    event.preventDefault()
    if (!isOpen.value) open()
    else moveHighlight(event.key === 'ArrowDown' ? 1 : -1)
    return
  }

  if (event.key === 'Enter' || event.key === ' ') {
    event.preventDefault()
    if (isOpen.value && highlightedIndex.value >= 0) {
      selectOption(options.value[highlightedIndex.value])
    } else {
      open()
    }
  } else if (event.key === 'Escape' && isOpen.value) {
    event.preventDefault()
    close({ restoreFocus: true })
  }
}

function handlePanelKeydown(event) {
  if (event.key === 'ArrowDown' || event.key === 'ArrowUp') {
    event.preventDefault()
    moveHighlight(event.key === 'ArrowDown' ? 1 : -1)
  } else if (event.key === 'Enter' && highlightedIndex.value >= 0) {
    event.preventDefault()
    selectOption(options.value[highlightedIndex.value])
  } else if (event.key === 'Escape') {
    event.preventDefault()
    close({ restoreFocus: true })
  } else if (event.key === 'Tab') {
    close()
  }
}

function updatePanelPosition() {
  const trigger = triggerRef.value
  if (!trigger) return

  const rect = trigger.getBoundingClientRect()
  const estimatedHeight = Math.min(options.value.length * 38 + 12, 280)
  const spaceBelow = window.innerHeight - rect.bottom
  const openAbove = spaceBelow < estimatedHeight && rect.top > spaceBelow
  const width = Math.min(rect.width, window.innerWidth - 16)

  panelStyle.value = {
    left: `${Math.max(8, Math.min(rect.left, window.innerWidth - width - 8))}px`,
    top: openAbove ? 'auto' : `${rect.bottom + 6}px`,
    bottom: openAbove ? `${window.innerHeight - rect.top + 6}px` : 'auto',
    width: `${width}px`,
  }
}

function handleDocumentPointerDown(event) {
  if (!isOpen.value) return
  if (rootRef.value?.contains(event.target) || panelRef.value?.contains(event.target)) return
  close()
}

function handleViewportChange() {
  if (isOpen.value) updatePanelPosition()
}

onMounted(() => {
  document.addEventListener('pointerdown', handleDocumentPointerDown)
  window.addEventListener('resize', handleViewportChange)
  window.addEventListener('scroll', handleViewportChange, true)
})

onBeforeUnmount(() => {
  document.removeEventListener('pointerdown', handleDocumentPointerDown)
  window.removeEventListener('resize', handleViewportChange)
  window.removeEventListener('scroll', handleViewportChange, true)
})
</script>

<style scoped>
.ui-select {
  position: relative;
  display: grid;
  width: 100%;
  min-width: 0;
}

.ui-select__trigger {
  display: grid;
  grid-template-columns: minmax(0, 1fr) 28px;
  align-items: center;
  width: 100%;
  min-width: 0;
  min-height: 38px;
  border: 1px solid var(--border-color);
  border-radius: 10px;
  padding: 0 4px 0 12px;
  color: var(--text-primary);
  background:
    linear-gradient(180deg, color-mix(in srgb, var(--field-bg-focus) 70%, transparent), var(--field-bg));
  box-shadow: inset 0 1px 0 color-mix(in srgb, white 4%, transparent);
  outline: none;
  text-align: left;
  cursor: pointer;
  transition:
    border-color 0.18s var(--ease-out),
    background 0.18s var(--ease-out),
    box-shadow 0.18s var(--ease-out),
    transform 0.18s var(--ease-out);
}

.ui-select__trigger:hover:not(:disabled) {
  border-color: var(--border-strong);
  background: var(--field-bg-focus);
}

.ui-select__trigger:focus-visible,
.ui-select--open .ui-select__trigger {
  border-color: color-mix(in srgb, var(--accent) 42%, var(--border-color));
  background: var(--field-bg-focus);
  box-shadow:
    0 0 0 3px color-mix(in srgb, var(--accent) 9%, transparent),
    inset 0 1px 0 color-mix(in srgb, white 5%, transparent);
}

.ui-select__value {
  min-width: 0;
  overflow: hidden;
  font-weight: 650;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.ui-select__indicator {
  display: grid;
  place-items: center;
  width: 28px;
  height: 28px;
  border-radius: 7px;
  color: var(--text-muted);
  transition:
    color 0.18s var(--ease-out),
    background 0.18s var(--ease-out),
    transform 0.22s var(--ease-out);
}

.ui-select__indicator svg {
  width: 13px;
  height: 13px;
  overflow: visible;
  fill: none;
  stroke: currentColor;
  stroke-linecap: round;
  stroke-linejoin: round;
  stroke-width: 1.7;
}

.ui-select__trigger:hover .ui-select__indicator,
.ui-select--open .ui-select__indicator {
  color: var(--text-primary);
  background: var(--control-bg-hover);
}

.ui-select--open .ui-select__indicator {
  transform: rotate(180deg);
}

.ui-select__panel {
  position: fixed;
  z-index: 1000;
  min-width: 130px;
  border: 1px solid var(--border-strong);
  border-radius: 12px;
  padding: 5px;
  overflow: hidden;
  color: var(--text-primary);
  background: color-mix(in srgb, var(--card-solid) 96%, transparent);
  box-shadow:
    0 18px 48px rgba(0, 0, 0, 0.28),
    0 4px 12px rgba(0, 0, 0, 0.18),
    inset 0 1px 0 color-mix(in srgb, white 6%, transparent);
  outline: none;
  backdrop-filter: blur(20px) saturate(140%);
}

.ui-select__options {
  display: grid;
  gap: 2px;
  max-height: 268px;
  overflow-y: auto;
  overscroll-behavior: contain;
}

.ui-select__option {
  display: grid;
  grid-template-columns: minmax(0, 1fr) 18px;
  align-items: center;
  width: 100%;
  min-height: 34px;
  border: 0;
  border-radius: 8px;
  padding: 7px 9px;
  color: var(--text-secondary);
  background: transparent;
  outline: none;
  text-align: left;
  cursor: pointer;
  transition:
    color 0.14s var(--ease-out),
    background 0.14s var(--ease-out),
    transform 0.14s var(--ease-out);
}

.ui-select__option span {
  overflow: hidden;
  font-weight: 620;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.ui-select__option--highlighted {
  color: var(--text-primary);
  background: var(--control-bg-hover);
}

.ui-select__option--selected {
  color: var(--text-primary);
  background: var(--accent-soft);
}

.ui-select__option--highlighted.ui-select__option--selected {
  background: color-mix(in srgb, var(--accent-soft) 74%, var(--control-bg-hover));
}

.ui-select__option:active:not(:disabled) {
  transform: scale(0.985);
}

.ui-select__option:disabled {
  opacity: 0.4;
  cursor: not-allowed;
}

.ui-select__check {
  width: 15px;
  height: 15px;
  fill: none;
  stroke: var(--accent);
  stroke-linecap: round;
  stroke-linejoin: round;
  stroke-width: 1.8;
}

.ui-select--compact .ui-select__trigger {
  min-height: 32px;
  grid-template-columns: minmax(0, 1fr) 24px;
  padding-left: 10px;
  font-size: 12px;
}

.ui-select--compact .ui-select__indicator {
  width: 24px;
  height: 24px;
}

.ui-select--pill .ui-select__trigger {
  border-radius: var(--radius-pill);
}

.ui-select--pill .ui-select__indicator {
  border-radius: 50%;
}

.ui-select--error .ui-select__trigger {
  border-color: color-mix(in srgb, var(--danger) 55%, transparent);
}

.ui-select--disabled {
  opacity: 0.55;
}

.ui-select__trigger:disabled {
  cursor: not-allowed;
}

.ui-select-panel-enter-active,
.ui-select-panel-leave-active {
  transform-origin: top center;
  transition:
    opacity 0.16s var(--ease-out),
    transform 0.16s var(--ease-out);
}

.ui-select-panel-enter-from,
.ui-select-panel-leave-to {
  opacity: 0;
  transform: translateY(-4px) scale(0.98);
}

@media (prefers-reduced-motion: reduce) {
  .ui-select__trigger,
  .ui-select__indicator,
  .ui-select__option,
  .ui-select-panel-enter-active,
  .ui-select-panel-leave-active {
    transition: none;
  }
}
</style>
