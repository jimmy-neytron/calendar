import { describe, expect, it } from 'vitest'
import { buildCourseSchedule } from './courseSchedule.service.js'

const lessons = Array.from({ length: 4 }, (_, index) => ({
  id: `lesson-${index + 1}`,
  title: `Урок ${index + 1}`,
  lessonPosition: index + 1,
  durationMinutes: 45,
}))

describe('buildCourseSchedule', () => {
  it('раскладывает уроки только по выбранным дням', () => {
    const result = buildCourseSchedule({
      lessons,
      startDate: '2026-08-01',
      weekdayTimes: [
        { weekday: 1, startTime: '19:00' },
        { weekday: 3, startTime: '20:00' },
      ],
    })
    expect(result.map((item) => item.scheduledDate)).toEqual([
      '2026-08-03', '2026-08-05', '2026-08-10', '2026-08-12',
    ])
    expect(result[0].endTime).toBe('19:45')
  })

  it('пропускает исключённые даты', () => {
    const result = buildCourseSchedule({
      lessons: lessons.slice(0, 2),
      startDate: '2026-08-03',
      weekdayTimes: [{ weekday: 1, startTime: '19:00' }],
      excludedDates: ['2026-08-03'],
    })
    expect(result[0].scheduledDate).toBe('2026-08-10')
  })

  it('не допускает переход через полночь', () => {
    expect(() => buildCourseSchedule({
      lessons: [{ ...lessons[0], durationMinutes: 90 }],
      startDate: '2026-08-03',
      weekdayTimes: [{ weekday: 1, startTime: '23:00' }],
    })).toThrow('после полуночи')
  })
})
