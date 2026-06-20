import { requireSupabase } from './client.js'

export const authApi = {
  getSession() {
    return requireSupabase().auth.getSession()
  },

  onAuthStateChange(callback) {
    return requireSupabase().auth.onAuthStateChange(callback)
  },

  signIn(email, password) {
    return requireSupabase().auth.signInWithPassword({ email, password })
  },

  signUp({ name, email, password, color }) {
    return requireSupabase().auth.signUp({
      email,
      password,
      options: { data: { name, color } },
    })
  },

  signOut() {
    return requireSupabase().auth.signOut()
  },

  updateUser(data) {
    return requireSupabase().auth.updateUser({ data })
  },

  async getProfile(userId) {
    return requireSupabase().from('profiles').select('*').eq('id', userId).single()
  },

  updateProfile(userId, updates) {
    return requireSupabase().from('profiles').update(updates).eq('id', userId).select().single()
  },
}
