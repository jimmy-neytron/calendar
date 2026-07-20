import { QueryClient } from '@tanstack/vue-query'

/**
 * Единый клиент серверного состояния приложения.
 *
 * Серверные данные считаются свежими 30 секунд. Повтор запроса выполняется
 * только один раз, чтобы временный сетевой сбой не превращался в долгую
 * блокировку интерфейса. Ошибки мутаций никогда не повторяются автоматически:
 * повторная запись может создать нежелательный дубликат на сервере.
 */
export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 30_000,
      gcTime: 15 * 60_000,
      retry: 1,
      refetchOnWindowFocus: true,
    },
    mutations: {
      retry: false,
    },
  },
})

/**
 * Публикует QueryClient для браузерного расширения TanStack Query DevTools.
 * Глобальная ссылка доступна только при локальной разработке и не влияет
 * на production-поведение приложения.
 */
if (import.meta.env.DEV && typeof window !== 'undefined') {
  window.__TANSTACK_QUERY_CLIENT__ = queryClient
}

/**
 * Преобразует стандартный ответ Supabase в данные либо выбрасывает ошибку.
 * Благодаря этому TanStack Query корректно переводит запрос в состояние error.
 */
export function unwrapSupabaseResult(result, fallback = null) {
  if (result?.error) throw result.error
  return result?.data ?? fallback
}
