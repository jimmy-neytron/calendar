import { requireAuthenticatedSupabase } from '../../../api/supabase/client.js'
import { authStore } from '../../../stores/auth.store.js'

const BUCKET = 'wardrobe-images'
const MAX_FILE_SIZE = 5 * 1024 * 1024
const ALLOWED_TYPES = new Set(['image/jpeg', 'image/png', 'image/webp'])

export async function uploadWardrobeImage(file: File, workspaceId: string) {
  if (!ALLOWED_TYPES.has(file.type)) return { ok: false as const, message: 'Поддерживаются JPG, PNG и WebP' }
  if (file.size > MAX_FILE_SIZE) return { ok: false as const, message: 'Фотография должна быть меньше 5 МБ' }

  const ownerId = authStore.currentUserId.value
  if (!ownerId || !workspaceId) return { ok: false as const, message: 'Пространство не выбрано' }
  const extension = file.type === 'image/png' ? 'png' : file.type === 'image/webp' ? 'webp' : 'jpg'
  const path = `${workspaceId}/${ownerId}/${crypto.randomUUID()}.${extension}`
  const client = await requireAuthenticatedSupabase()
  const { error } = await client.storage.from(BUCKET).upload(path, file, {
    cacheControl: '31536000',
    contentType: file.type,
    upsert: false,
  })
  return error ? { ok: false as const, message: error.message } : { ok: true as const, path }
}

export async function createWardrobeImageUrl(path: string) {
  if (!path) return ''
  const client = await requireAuthenticatedSupabase()
  const { data, error } = await client.storage.from(BUCKET).createSignedUrl(path, 60 * 60 * 24)
  return error ? '' : data.signedUrl
}

export async function removeWardrobeImage(path: string) {
  if (!path) return { ok: true }
  const client = await requireAuthenticatedSupabase()
  const { error } = await client.storage.from(BUCKET).remove([path])
  return error ? { ok: false, message: error.message } : { ok: true }
}

