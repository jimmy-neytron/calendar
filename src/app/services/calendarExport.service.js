export function exportEventToIcs(event) {
  const start = formatDateTime(event.date, event.startTime || '00:00', event.allDay)
  const end = formatDateTime(event.date, event.endTime || event.startTime || '23:59', event.allDay)
  const content = [
    'BEGIN:VCALENDAR',
    'VERSION:2.0',
    'PRODID:-//Workspace Calendar//RU',
    'CALSCALE:GREGORIAN',
    'BEGIN:VEVENT',
    `UID:${escapeIcs(event.id)}@workspace-calendar`,
    `DTSTAMP:${formatUtc(new Date())}`,
    event.allDay ? `DTSTART;VALUE=DATE:${start}` : `DTSTART:${start}`,
    event.allDay ? `DTEND;VALUE=DATE:${end}` : `DTEND:${end}`,
    `SUMMARY:${escapeIcs(event.title)}`,
    event.location ? `LOCATION:${escapeIcs(event.location)}` : '',
    event.notes ? `DESCRIPTION:${escapeIcs(event.notes)}` : '',
    'END:VEVENT',
    'END:VCALENDAR',
  ].filter(Boolean).join('\r\n')

  const blob = new Blob([content], { type: 'text/calendar;charset=utf-8' })
  const url = URL.createObjectURL(blob)
  const link = document.createElement('a')
  link.href = url
  link.download = `${sanitizeFilename(event.title || 'event')}.ics`
  link.click()
  URL.revokeObjectURL(url)
}

function formatDateTime(date, time, allDay) {
  if (allDay) return date.replaceAll('-', '')
  return `${date.replaceAll('-', '')}T${time.replace(':', '')}00`
}

function formatUtc(date) {
  return date.toISOString().replace(/[-:]/g, '').replace(/\.\d{3}Z$/, 'Z')
}

function escapeIcs(value) {
  return String(value || '')
    .replaceAll('\\', '\\\\')
    .replaceAll('\n', '\\n')
    .replaceAll(',', '\\,')
    .replaceAll(';', '\\;')
}

function sanitizeFilename(value) {
  return value.replace(/[<>:"/\\|?*]+/g, '-').trim() || 'event'
}
