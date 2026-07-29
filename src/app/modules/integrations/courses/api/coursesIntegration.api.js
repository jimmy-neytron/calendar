import { requireAuthenticatedSupabase } from '../../../../api/supabase/client.js'

const CACHE_TTL = 24 * 60 * 60 * 1000
const STORAGE_PREFIX = 'calendar:courses-api-cache:v1'
const catalogCache = new Map()
const manifestCache = new Map()

function storageKey(namespace, key) {
  return `${STORAGE_PREFIX}:${namespace}:${key}`
}

function readCache(cache, namespace, key) {
  let entry = cache.get(key)
  if (!entry) {
    try {
      entry = JSON.parse(localStorage.getItem(storageKey(namespace, key)) || 'null')
      if (entry) cache.set(key, entry)
    } catch {
      entry = null
    }
  }
  if (!entry || entry.expiresAt <= Date.now()) {
    cache.delete(key)
    try {
      localStorage.removeItem(storageKey(namespace, key))
    } catch {
      // Persistent cache is an optimization; memory cache remains available.
    }
    return null
  }
  return entry.value
}

function writeCache(cache, namespace, key, value) {
  const entry = { value, expiresAt: Date.now() + CACHE_TTL }
  cache.set(key, entry)
  try {
    localStorage.setItem(storageKey(namespace, key), JSON.stringify(entry))
  } catch {
    // Ignore storage quota/privacy mode errors.
  }
  return value
}

function clearWorkspaceCache(workspaceId) {
  catalogCache.delete(workspaceId)
  for (const key of manifestCache.keys()) {
    if (key.startsWith(`${workspaceId}:`)) manifestCache.delete(key)
  }
  try {
    for (let index = localStorage.length - 1; index >= 0; index -= 1) {
      const key = localStorage.key(index)
      if (
        key === storageKey('catalog', workspaceId)
        || key?.startsWith(storageKey('manifest', `${workspaceId}:`))
      ) localStorage.removeItem(key)
    }
  } catch {
    // Nothing to clear when persistent storage is unavailable.
  }
}

async function invoke(action, payload = {}) {
  const client = await requireAuthenticatedSupabase()
  const { data, error } = await client.functions.invoke('courses-integration', {
    body: { action, ...payload },
  })
  if (error) {
    const details = await error.context?.clone?.().json?.().catch?.(() => null)
    throw new Error(details?.error || error.message)
  }
  if (data?.error) throw new Error(data.error)
  return data
}

function unwrapCourses(payload) {
  const value = payload?.courses
  if (Array.isArray(value)) return value
  if (Array.isArray(value?.courses)) return value.courses
  if (Array.isArray(value?.data)) return value.data
  return []
}

function unwrapManifest(payload) {
  return payload?.manifest?.manifest || payload?.manifest?.data || payload?.manifest || null
}

export const coursesIntegrationApi = {
  async getStatus(workspaceId) {
    return invoke('status', { workspaceId })
  },

  async connect(workspaceId, token) {
    const result = await invoke('connect', { workspaceId, token })
    const courses = unwrapCourses(result)
    writeCache(catalogCache, 'catalog', workspaceId, courses)
    return { ...result, courses }
  },

  async disconnect(workspaceId) {
    const result = await invoke('disconnect', { workspaceId })
    clearWorkspaceCache(workspaceId)
    return result
  },

  async listCourses(workspaceId, { force = false } = {}) {
    if (!force) {
      const cached = readCache(catalogCache, 'catalog', workspaceId)
      if (cached) return cached
    }
    const courses = unwrapCourses(await invoke('list-courses', { workspaceId }))
    return writeCache(catalogCache, 'catalog', workspaceId, courses)
  },

  async getManifest(workspaceId, courseId, releaseId, { force = false } = {}) {
    const key = `${workspaceId}:${courseId}:${releaseId}`
    if (!force) {
      const cached = readCache(manifestCache, 'manifest', key)
      if (cached) return cached
    }
    const manifest = unwrapManifest(await invoke('manifest', { workspaceId, courseId, releaseId }))
    return writeCache(manifestCache, 'manifest', key, manifest)
  },

  async listPlans(workspaceId) {
    const client = await requireAuthenticatedSupabase()
    return client
      .from('course_study_plans')
      .select('*, course_study_sessions(count)')
      .eq('workspace_id', workspaceId)
      .order('created_at', { ascending: false })
  },

  async createPlan(payload) {
    const client = await requireAuthenticatedSupabase()
    const { data, error } = await client.rpc('create_course_study_plan', {
      p_workspace_id: payload.workspaceId,
      p_integration_id: payload.integrationId,
      p_course: payload.course,
      p_schedule: payload.schedule,
      p_sessions: payload.sessions,
      p_idempotency_key: payload.idempotencyKey,
    })
    if (error) throw error
    return data
  },

  async deletePlan(planId) {
    const client = await requireAuthenticatedSupabase()
    const { data, error } = await client.rpc('delete_course_study_plan', {
      p_plan_id: planId,
    })
    if (error) throw error
    return data
  },

  async clearPlans(workspaceId, integrationId) {
    const client = await requireAuthenticatedSupabase()
    const { data, error } = await client.rpc('clear_course_integration_plans', {
      p_workspace_id: workspaceId,
      p_integration_id: integrationId,
    })
    if (error) throw error
    return data
  },

  async getSession(sessionId) {
    const client = await requireAuthenticatedSupabase()
    const { data, error } = await client
      .from('course_study_sessions')
      .select('id,lesson_title,lesson_url,plan_id')
      .eq('id', sessionId)
      .maybeSingle()
    if (error) throw error
    return data
  },
}
