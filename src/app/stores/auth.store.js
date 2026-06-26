import { computed, ref } from 'vue'
import { authApi } from '../api/supabase/auth.api.js'
import {
  getSubscriptionPlan,
  normalizeSubscriptionTier,
} from '../utils/constants/subscriptionConstants.js'

const users = ref([])
const currentUserId = ref(null)
const initialized = ref(false)
const loading = ref(false)
let initializePromise = null

const currentUser = computed(() => users.value.find((user) => user.id === currentUserId.value) || null)
const isAuthenticated = computed(() => Boolean(currentUserId.value))

function mapUser(profile, authUser) {
  const email = profile?.email || authUser?.email || ''
  const name = profile?.name || authUser?.user_metadata?.name || email.split('@')[0] || 'РџРѕР»СЊР·РѕРІР°С‚РµР»СЊ'
  const subscriptionTier = normalizeSubscriptionTier(profile?.subscription_tier || 'free')
  return {
    id: profile?.id || authUser.id,
    email,
    name,
    avatar: profile?.avatar || name.slice(0, 1).toUpperCase(),
    color: profile?.color || authUser?.user_metadata?.color || '#60a5fa',
    subscriptionTier,
    workspaceLimit: Number(profile?.workspace_limit || getSubscriptionPlan(subscriptionTier).workspaceLimit),
    createdAt: profile?.created_at || authUser?.created_at,
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
  try {
    const { data, error } = await authApi.signIn(String(email).trim().toLowerCase(), password)
    if (error) return { ok: false, message: getAuthErrorMessage(error) }
    await applySession(data.session)
    return { ok: true, user: currentUser.value }
  } catch {
    return { ok: false, message: 'РќРµС‚ СЃРѕРµРґРёРЅРµРЅРёСЏ СЃ Supabase. РџСЂРѕРІРµСЂСЊ РёРЅС‚РµСЂРЅРµС‚ Рё РЅР°СЃС‚СЂРѕР№РєРё РїСЂРѕРµРєС‚Р°.' }
  } finally {
    loading.value = false
  }
}

async function register(data) {
  const name = String(data.name || '').trim()
  const email = String(data.email || '').trim().toLowerCase()
  if (!name) return { ok: false, message: 'РЈРєР°Р¶Рё РёРјСЏ Р°РєРєР°СѓРЅС‚Р°' }
  if (!email.includes('@')) return { ok: false, message: 'РЈРєР°Р¶Рё РєРѕСЂСЂРµРєС‚РЅС‹Р№ email' }
  if (String(data.password || '').length < 6) return { ok: false, message: 'РџР°СЂРѕР»СЊ РґРѕР»Р¶РµРЅ Р±С‹С‚СЊ РЅРµ РєРѕСЂРѕС‡Рµ 6 СЃРёРјРІРѕР»РѕРІ' }
  loading.value = true
  try {
    const { data: result, error } = await authApi.signUp({ ...data, name, email })
    if (error) return { ok: false, message: getAuthErrorMessage(error) }
    if (result.session) await applySession(result.session)
    return { ok: true, needsEmailConfirmation: !result.session }
  } catch {
    return { ok: false, message: 'РќРµС‚ СЃРѕРµРґРёРЅРµРЅРёСЏ СЃ Supabase. РџСЂРѕРІРµСЂСЊ РёРЅС‚РµСЂРЅРµС‚ Рё РЅР°СЃС‚СЂРѕР№РєРё РїСЂРѕРµРєС‚Р°.' }
  } finally {
    loading.value = false
  }
}

async function logout() {
  await authApi.signOut()
  await applySession(null)
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

function getAuthErrorMessage(error) {
  const messages = {
    invalid_credentials: 'РќРµРІРµСЂРЅС‹Р№ email РёР»Рё РїР°СЂРѕР»СЊ',
    email_not_confirmed: 'РЎРЅР°С‡Р°Р»Р° РїРѕРґС‚РІРµСЂРґРё email РїРѕ СЃСЃС‹Р»РєРµ РёР· РїРёСЃСЊРјР°',
    user_already_exists: 'РђРєРєР°СѓРЅС‚ СЃ С‚Р°РєРёРј email СѓР¶Рµ СЃСѓС‰РµСЃС‚РІСѓРµС‚',
    signup_disabled: 'Р РµРіРёСЃС‚СЂР°С†РёСЏ РѕС‚РєР»СЋС‡РµРЅР° РІ РЅР°СЃС‚СЂРѕР№РєР°С… Supabase',
    over_email_send_rate_limit: 'РЎР»РёС€РєРѕРј РјРЅРѕРіРѕ РїРёСЃРµРј. РџРѕРїСЂРѕР±СѓР№ РЅРµРјРЅРѕРіРѕ РїРѕР·Р¶Рµ',
  }
  return messages[error.code] || error.message || 'РћС€РёР±РєР° Р°РІС‚РѕСЂРёР·Р°С†РёРё'
}

export const authStore = {
  users, currentUserId, currentUser, isAuthenticated, initialized, loading,
  initialize, login, register, logout, updateCurrentUser, getUser, getUserByEmail, mergeUsers,
}
