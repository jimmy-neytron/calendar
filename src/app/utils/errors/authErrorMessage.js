const AUTH_ERROR_MESSAGES = Object.freeze({
  invalid_credentials: 'Неверный email или пароль',
  email_not_confirmed: 'Сначала подтверди email по ссылке из письма',
  user_already_exists: 'Аккаунт с таким email уже существует',
  email_exists: 'Аккаунт с таким email уже существует',
  signup_disabled: 'Регистрация отключена в настройках Supabase',
  email_provider_disabled: 'Вход по email отключён в настройках Supabase',
  email_address_invalid: 'Укажи корректный email',
  email_address_not_authorized: 'Этот email нельзя использовать для регистрации',
  weak_password: 'Пароль слишком простой. Используй более надёжный пароль',
  user_banned: 'Аккаунт заблокирован',
  over_email_send_rate_limit: 'Слишком много писем. Попробуй немного позже',
  over_request_rate_limit: 'Слишком много попыток. Попробуй немного позже',
  request_timeout: 'Сервер не ответил вовремя. Попробуй ещё раз',
  validation_failed: 'Проверь введённые данные',
  captcha_failed: 'Не удалось подтвердить проверку безопасности',
})

const AUTH_MESSAGE_PATTERNS = [
  [/invalid login credentials/i, AUTH_ERROR_MESSAGES.invalid_credentials],
  [/email not confirmed/i, AUTH_ERROR_MESSAGES.email_not_confirmed],
  [/user already registered|already exists/i, AUTH_ERROR_MESSAGES.user_already_exists],
  [/password should be at least|weak password/i, AUTH_ERROR_MESSAGES.weak_password],
  [/rate limit|too many requests/i, AUTH_ERROR_MESSAGES.over_request_rate_limit],
]

export const AUTH_CONNECTION_ERROR_MESSAGE = 'Нет соединения с Supabase. Проверь интернет и настройки проекта.'
export const AUTH_FALLBACK_ERROR_MESSAGE = 'Не удалось выполнить авторизацию. Попробуй ещё раз'

export function getAuthErrorMessage(error) {
  const code = String(error?.code || '')
  if (AUTH_ERROR_MESSAGES[code]) return AUTH_ERROR_MESSAGES[code]

  const rawMessage = String(error?.message || '')
  return AUTH_MESSAGE_PATTERNS.find(([pattern]) => pattern.test(rawMessage))?.[1]
    || AUTH_FALLBACK_ERROR_MESSAGE
}
