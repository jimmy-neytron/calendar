import { computed, ref } from 'vue'
import { authApi } from '../api/supabase/auth.api.js'
import {
  getSubscriptionPlan,
  normalizeSubscriptionTier,
} from '../utils/constants/subscriptionConstants.js'
import {
  AUTH_CONNECTION_ERROR_MESSAGE,
  getAuthErrorMessage,
} from '../utils/errors/authErrorMessage.js'

const users = ref([])
const currentUserId = ref(null)
const initialized = ref(false)
const loading = ref(false)
const blockedAccount = ref(null)
let initializePromise = null

const currentUser = computed(() => users.value.find((user) => user.id === currentUserId.value) || null)
const isAuthenticated = computed(() => Boolean(currentUserId.value))
const isAdmin = computed(() => currentUser.value?.role === 'admin' && currentUser.value?.isActive !== false)

function mapUser(profile, authUser) {
  const email = profile?.email || authUser?.email || ''
  const name = profile?.name || authUser?.user_metadata?.name || email.split('@')[0] || 'Пользователь'
  const subscriptionTier = normalizeSubscriptionTier(profile?.subscription_tier)
  return {
    id: profile?.id || authUser.id,
    email,
    name,
    avatar: profile?.avatar || name.slice(0, 1).toUpperCase(),
    color: profile?.color || authUser?.user_metadata?.color || '#60a5fa',
    subscriptionTier,
    workspaceLimit: Number(profile?.workspace_limit || getSubscriptionPlan(subscriptionTier).workspaceLimit),
    role: profile?.role || 'user',
    isActive: profile?.is_active !== false,
    createdAt: profile?.created_at || authUser?.created_at,
    updatedAt: profile?.updated_at || '',
  }
}

async function applySession(session) {
  if (!session?.user) {
    users.value = []
    currentUserId.value = null
    return
  }
  const { data } = await authApi.getProfile(session.user.id)
  const user = mapUser(data, session.user)
  if (!user.isActive) {
    blockedAccount.value = { email: user.email, name: user.name }
    await authApi.signOut()
    users.value = []
    currentUserId.value = null
    return
  }
  users.value = [user]
  currentUserId.value = user.id
}

function initialize() {
  if (initializePromise) return initializePromise
  initializePromise = (async () => {
    loading.value = true
    try {
      const { data, error } = await authApi.getSession()
      if (error) throw error
      await applySession(data.session)
      authApi.onAuthStateChange((_event, session) => queueMicrotask(() => applySession(session)))
    } catch (error) {
      console.error('Supabase auth initialization failed:', error)
    } finally {
      loading.value = false
      initialized.value = true
    }
  })()
  return initializePromise
}

async function login(email, password) {
  loading.value = true
  blockedAccount.value = null
  try {
    const { data, error } = await authApi.signIn(String(email).trim().toLowerCase(), password)
    if (error) return { ok: false, message: getAuthErrorMessage(error) }
    await applySession(data.session)
    if (!currentUser.value) return { ok: false, blocked: true, message: 'Аккаунт деактивирован администратором' }
    return { ok: true, user: currentUser.value }
  } catch {
    return { ok: false, message: AUTH_CONNECTION_ERROR_MESSAGE }
  } finally {
    loading.value = false
  }
}

async function register(data) {
  const name = String(data.name || '').trim()
  const email = String(data.email || '').trim().toLowerCase()
  if (!name) return { ok: false, message: 'Укажи имя аккаунта' }
  if (!email.includes('@')) return { ok: false, message: 'Укажи корректный email' }
  if (String(data.password || '').length < 6) return { ok: false, message: 'Пароль должен быть не короче 6 символов' }
  loading.value = true
  try {
    const { data: result, error } = await authApi.signUp({ ...data, name, email })
    if (error) return { ok: false, message: getAuthErrorMessage(error) }
    if (result.session) await applySession(result.session)
    return { ok: true, needsEmailConfirmation: !result.session }
  } catch {
    return { ok: false, message: AUTH_CONNECTION_ERROR_MESSAGE }
  } finally {
    loading.value = false
  }
}

async function logout() {
  await authApi.signOut()
  await applySession(null)
}

async function refreshCurrentUser() {
  if (!currentUserId.value) return { ok: false }
  const previousUser = currentUser.value
  const { data, error } = await authApi.getProfile(currentUserId.value)
  if (error) return { ok: false, message: error.message }

  const user = mapUser(data, previousUser)
  if (!user.isActive) {
    blockedAccount.value = { email: user.email, name: user.name }
    await authApi.signOut()
    users.value = []
    currentUserId.value = null
    return { ok: false, blocked: true }
  }

  users.value = [user]
  return { ok: true, user }
}

function dismissBlockedAccount() {
  blockedAccount.value = null
}

async function updateCurrentUser(updates) {
  if (!currentUser.value) return { ok: false }
  const payload = {
    name: String(updates.name || currentUser.value.name).trim(),
    avatar: updates.avatar || currentUser.value.avatar,
    color: updates.color || currentUser.value.color,
    ...(updates.subscriptionTier !== undefined
      ? { subscription_tier: normalizeSubscriptionTier(updates.subscriptionTier) }
      : {}),
  }
  const { data, error } = await authApi.updateProfile(currentUser.value.id, payload)
  if (error) return { ok: false, message: error.message }
  users.value = [mapUser(data, null)]
  await authApi.updateUser({ name: data.name, color: data.color })
  return { ok: true }
}

const getUser = (id) => users.value.find((user) => user.id === id)
const getUserByEmail = (email) => users.value.find((user) => user.email === String(email || '').trim().toLowerCase())
function mergeUsers(items) {
  const map = new Map(users.value.map((user) => [user.id, user]))
  items.filter(Boolean).forEach((user) => map.set(user.id, { ...map.get(user.id), ...user }))
  users.value = [...map.values()]
}

export const authStore = {
  users, currentUserId, currentUser, isAuthenticated, isAdmin, initialized, loading, blockedAccount,
  initialize, login, register, logout, refreshCurrentUser, updateCurrentUser, dismissBlockedAccount, getUser, getUserByEmail, mergeUsers,
}
