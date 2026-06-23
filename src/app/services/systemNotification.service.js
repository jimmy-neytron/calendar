export async function showSystemEventReminder(reminder) {
  if (
    typeof window === 'undefined'
    || !('Notification' in window)
    || Notification.permission !== 'granted'
    || !('serviceWorker' in navigator)
  ) return false

  const registration = await navigator.serviceWorker.ready
  const eventId = reminder.eventId || ''
  const eventDate = reminder.eventDate || ''

  await registration.showNotification(reminder.title || 'Скоро событие', {
    body: reminder.message || '',
    icon: '/icons/icon-192.png',
    badge: '/icons/icon-192.png',
    tag: `event-reminder:${reminder.id}`,
    data: {
      notificationId: reminder.id,
      eventId,
      url: `/?event=${encodeURIComponent(eventId)}&eventDate=${encodeURIComponent(eventDate)}`,
    },
  })

  return true
}
