<template>
  <Teleport to="body">
    <Transition name="palette">
      <div v-if="modelValue" class="command-palette" @click.self="close">
        <section role="dialog" aria-modal="true" aria-label="Командная палитра">
          <header>
            <span>⌕</span>
            <input
              ref="inputRef"
              v-model="query"
              type="search"
              placeholder="Найти действие, событие или раздел…"
              @keydown.down.prevent="move(1)"
              @keydown.up.prevent="move(-1)"
              @keydown.enter.prevent="runActive"
              @keydown.esc="close"
            />
            <kbd>Esc</kbd>
          </header>

          <div class="command-palette__list">
            <button
              v-if="smartSuggestion"
              type="button"
              class="command-palette__smart"
              :class="{ active: activeIndex === 0 }"
              @mouseenter="activeIndex = 0"
              @click="createSmartEvent"
            >
              <span>✦</span>
              <span>
                <strong>Создать «{{ smartSuggestion.title }}»</strong>
                <small>
                  {{ smartSuggestion.preview.dateLabel }} · {{ smartSuggestion.preview.timeLabel }}
                  <template v-if="smartSuggestion.preview.categoryLabel"> · {{ smartSuggestion.preview.categoryLabel }}</template>
                  <template v-if="smartSuggestion.preview.memberLabel"> · {{ smartSuggestion.preview.memberLabel }}</template>
                </small>
              </span>
              <kbd>Enter</kbd>
            </button>
            <button
              v-for="(command, index) in filteredCommands"
              :key="command.id"
              type="button"
              :class="{ active: index + smartOffset === activeIndex }"
              @mouseenter="activeIndex = index + smartOffset"
              @click="run(command)"
            >
              <span>{{ command.icon }}</span>
              <span>
                <strong>{{ command.label }}</strong>
                <small>{{ command.description }}</small>
              </span>
              <kbd v-if="command.shortcut">{{ command.shortcut }}</kbd>
            </button>
            <p v-if="!filteredCommands.length && !smartSuggestion">Ничего не найдено</p>
          </div>
        </section>
      </div>
    </Transition>
  </Teleport>
</template>

<script setup>
import { computed, nextTick, ref, watch } from 'vue'

const props = defineProps({
  modelValue: { type: Boolean, default: false },
  commands: { type: Array, default: () => [] },
  smartSuggestion: { type: Object, default: null },
})
const emit = defineEmits(['update:modelValue', 'run', 'query-change', 'smart-create'])
const inputRef = ref(null)
const query = ref('')
const activeIndex = ref(0)
const smartOffset = computed(() => props.smartSuggestion ? 1 : 0)
const filteredCommands = computed(() => {
  const needle = query.value.trim().toLowerCase()
  if (!needle) return props.commands
  return props.commands.filter((command) => (
    `${command.label} ${command.description || ''}`.toLowerCase().includes(needle)
  ))
})

watch(() => props.modelValue, async (open) => {
  if (!open) return
  query.value = ''
  activeIndex.value = 0
  await nextTick()
  inputRef.value?.focus()
})

watch(query, (value) => emit('query-change', value))

watch(filteredCommands, () => {
  activeIndex.value = 0
})

watch(() => props.smartSuggestion, () => {
  activeIndex.value = 0
})

function move(delta) {
  const count = filteredCommands.value.length + smartOffset.value
  if (!count) return
  activeIndex.value = (activeIndex.value + delta + count) % count
}

function runActive() {
  if (props.smartSuggestion && activeIndex.value === 0) {
    createSmartEvent()
    return
  }
  const command = filteredCommands.value[activeIndex.value - smartOffset.value]
  if (command) run(command)
}

function run(command) {
  emit('run', command)
  close()
}

function createSmartEvent() {
  emit('smart-create', props.smartSuggestion)
  close()
}

function close() {
  emit('update:modelValue', false)
}
</script>

<style scoped>
.command-palette {
  position: fixed;
  inset: 0;
  z-index: 150;
  display: grid;
  justify-items: center;
  align-items: start;
  padding: min(14vh, 110px) 16px 16px;
  background: rgba(0, 0, 0, 0.52);
  backdrop-filter: blur(8px);
}

.command-palette > section {
  width: min(620px, 100%);
  overflow: hidden;
  border: 1px solid var(--border-strong);
  border-radius: 18px;
  background: var(--card-solid);
  box-shadow: var(--shadow-lg);
}

.command-palette header {
  display: grid;
  grid-template-columns: auto minmax(0, 1fr) auto;
  align-items: center;
  gap: 10px;
  border-bottom: 1px solid var(--border-color);
  padding: 12px 14px;
}

.command-palette input {
  min-width: 0;
  border: 0;
  color: var(--text-primary);
  background: transparent;
  outline: 0;
  font-size: 15px;
}

.command-palette kbd {
  border: 1px solid var(--border-color);
  border-radius: 6px;
  padding: 2px 6px;
  color: var(--text-muted);
  background: var(--control-bg);
  font: inherit;
  font-size: 9px;
}

.command-palette__list {
  display: grid;
  gap: 3px;
  max-height: min(480px, 65vh);
  overflow-y: auto;
  padding: 7px;
}

.command-palette__list button {
  display: grid;
  grid-template-columns: 32px minmax(0, 1fr) auto;
  align-items: center;
  gap: 9px;
  border: 1px solid transparent;
  border-radius: 11px;
  padding: 8px;
  color: var(--text-secondary);
  background: transparent;
  text-align: left;
}

.command-palette__list button.active {
  border-color: var(--border-strong);
  color: var(--text-primary);
  background: var(--control-bg-hover);
}

.command-palette__smart {
  border-color: color-mix(in srgb, var(--success) 25%, var(--border-color)) !important;
  background: color-mix(in srgb, var(--success) 7%, transparent) !important;
}

.command-palette__smart > span:first-child {
  color: var(--success);
}

.command-palette__list button > span:first-child {
  display: grid;
  place-items: center;
  width: 32px;
  height: 32px;
  border-radius: 9px;
  background: var(--control-bg);
}

.command-palette__list strong,
.command-palette__list small {
  display: block;
}

.command-palette__list small,
.command-palette__list p {
  color: var(--text-muted);
  font-size: 10px;
}

.command-palette__list p {
  padding: 24px;
  text-align: center;
}

.palette-enter-active,
.palette-leave-active {
  transition: opacity 0.16s var(--ease-out);
}

.palette-enter-from,
.palette-leave-to {
  opacity: 0;
}
</style>
