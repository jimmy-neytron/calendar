import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

const json = (body: unknown, status = 200) => new Response(JSON.stringify(body), {
  status,
  headers: { ...corsHeaders, 'Content-Type': 'application/json' },
})

const encode = (bytes: Uint8Array) => btoa(String.fromCharCode(...bytes))
const decode = (value: string) => Uint8Array.from(atob(value), (char) => char.charCodeAt(0))

async function encryptionKey() {
  const secret = Deno.env.get('COURSES_TOKEN_ENCRYPTION_KEY') || ''
  if (secret.length < 32) throw new Error('COURSES_TOKEN_ENCRYPTION_KEY must contain at least 32 characters')
  const digest = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(secret))
  return crypto.subtle.importKey('raw', digest, 'AES-GCM', false, ['encrypt', 'decrypt'])
}

async function encryptToken(token: string) {
  const iv = crypto.getRandomValues(new Uint8Array(12))
  const ciphertext = await crypto.subtle.encrypt(
    { name: 'AES-GCM', iv },
    await encryptionKey(),
    new TextEncoder().encode(token),
  )
  return { token_ciphertext: encode(new Uint8Array(ciphertext)), token_iv: encode(iv) }
}

async function decryptToken(ciphertext: string, iv: string) {
  const plain = await crypto.subtle.decrypt(
    { name: 'AES-GCM', iv: decode(iv) },
    await encryptionKey(),
    decode(ciphertext),
  )
  return new TextDecoder().decode(plain)
}

async function callCourses(path: string, token: string) {
  const baseUrl = (Deno.env.get('COURSES_API_BASE_URL') || '').replace(/\/+$/, '')
  if (!baseUrl) throw new Error('COURSES_API_BASE_URL is not configured')
  const response = await fetch(`${baseUrl}${path}`, {
    headers: { Authorization: `Bearer ${token}`, Accept: 'application/json' },
  })
  const payload = await response.json().catch(() => ({}))
  if (!response.ok) {
    const error = new Error(payload?.error || payload?.message || 'Courses API request failed')
    ;(error as Error & { status?: number }).status = response.status
    throw error
  }
  return payload
}

Deno.serve(async (request) => {
  if (request.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders })
  if (request.method !== 'POST') return json({ error: 'Method not allowed' }, 405)

  try {
    const authorization = request.headers.get('Authorization') || ''
    const jwt = authorization.replace(/^Bearer\s+/i, '')
    if (!jwt) return json({ error: 'Unauthorized' }, 401)

    const supabaseUrl = Deno.env.get('SUPABASE_URL')!
    const serviceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    const service = createClient(supabaseUrl, serviceKey, { auth: { persistSession: false } })
    const { data: authData, error: authError } = await service.auth.getUser(jwt)
    if (authError || !authData.user) return json({ error: 'Unauthorized' }, 401)

    const body = await request.json().catch(() => ({}))
    const action = String(body.action || '')
    const workspaceId = String(body.workspaceId || '')
    if (!workspaceId) return json({ error: 'workspaceId is required' }, 400)

    const { data: membership } = await service
      .from('workspace_members')
      .select('role')
      .eq('workspace_id', workspaceId)
      .eq('user_id', authData.user.id)
      .maybeSingle()
    if (!membership) return json({ error: 'Workspace access denied' }, 403)

    const getIntegration = async () => {
      const { data } = await service
        .from('course_integrations')
        .select('id,status,last_checked_at,last_error,course_integration_credentials(token_ciphertext,token_iv)')
        .eq('workspace_id', workspaceId)
        .eq('user_id', authData.user!.id)
        .maybeSingle()
      return data
    }

    if (action === 'status') {
      const integration = await getIntegration()
      return json({
        integration: integration ? {
          id: integration.id,
          connected: integration.status === 'active' && Boolean(integration.course_integration_credentials),
          status: integration.status,
          lastCheckedAt: integration.last_checked_at,
          lastError: integration.last_error,
        } : null,
      })
    }

    if (action === 'connect') {
      const token = String(body.token || '').trim()
      if (token.length < 16) return json({ error: 'Укажите корректный токен Courses' }, 400)
      const courses = await callCourses('/integration/v1/courses', token)
      const encrypted = await encryptToken(token)
      const { data: integration, error } = await service
        .from('course_integrations')
        .upsert({
          user_id: authData.user.id,
          workspace_id: workspaceId,
          status: 'active',
          last_checked_at: new Date().toISOString(),
          last_error: '',
          updated_at: new Date().toISOString(),
        }, { onConflict: 'user_id,workspace_id' })
        .select('id')
        .single()
      if (error) throw error
      const { error: credentialError } = await service
        .from('course_integration_credentials')
        .upsert({ integration_id: integration.id, ...encrypted, updated_at: new Date().toISOString() })
      if (credentialError) throw credentialError
      return json({ integration: { id: integration.id, connected: true, status: 'active' }, courses })
    }

    const integration = await getIntegration()
    const credential = Array.isArray(integration?.course_integration_credentials)
      ? integration.course_integration_credentials[0]
      : integration?.course_integration_credentials
    if (!integration || integration.status !== 'active' || !credential) {
      return json({ error: 'Интеграция Courses не подключена' }, 409)
    }

    if (action === 'disconnect') {
      await service.from('course_integration_credentials').delete().eq('integration_id', integration.id)
      await service.from('course_integrations').update({
        status: 'disconnected',
        updated_at: new Date().toISOString(),
      }).eq('id', integration.id)
      return json({ integration: { id: integration.id, connected: false, status: 'disconnected' } })
    }

    const token = await decryptToken(credential.token_ciphertext, credential.token_iv)
    if (action === 'list-courses') {
      return json({ courses: await callCourses('/integration/v1/courses', token) })
    }
    if (action === 'manifest') {
      const courseId = encodeURIComponent(String(body.courseId || ''))
      const releaseId = encodeURIComponent(String(body.releaseId || ''))
      if (!courseId || !releaseId) return json({ error: 'courseId and releaseId are required' }, 400)
      return json({
        manifest: await callCourses(`/integration/v1/courses/${courseId}/manifest?releaseId=${releaseId}`, token),
      })
    }

    return json({ error: 'Unknown action' }, 400)
  } catch (error) {
    const status = Number((error as Error & { status?: number }).status || 500)
    return json({ error: error instanceof Error ? error.message : 'Unexpected error' }, status)
  }
})
