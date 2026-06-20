export const eventSchema = {
  id: { type: 'string', required: true },
  title: { type: 'string', required: true, minLength: 1 },
  date: { type: 'string', required: true, pattern: /^\d{4}-\d{2}-\d{2}$/ },
  startTime: { type: 'string', required: false },
  endTime: { type: 'string', required: false },
  memberIds: { type: 'array', required: false },
  calendarId: { type: 'string', required: false },
  responsibleId: { type: 'string', required: false },
  attendeeResponses: { type: 'object', required: false },
  comments: { type: 'array', required: false },
  category: { type: 'string', required: true },
  allDay: { type: 'boolean', required: false },
  repeat: { type: 'string', required: false },
  repeatUntil: { type: 'string', required: false },
}

export const backupSchema = {
  version: { type: 'string', required: true },
  type: { type: 'string', required: true },
  exportedAt: { type: 'string', required: true },
  data: { type: 'object', required: true },
}
