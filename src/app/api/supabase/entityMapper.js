const camelToSnake = (key) => key.replace(/[A-Z]/g, (letter) => `_${letter.toLowerCase()}`)
const snakeToCamel = (key) => key.replace(/_([a-z])/g, (_, letter) => letter.toUpperCase())

function mapKeys(value, mapper) {
  const nullableFields = new Set([
    'repeatUntil',
    'calendarId',
    'responsibleId',
    'plannedEventId',
    'eventId',
    'reminderEventId',
  ])
  return Object.fromEntries(
    Object.entries(value || {})
      .filter(([, item]) => item !== undefined)
      .map(([key, item]) => [mapper(key), item === '' && nullableFields.has(key) ? null : item])
  )
}

export const toDatabaseRow = (item) => mapKeys(item, camelToSnake)
export const fromDatabaseRow = (row) => mapKeys(row, snakeToCamel)
