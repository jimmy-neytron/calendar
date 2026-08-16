// @vitest-environment jsdom

import { describe, expect, it } from 'vitest'
import {
  mapAdminModal,
  matchesAdminModalAudience,
  normalizeAdminModalAudience,
  normalizeAdminModalButtons,
  sanitizeAdminModalHtml,
} from './adminModalMapper.js'

describe('административные модальные окна', () => {
  it('одинаково преобразует строку базы для редактора и показа', () => {
    const result = mapAdminModal({
      id: 'm1', title: '', modal_type: 'unknown', display_mode: 'once', is_active: true,
      buttons: [{ label: 'Сайт', url: 'example.com' }],
    })
    expect(result).toMatchObject({ id: 'm1', title: '', modalType: 'notice', displayMode: 'once', isActive: true })
    expect(result.buttons[0].url).toBe('https://example.com')
  })

  it('очищает аудиторию и удаляет неизвестные роли и тарифы', () => {
    expect(normalizeAdminModalAudience({
      emails: ' A@EXAMPLE.COM, a@example.com ', roles: ['admin', 'owner'], tiers: ['pro', 'plus'],
    })).toEqual({
      mode: 'targeted', userIds: [], emails: ['a@example.com'], roles: ['admin'], tiers: ['pro'],
    })
  })

  it('фильтрует пустые кнопки в режиме показа', () => {
    expect(normalizeAdminModalButtons([
      { label: '', url: '' }, { label: 'Закрыть', action: 'close' },
    ], { filterInvalid: true })).toHaveLength(1)
  })

  it('удаляет опасный HTML и обработчики событий', () => {
    const result = sanitizeAdminModalHtml('<script>x()</script><a href="javascript:x()" onclick="x()">Текст</a>')
    expect(result).toBe('<a>Текст</a>')
  })

  it('проверяет точного пользователя и пересечение роли с тарифом', () => {
    const audience = normalizeAdminModalAudience({ mode: 'targeted', roles: ['user'], tiers: ['pro'] })
    expect(matchesAdminModalAudience(audience, { role: 'user', subscriptionTier: 'pro' })).toBe(true)
    expect(matchesAdminModalAudience(audience, { role: 'admin', subscriptionTier: 'pro' })).toBe(false)
  })
})
