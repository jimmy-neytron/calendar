// @vitest-environment jsdom
import { afterEach, beforeEach, expect, it, vi } from 'vitest'
import { createApp } from 'vue'
import { useNotification } from './useNotification.js'
import AppToast from '../../components/common/AppToast.vue'
const service = useNotification()
beforeEach(() => vi.useFakeTimers())
afterEach(() => { for (const item of [...service.notifications.value]) service.dismiss(item.id); vi.useRealTimers() })
it.each([
  [{ ok: true }, 'Фильм добавлен', {}, 'success', 'Фильм добавлен', 'Готово'],
  [{ ok: true }, 'Фильм удалён из списка', { successType: 'info' }, 'info', 'Фильм удалён из списка', 'Информация'],
  [{ ok: true }, 'Отметка снята', { successType: 'info' }, 'info', 'Отметка снята', 'Информация'],
  [{ ok: false, message: 'Сеть недоступна' }, 'Фильм удалён', { successType: 'info' }, 'danger', 'Сеть недоступна', 'Ошибка'],
  [{ ok: false }, 'Фильм добавлен', { errorMessage: 'Не удалось сохранить фильм' }, 'danger', 'Не удалось сохранить фильм', 'Ошибка'],
  [{ ok: false, reason: 'validation', message: 'Укажи имя' }, 'Запись сохранена', {}, 'warning', 'Укажи имя', 'Обрати внимание'],
])('renders the actual outcome %#', (result, message, options, type, expectedMessage, title) => {
  const id = service.notifyResult(result, message, options)
  const notification = service.notifications.value.find(item => item.id === id)
  expect(notification).toMatchObject({ type, message: expectedMessage })
  const host = document.createElement('div')
  const app = createApp(AppToast, { notification })
  app.mount(host)
  try {
    expect(host.querySelector('small').textContent).toBe(title)
    expect(host.querySelector('p').textContent).toBe(expectedMessage)
    expect(host.querySelector('article').getAttribute('role')).toBe(type === 'danger' ? 'alert' : 'status')
  } finally { app.unmount() }
})
it('preserves undo actions and dismisses notifications on the original timer', () => {
  const action = vi.fn()
  const id = service.notify('Запись удалена', 'info', { action, actionLabel: 'Вернуть', duration: 8000 })
  expect(service.notifications.value[0]).toMatchObject({ id, actionLabel: 'Вернуть', action })
  vi.advanceTimersByTime(7999)
  expect(service.notifications.value).toHaveLength(1)
  vi.advanceTimersByTime(1)
  expect(service.notifications.value).toHaveLength(0)
})
