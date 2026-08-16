import { describe, expect, it } from 'vitest'
import { APP_CONFIG } from '../../config/app.config.js'
import { validateBackupPayload, validateCalendarData } from './dataValidator.js'

const key = (suffix) => `${APP_CONFIG.storageKey}:${suffix}`

function validData() {
  return {
    [key('events')]: [{ id: 'e1', title: 'Встреча', date: '2026-08-16', category: 'work' }],
    [key('accounts')]: [{ id: 'u1', name: 'Аня', email: 'a@example.com', color: '#fff' }],
    [key('workspaces')]: [{ id: 'w1', name: 'Семья', memberIds: ['u1'] }],
    [key('workspace-invites')]: [{ id: 'i1', code: 'ABC', workspaceId: 'w1' }],
    [key('sport-exercises')]: [{ id: 's1', title: 'Бег', weekday: 1 }],
    [key('sport-completions')]: [{ id: 'c1', exerciseId: 's1', date: '2026-08-16' }],
  }
}

describe('проверка резервной копии', () => {
  it('принимает целостную копию', () => {
    expect(validateBackupPayload({ type: 'workspace-calendar-backup', data: validData() })).toEqual({
      valid: true,
      errors: [],
    })
  })

  it('отклоняет неподходящий файл до проверки коллекций', () => {
    const result = validateBackupPayload({ type: 'text/plain' })
    expect(result.valid).toBe(false)
    expect(result.errors).toEqual([
      'Неверный тип резервной копии',
      'В файле нет блока data',
    ])
  })

  it('находит повреждения в каждой важной коллекции', () => {
    const data = validData()
    data[key('events')][0].date = '2026-02-30'
    data[key('accounts')][0].email = ''
    data[key('workspaces')][0].memberIds = null
    data[key('workspace-invites')][0].code = ''
    data[key('sport-exercises')][0].weekday = 8
    data[key('sport-completions')][0].date = 'вчера'

    const errors = validateCalendarData(data)
    expect(errors).toEqual(expect.arrayContaining([
      'Событие 1: некорректная дата',
      'Аккаунт 1: нет email',
      'Пространство 1: memberIds должен быть массивом',
      'Приглашение 1: нет кода',
      'Упражнение 1: некорректный день недели',
      'Спорт-отметка 1: некорректная дата',
    ]))
  })
})
