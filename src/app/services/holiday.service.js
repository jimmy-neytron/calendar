const HOLIDAY_API_URL = 'https://date.nager.at/api/v3/publicholidays'
const holidayCache = new Map()

export async function getPublicHolidays(year, countryCode) {
  const cacheKey = `${countryCode}:${year}`
  if (holidayCache.has(cacheKey)) return holidayCache.get(cacheKey)

  const response = await fetch(`${HOLIDAY_API_URL}/${year}/${countryCode}`)
  if (!response.ok) {
    throw new Error(`Holiday API request failed with status ${response.status}`)
  }

  const holidays = await response.json()
  const normalizedHolidays = holidays.map((holiday) => ({
    date: holiday.date,
    name: holiday.localName || holiday.name,
    type: holiday.types?.[0] || 'Public',
  }))

  holidayCache.set(cacheKey, normalizedHolidays)
  return normalizedHolidays
}
