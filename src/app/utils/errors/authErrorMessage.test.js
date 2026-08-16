import { describe, expect, it } from 'vitest'
import {
  AUTH_FALLBACK_ERROR_MESSAGE,
  getAuthErrorMessage,
} from './authErrorMessage.js'

describe('локализация ошибок авторизации', () => {
  it.each([
    ['invalid_credentials', 'Неверный email или пароль'],
    ['email_not_confirmed', 'Сначала подтверди email по ссылке из письма'],
    ['user_already_exists', 'Аккаунт с таким email уже существует'],
    ['weak_password', 'Пароль слишком простой. Используй более надёжный пароль'],
    ['over_email_send_rate_limit', 'Слишком много писем. Попробуй немного позже'],
  ])('локализует код %s', (code, expected) => {
    expect(getAuthErrorMessage({ code, message: 'Unreadable server error' })).toBe(expected)
  })

  it('распознаёт старый ответ Supabase без кода', () => {
    expect(getAuthErrorMessage({ message: 'Invalid login credentials' })).toBe('Неверный email или пароль')
  })

  it('не показывает пользователю сырую или повреждённую строку сервера', () => {
    expect(getAuthErrorMessage({ message: 'Unreadable server error' })).toBe(AUTH_FALLBACK_ERROR_MESSAGE)
    expect(getAuthErrorMessage(null)).toBe(AUTH_FALLBACK_ERROR_MESSAGE)
  })
})
