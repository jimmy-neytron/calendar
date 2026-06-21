import { createClient } from '@supabase/supabase-js'

const url = import.meta.env.VITE_SUPABASE_URL
const publishableKey = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY

export const isSupabaseConfigured = Boolean(url && publishableKey)

export const supabase = isSupabaseConfigured
  ? createClient(url, publishableKey, {
      auth: {
        autoRefreshToken: true,
        persistSession: true,
        detectSessionInUrl: true,
      },
    })
  : null

export function requireSupabase() {
  if (!supabase) {
    throw new Error('Supabase не настроен. Заполни VITE_SUPABASE_URL и VITE_SUPABASE_PUBLISHABLE_KEY.')
  }
  return supabase
}

export async function requireAuthenticatedSupabase() {
  const client = requireSupabase()
  const { data, error } = await client.auth.getSession()
  if (error) throw error

  let session = data.session
  const expiresSoon = session?.expires_at && session.expires_at * 1000 < Date.now() + 60_000
  if (!session || expiresSoon) {
    const refreshed = await client.auth.refreshSession()
    if (refreshed.error) throw refreshed.error
    session = refreshed.data.session
  }

  if (!session?.access_token) {
    throw new Error('Сессия истекла. Войди в аккаунт ещё раз.')
  }

  return client
}
