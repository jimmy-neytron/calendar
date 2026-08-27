import { beforeEach, describe, expect, it, vi } from 'vitest'

const authApiMock = vi.hoisted(() => ({
  signIn: vi.fn(),
  signUp: vi.fn(),
  signOut: vi.fn(),
  getProfile: vi.fn(),
  getSession: vi.fn(),
  onAuthStateChange: vi.fn(),
  updateProfile: vi.fn(),
  updateUser: vi.fn(),
}))

vi.mock('../api/supabase/auth.api.js', () => ({ authApi: authApiMock }))

import { authStore } from './auth.store.js'

describe('authStore', () => {
  beforeEach(async () => {
    vi.clearAllMocks()
    authApiMock.signOut.mockResolvedValue({ error: null })
    await authStore.logout()
    vi.clearAllMocks()
  })

  it('нормализует email и локализует ошибку входа', async () => {
    authApiMock.signIn.mockResolvedValue({
      data: null,
      error: { code: 'invalid_credentials', message: 'Invalid login credentials' },
    })

    const result = await authStore.login('  ANYA@EXAMPLE.COM ', 'wrong')

    expect(authApiMock.signIn).toHaveBeenCalledWith('anya@example.com', 'wrong')
    expect(result).toEqual({ ok: false, message: 'Неверный email или пароль' })
    expect(authStore.loading.value).toBe(false)
  })

  it('не отправляет некорректную регистрацию на сервер', async () => {
    await expect(authStore.register({ name: ' ', email: 'a@example.com', password: '123456' }))
      .resolves.toEqual({ ok: false, message: 'Укажи имя аккаунта' })
    await expect(authStore.register({ name: 'Аня', email: 'bad', password: '123456' }))
      .resolves.toEqual({ ok: false, message: 'Укажи корректный email' })
    await expect(authStore.register({ name: 'Аня', email: 'a@example.com', password: '123' }))
      .resolves.toEqual({ ok: false, message: 'Пароль должен быть не короче 6 символов' })
    expect(authApiMock.signUp).not.toHaveBeenCalled()
  })

  it('создаёт сессию и профиль после успешного входа', async () => {
    const authUser = { id: 'u1', email: 'anya@example.com', user_metadata: {}, created_at: 'today' }
    authApiMock.signIn.mockResolvedValue({ data: { session: { user: authUser } }, error: null })
    authApiMock.getProfile.mockResolvedValue({ data: null, error: null })

    const result = await authStore.login('anya@example.com', 'secret')

    expect(result.ok).toBe(true)
    expect(result.user).toMatchObject({ id: 'u1', email: 'anya@example.com', name: 'anya', isActive: true })
    expect(authStore.isAuthenticated.value).toBe(true)
  })

  it('не повторяет запрос профиля при быстрых переходах между страницами', async () => {
    const authUser = { id: 'u1', email: 'anya@example.com', user_metadata: {} }
    authApiMock.signIn.mockResolvedValue({ data: { session: { user: authUser } }, error: null })
    authApiMock.getProfile.mockResolvedValue({ data: null, error: null })
    await authStore.login('anya@example.com', 'secret')

    await authStore.refreshCurrentUser()
    await authStore.refreshCurrentUser()

    expect(authApiMock.getProfile).toHaveBeenCalledTimes(1)
  })

  it('немедленно завершает сессию деактивированного пользователя', async () => {
    const authUser = { id: 'u1', email: 'blocked@example.com', user_metadata: {} }
    authApiMock.signIn.mockResolvedValue({ data: { session: { user: authUser } }, error: null })
    authApiMock.getProfile.mockResolvedValue({
      data: { id: 'u1', email: 'blocked@example.com', name: 'Блок', is_active: false },
      error: null,
    })

    const result = await authStore.login('blocked@example.com', 'secret')

    expect(result).toMatchObject({ ok: false, blocked: true })
    expect(authApiMock.signOut).toHaveBeenCalled()
    expect(authStore.currentUser.value).toBeNull()
    expect(authStore.blockedAccount.value).toEqual({ email: 'blocked@example.com', name: 'Блок' })
  })

  it('возвращает понятную русскую ошибку при обрыве соединения', async () => {
    authApiMock.signIn.mockRejectedValue(new Error('Network failed'))
    await expect(authStore.login('a@example.com', 'secret')).resolves.toEqual({
      ok: false,
      message: 'Нет соединения с Supabase. Проверь интернет и настройки проекта.',
    })
  })

  it('сообщает о необходимости подтвердить email после регистрации', async () => {
    authApiMock.signUp.mockResolvedValue({ data: { session: null }, error: null })
    await expect(authStore.register({ name: ' Аня ', email: ' A@EXAMPLE.COM ', password: '123456' }))
      .resolves.toEqual({ ok: true, needsEmailConfirmation: true })
    expect(authApiMock.signUp).toHaveBeenCalledWith({
      name: 'Аня',
      email: 'a@example.com',
      password: '123456',
    })
  })
})
