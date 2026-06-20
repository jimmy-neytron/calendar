import { computed } from 'vue'
import { APP_CONFIG } from '../config/app.config.js'
import { useLocalStorage } from '../composables/storage/useLocalStorage.js'
import { generateId } from '../utils/helpers/idGenerator.js'

const USERS_KEY = `${APP_CONFIG.storageKey}:accounts`
const SESSION_KEY = `${APP_CONFIG.storageKey}:session`

const defaultUsers = [
  {
    id: 'u-anna',
    name: 'Аня',
    email: 'anya@example.com',
    avatar: 'А',
    color: '#ffffff',
    createdAt: new Date().toISOString(),
  },
  {
    id: 'u-ilya',
    name: 'Илья',
    email: 'ilya@example.com',
    avatar: 'И',
    color: '#a1a1a1',
    createdAt: new Date().toISOString(),
  },
  {
    id: 'u-miya',
    name: 'Мия',
    email: 'miya@example.com',
    avatar: 'М',
    color: '#f472b6',
    createdAt: new Date().toISOString(),
  },
]

const { state: users } = useLocalStorage(USERS_KEY, defaultUsers)
const { state: currentUserId } = useLocalStorage(SESSION_KEY, null)

const normalizedEmail = (email) => String(email || '').trim().toLowerCase()
const createAvatar = (name, email) => (String(name || email || '?').trim().slice(0, 1) || '?').toUpperCase()

const currentUser = computed(() => users.value.find((user) => user.id === currentUserId.value) || null)
const isAuthenticated = computed(() => Boolean(currentUser.value))

function login(email) {
  const targetEmail = normalizedEmail(email)
  const user = users.value.find((item) => item.email === targetEmail)
  if (!user) return { ok: false, message: 'Аккаунт не найден. Создай новый профиль.' }
  currentUserId.value = user.id
  return { ok: true, user }
}

function register(data) {
  const name = String(data.name || '').trim()
  const email = normalizedEmail(data.email)

  if (!name) return { ok: false, message: 'Укажи имя аккаунта' }
  if (!email || !email.includes('@')) return { ok: false, message: 'Укажи корректный email' }

  const existingUser = users.value.find((user) => user.email === email)
  if (existingUser) {
    currentUserId.value = existingUser.id
    return { ok: true, user: existingUser, existing: true }
  }

  const user = {
    id: generateId(),
    name,
    email,
    avatar: createAvatar(name, email),
    color: data.color || '#ffffff',
    createdAt: new Date().toISOString(),
  }

  users.value = [...users.value, user]
  currentUserId.value = user.id
  return { ok: true, user }
}


function createUser(data) {
  const name = String(data.name || '').trim()
  const email = normalizedEmail(data.email)
  if (!name) return { ok: false, message: 'Укажи имя аккаунта' }
  if (!email || !email.includes('@')) return { ok: false, message: 'Укажи корректный email' }

  const existingUser = users.value.find((user) => user.email === email)
  if (existingUser) return { ok: true, user: existingUser, existing: true }

  const user = {
    id: generateId(),
    name,
    email,
    avatar: createAvatar(name, email),
    color: data.color || '#ffffff',
    createdAt: new Date().toISOString(),
  }

  users.value = [...users.value, user]
  return { ok: true, user }
}

function logout() {
  currentUserId.value = null
}

function updateCurrentUser(updates) {
  if (!currentUser.value) return
  users.value = users.value.map((user) => {
    if (user.id !== currentUser.value.id) return user
    const name = updates.name?.trim?.() || user.name
    return {
      ...user,
      ...updates,
      name,
      avatar: updates.avatar || createAvatar(name, user.email),
    }
  })
}

function getUser(userId) {
  return users.value.find((user) => user.id === userId)
}

function getUserByEmail(email) {
  return users.value.find((user) => user.email === normalizedEmail(email))
}

export const authStore = {
  users,
  currentUserId,
  currentUser,
  isAuthenticated,
  login,
  register,
  createUser,
  logout,
  updateCurrentUser,
  getUser,
  getUserByEmail,
}
