<template>
  <div ref="root" class="calendar-shortcuts">
    <button
      class="calendar-shortcuts__trigger"
      type="button"
      aria-haspopup="dialog"
      :aria-expanded="isOpen"
      aria-controls="calendar-shortcuts-panel"
      aria-label="Подсказки по управлению календарём"
      data-tooltip="Команды календаря"
      @click="isOpen = !isOpen"
    >
      <UiIcon name="help" />
    </button>

    <Transition name="shortcuts-popover">
      <section
        v-if="isOpen"
        id="calendar-shortcuts-panel"
        class="calendar-shortcuts__panel"
        role="dialog"
        aria-label="Команды календаря"
      >
        <header>
          <div>
            <span>Быстрая помощь</span>
            <h2>Команды календаря</h2>
          </div>
          <button type="button" aria-label="Закрыть подсказки" @click="isOpen = false">
            <UiIcon name="close" />
          </button>
        </header>

        <div class="calendar-shortcuts__groups">
          <section v-for="group in CALENDAR_SHORTCUT_GROUPS" :key="group.title">
            <h3>{{ group.title }}</h3>
            <div
              v-for="item in group.items"
              :key="`${group.title}-${item.description}`"
              class="calendar-shortcuts__item"
            >
              <div class="calendar-shortcuts__keys">
                <template v-for="(key, index) in item.keys" :key="key">
                  <span v-if="index" aria-hidden="true">+</span>
                  <kbd>{{ key }}</kbd>
                </template>
              </div>
              <p>{{ item.description }}</p>
            </div>
          </section>
        </div>

        <footer>Горячие клавиши не срабатывают во время ввода текста.</footer>
      </section>
    </Transition>
  </div>
</template>

<script setup>
import { onBeforeUnmount, onMounted, ref } from 'vue'
import UiIcon from '../ui/UiIcon.vue'
import { CALENDAR_SHORTCUT_GROUPS } from '../../config/calendarShortcuts.js'

const root = ref(null)
const isOpen = ref(false)

function handleDocumentClick(event) {
  if (!root.value?.contains(event.target)) isOpen.value = false
}

function handleKeydown(event) {
  if (event.key === 'Escape') isOpen.value = false
}

onMounted(() => {
  document.addEventListener('click', handleDocumentClick)
  document.addEventListener('keydown', handleKeydown)
})

onBeforeUnmount(() => {
  document.removeEventListener('click', handleDocumentClick)
  document.removeEventListener('keydown', handleKeydown)
})
</script>

<style scoped>
.calendar-shortcuts {
  position: relative;
  flex: 0 0 auto;
}

.calendar-shortcuts__trigger {
  position: relative;
  display: grid;
  place-items: center;
  width: 34px;
  height: 34px;
  border: 1px solid var(--border-color);
  border-radius: 10px;
  padding: 0;
  color: var(--text-secondary);
  background: var(--control-bg);
  font-size: 17px;
  transition: .16s var(--ease-out);
}

.calendar-shortcuts__trigger:hover,
.calendar-shortcuts__trigger[aria-expanded='true'] {
  border-color: var(--border-strong);
  color: var(--text-primary);
  background: var(--control-bg-hover);
  transform: translateY(-1px);
}

.calendar-shortcuts__trigger::after {
  position: absolute;
  z-index: 80;
  top: calc(100% + 8px);
  right: 0;
  width: max-content;
  max-width: 180px;
  border: 1px solid var(--border-strong);
  border-radius: 8px;
  padding: 5px 8px;
  color: var(--text-primary);
  background: var(--toast-bg);
  box-shadow: var(--shadow-md);
  font-size: 10px;
  font-weight: 700;
  line-height: 1.3;
  content: attr(data-tooltip);
  opacity: 0;
  pointer-events: none;
  transform: translateY(-3px);
  transition: .16s var(--ease-out);
}

.calendar-shortcuts__trigger:hover::after,
.calendar-shortcuts__trigger:focus-visible::after {
  opacity: 1;
  transform: none;
}

.calendar-shortcuts__trigger[aria-expanded='true']::after {
  display: none;
}

.calendar-shortcuts__panel {
  position: absolute;
  z-index: 70;
  top: calc(100% + 9px);
  right: 0;
  width: min(390px, calc(100vw - 32px));
  overflow: hidden;
  border: 1px solid var(--border-strong);
  border-radius: 16px;
  color: var(--text-primary);
  background: var(--toast-bg);
  box-shadow: var(--shadow-lg);
  backdrop-filter: blur(18px);
}

.calendar-shortcuts__panel > header {
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  gap: 12px;
  border-bottom: 1px solid var(--border-color);
  padding: 14px 15px 12px;
}

.calendar-shortcuts__panel > header span {
  display: block;
  margin-bottom: 3px;
  color: var(--info);
  font-size: 9px;
  font-weight: 850;
  letter-spacing: .12em;
  text-transform: uppercase;
}

.calendar-shortcuts__panel h2,
.calendar-shortcuts__panel h3,
.calendar-shortcuts__panel p {
  margin: 0;
}

.calendar-shortcuts__panel h2 {
  font-size: 15px;
}

.calendar-shortcuts__panel > header button {
  display: grid;
  place-items: center;
  width: 28px;
  height: 28px;
  border: 0;
  border-radius: 8px;
  padding: 0;
  color: var(--text-muted);
  background: transparent;
  font-size: 15px;
}

.calendar-shortcuts__panel > header button:hover {
  color: var(--text-primary);
  background: var(--control-bg-hover);
}

.calendar-shortcuts__groups {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 16px;
  max-height: min(520px, 70vh);
  overflow-y: auto;
  padding: 14px 15px;
}

.calendar-shortcuts__groups section:last-child {
  grid-column: 1 / -1;
}

.calendar-shortcuts__groups h3 {
  margin-bottom: 7px;
  color: var(--text-muted);
  font-size: 9px;
  font-weight: 800;
  letter-spacing: .1em;
  text-transform: uppercase;
}

.calendar-shortcuts__item {
  display: grid;
  gap: 4px;
  padding: 7px 0;
  border-top: 1px solid var(--border-color);
}

.calendar-shortcuts__keys {
  display: flex;
  align-items: center;
  gap: 4px;
  color: var(--text-muted);
  font-size: 9px;
}

.calendar-shortcuts__keys kbd {
  min-width: 24px;
  border: 1px solid var(--border-strong);
  border-bottom-color: color-mix(in srgb, var(--border-strong) 65%, var(--text-muted));
  border-radius: 6px;
  padding: 3px 6px;
  color: var(--text-primary);
  background: var(--control-bg-hover);
  box-shadow: 0 1px 0 color-mix(in srgb, var(--text-primary) 12%, transparent);
  font: 700 9px/1.2 inherit;
  text-align: center;
  white-space: nowrap;
}

.calendar-shortcuts__item p {
  color: var(--text-secondary);
  font-size: 10px;
  line-height: 1.4;
}

.calendar-shortcuts__panel > footer {
  border-top: 1px solid var(--border-color);
  padding: 9px 15px 11px;
  color: var(--text-muted);
  font-size: 9px;
}

.shortcuts-popover-enter-active,
.shortcuts-popover-leave-active {
  transition: opacity .16s var(--ease-out), transform .2s var(--ease-out);
  transform-origin: top right;
}

.shortcuts-popover-enter-from,
.shortcuts-popover-leave-to {
  opacity: 0;
  transform: translateY(-5px) scale(.98);
}

@media (max-width: 520px) {
  .calendar-shortcuts__panel {
    position: fixed;
    top: 72px;
    right: 10px;
    left: 10px;
    width: auto;
  }

  .calendar-shortcuts__groups {
    grid-template-columns: 1fr;
  }

  .calendar-shortcuts__groups section:last-child {
    grid-column: auto;
  }
}
</style>
