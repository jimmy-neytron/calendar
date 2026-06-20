import { ref } from 'vue'
import { calendarStore } from '../../stores/calendar.store.js'
import { REMINDER_OPTIONS } from '../../utils/constants/calendarConstants.js'

const enabled = ref(localStorage.getItem('workspace-calendar:browser-notifications') === 'true')
const notified = new Set()
let timer = null

export function useLocalReminders() {
  async function enable() {
    if (!('Notification' in window)) return { ok: false, message: 'Браузер не поддерживает уведомления' }
    const permission = await Notification.requestPermission()
    enabled.value = permission === 'granted'
    localStorage.setItem('workspace-calendar:browser-notifications', String(enabled.value))
    if (enabled.value) start()
    return { ok: enabled.value, message: enabled.value ? 'Уведомления включены' : 'Разрешение не выдано' }
  }

  function disable() {
    enabled.value = false
    localStorage.setItem('workspace-calendar:browser-notifications', 'false')
    stop()
  }

  function start() {
    if (!enabled.value || Notification.permission !== 'granted' || timer) return
    check()
    timer = window.setInterval(check, 30000)
  }

  function stop() {
    if (timer) window.clearInterval(timer)
    timer = null
  }

  function check() {
    const now = Date.now()
    calendarStore.sortedEvents.value.forEach((event) => {
      if (event.allDay || !event.startTime || !event.reminder || event.reminder === 'none') return
      const minutes = REMINDER_OPTIONS.find((option) => option.value === event.reminder)?.minutes
      if (minutes == null) return
      const startAt = new Date(`${event.date}T${event.startTime}`).getTime()
      const dueAt = startAt - minutes * 60000
      const key = `${event.id}:${event.date}:${event.startTime}`
      if (now >= dueAt && now < startAt && !notified.has(key)) {
        new Notification(event.title, {
          body: `${event.startTime}${event.location ? ` · ${event.location}` : ''}`,
          icon: '/favicon.svg',
        })
        notified.add(key)
      }
    })
  }

  return { enabled, enable, disable, start, stop }
}
