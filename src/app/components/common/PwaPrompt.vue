<template>
  <Transition name="pwa-prompt">
    <aside v-if="visible" class="pwa-prompt" :class="`pwa-prompt--${mode}`" role="status">
      <span class="pwa-prompt__icon"><UiIcon :name="icon" /></span>
      <div>
        <strong>{{ title }}</strong>
        <p>{{ description }}</p>
      </div>
      <UiButton v-if="mode === 'install'" size="sm" @click="installApp">Установить</UiButton>
      <UiButton v-else-if="mode === 'update'" size="sm" @click="applyUpdate">Обновить</UiButton>
      <button
        v-if="mode !== 'offline'"
        class="pwa-prompt__close"
        type="button"
        aria-label="Скрыть"
        @click="dismiss"
      >
        <UiIcon name="close" />
      </button>
    </aside>
  </Transition>
</template>

<script setup>
import { computed, ref } from 'vue'
import UiButton from '../ui/UiButton.vue'
import UiIcon from '../ui/UiIcon.vue'
import { usePwa } from '../../composables/pwa/usePwa.js'

const DISMISSED_KEY = 'workspace-calendar:pwa-prompt-dismissed'
const dismissed = ref(sessionStorage.getItem(DISMISSED_KEY) === 'true')
const {
  canInstall,
  isOnline,
  needsIosInstructions,
  updateAvailable,
  install,
  applyUpdate,
} = usePwa()

const mode = computed(() => {
  if (!isOnline.value) return 'offline'
  if (updateAvailable.value) return 'update'
  if (canInstall.value) return 'install'
  if (needsIosInstructions.value) return 'ios'
  return ''
})
const visible = computed(() => Boolean(mode.value) && (!dismissed.value || mode.value === 'offline' || mode.value === 'update'))
const icon = computed(() => ({
  offline: 'warning',
  update: 'refresh',
  install: 'download',
  ios: 'download',
})[mode.value] || 'activity')
const title = computed(() => ({
  offline: 'Работаем без интернета',
  update: 'Доступна новая версия',
  install: 'Установить приложение',
  ios: 'Добавить на экран «Домой»',
})[mode.value] || '')
const description = computed(() => ({
  offline: 'Изменения сохранятся локально и синхронизируются после подключения.',
  update: 'Обнови приложение, чтобы получить последние исправления.',
  install: 'Будет открываться как обычное приложение и работать офлайн.',
  ios: 'В Safari нажми «Поделиться», затем «На экран Домой».',
})[mode.value] || '')

async function installApp() {
  const installed = await install()
  if (installed) dismiss()
}

function dismiss() {
  dismissed.value = true
  sessionStorage.setItem(DISMISSED_KEY, 'true')
}
</script>

<style scoped>
.pwa-prompt {
  position: fixed;
  z-index: 65;
  right: 14px;
  bottom: 14px;
  width: min(430px, calc(100vw - 24px));
  display: grid;
  grid-template-columns: 38px minmax(0, 1fr) auto 26px;
  align-items: center;
  gap: 10px;
  border: 1px solid var(--accent-border);
  border-radius: 16px;
  padding: 10px;
  background: color-mix(in srgb, var(--panel-bg) 96%, transparent);
  box-shadow: var(--shadow-lg);
  backdrop-filter: blur(18px);
}

.pwa-prompt--offline {
  grid-template-columns: 38px minmax(0, 1fr);
  border-color: color-mix(in srgb, var(--warning) 38%, var(--border-color));
}

.pwa-prompt__icon {
  display: grid;
  place-items: center;
  width: 38px;
  height: 38px;
  border-radius: 11px;
  color: var(--text-inverse);
  background: var(--accent);
  font-size: 18px;
}

.pwa-prompt--offline .pwa-prompt__icon {
  background: var(--warning);
}

.pwa-prompt strong,
.pwa-prompt p {
  display: block;
}

.pwa-prompt strong {
  font-size: 11px;
}

.pwa-prompt p {
  margin: 2px 0 0;
  color: var(--text-muted);
  font-size: 9px;
}

.pwa-prompt__close {
  display: grid;
  place-items: center;
  width: 26px;
  height: 26px;
  border: 0;
  border-radius: 50%;
  color: var(--text-muted);
  background: transparent;
}

.pwa-prompt-enter-active,
.pwa-prompt-leave-active {
  transition: opacity .2s var(--ease-out), transform .2s var(--ease-out);
}

.pwa-prompt-enter-from,
.pwa-prompt-leave-to {
  opacity: 0;
  transform: translateY(12px);
}

@media (max-width: 860px) {
  .pwa-prompt {
    right: 10px;
    bottom: 82px;
  }
}

@media (max-width: 560px) {
  .pwa-prompt {
    grid-template-columns: 34px minmax(0, 1fr) 24px;
  }

  .pwa-prompt :deep(.ui-button) {
    grid-column: 2;
    justify-self: start;
  }

  .pwa-prompt__close {
    grid-column: 3;
    grid-row: 1;
  }
}
</style>
