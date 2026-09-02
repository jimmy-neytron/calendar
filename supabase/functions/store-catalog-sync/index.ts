import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'
import { parseCatalogContext } from './catalogParser.ts'
import { fetchMagnitCatalog } from './magnitCatalogClient.ts'
import { extractPackage } from '../_shared/storePackage.ts'
import { guardSyncClaim, selectSyncSource } from './syncSourceSelection.ts'

type Source = { id: string; workspace_id: string; store: string; store_code: string; url: string; updated_at: string }

const supabaseUrl = Deno.env.get('SUPABASE_URL') || ''
const serviceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') || ''
const cronSecret = Deno.env.get('MAGNIT_CRON_SECRET') || ''
const admin = createClient(supabaseUrl, serviceRoleKey)
const corsHeaders = {
  'access-control-allow-origin': '*',
  'access-control-allow-headers': 'authorization, x-client-info, apikey, content-type, x-cron-secret',
  'access-control-allow-methods': 'POST, OPTIONS',
}

Deno.serve(async (request) => {
  if (request.method === 'OPTIONS') return new Response(null, { status: 204, headers: corsHeaders })
  if (request.method !== 'POST') return json({ ok: false, error: 'Method not allowed' }, 405)
  if (!supabaseUrl || !serviceRoleKey) return json({ ok: false, error: 'Missing Supabase secrets' }, 500)
  const payload = await request.json().catch(() => ({})) as { sourceId?: unknown } | null
  const sourceId = typeof payload?.sourceId === 'string' ? payload.sourceId.trim() : undefined
  if (payload?.sourceId != null && !sourceId) return json({ ok: false, error: 'Некорректный источник' }, 400)
  const isCron = Boolean(cronSecret && request.headers.get('x-cron-secret') === cronSecret)
  if (!isCron && !(await isAdminRequest(request))) return json({ ok: false, error: 'Forbidden' }, 403)

  const { query, isManual } = selectSyncSource(
    admin.from('store_catalog_sources').select('id,workspace_id,store,store_code,url,updated_at'),
    sourceId, isCron, new Date().toISOString(),
  )
  const { data, error } = await query.maybeSingle()
  if (error) return json({ ok: false, error: error.message }, 500)
  const source = data as Source | null
  if (!source) return isManual
    ? json({ ok: false, error: 'Источник не найден' }, 404)
    : json({ ok: true, skipped: true, reason: 'No source is due' })

  const { data: claimed, error: claimError } = await guardSyncClaim(
    admin.from('store_catalog_sources').update({ status: 'syncing', last_error: '', updated_at: new Date().toISOString() }), source,
  ).select('id').maybeSingle()
  if (claimError) return json({ ok: false, error: claimError.message }, 500)
  if (!claimed) return json({ ok: false, error: 'Источник изменился или уже обновляется. Обновите список и повторите запуск.' }, 409)
  try {
    const context = parseCatalogContext(source)
    const { data: sources, error: sourcesError } = await admin.from('store_catalog_sources')
      .select('url,store_code').eq('workspace_id', source.workspace_id).eq('store', source.store).eq('enabled', true)
    if (sourcesError) throw sourcesError
    for (const candidate of sources || []) {
      const other = parseCatalogContext(candidate)
      if (other.storeCode !== context.storeCode || other.storeType !== context.storeType || other.catalogType !== context.catalogType) {
        throw new Error('У источников другого магазина или режима покупки включено автообновление. Выключите его перед сменой магазина.')
      }
    }
    const receivedAt = new Date().toISOString()
    const { products } = await fetchMagnitCatalog(source)
    const rows = products.map((product) => {
      const packaging = product.isWeighted ? { amount: product.shelfWeight, unit: product.shelfWeight ? 'g' : null } : extractPackage(product.name)
      return {
        product_code: product.code, name: product.name, normalized_name: normalizeName(product.name),
        image_url: product.imageUrl, product_url: product.productUrl,
        current_price: product.price, old_price: product.oldPrice,
        package_amount: packaging.amount, package_unit: packaging.unit,
        is_weighted: product.isWeighted, weight_step: product.weightStep,
        weight_minimum: product.weightMinimum, unit_price: product.unitPrice,
      }
    })
    // One transaction: prices, provenance, history and links cannot be saved partially.
    const { error: saveError } = await admin.rpc('save_store_catalog_snapshot', {
      p_source_id: source.id, p_store_code: context.storeCode, p_store_type: context.storeType,
      p_catalog_type: context.catalogType, p_received_at: receivedAt, p_products: rows,
      p_manual: isManual,
      p_weighted_pricing: true,
    })
    if (saveError) throw new Error(saveError.code === 'PGRST202'
      ? 'Обновите базу: выполните миграцию 20260902220000_store_catalog_weighted_prices.sql, затем повторите синхронизацию.'
      : saveError.message)
    return json({ ok: true, sourceId: source.id, products: products.length, storeCode: context.storeCode })

  } catch (reason) {
    const message = reason instanceof Error ? reason.message
      : reason && typeof reason === 'object' && 'message' in reason ? String(reason.message) : String(reason)
    await admin.from('store_catalog_sources').update({ status: 'error', last_error: message.slice(0, 1000), next_sync_at: new Date(Date.now() + 6 * 3600000).toISOString(), updated_at: new Date().toISOString() }).eq('id', source.id)
    return json({ ok: false, error: message }, 502)
  }
})

async function isAdminRequest(request: Request) {
  const token = request.headers.get('authorization')?.replace(/^Bearer\s+/i, '') || ''
  if (!token) return false
  const { data: { user } } = await admin.auth.getUser(token)
  if (!user) return false
  const { data } = await admin.from('profiles').select('role,is_active').eq('id', user.id).maybeSingle()
  return data?.role === 'admin' && data?.is_active !== false
}

function normalizeName(value: string) { return value.toLocaleLowerCase('ru-RU').replace(/ё/g, 'е').replace(/\s+/g, ' ').trim() }
function json(payload: Record<string, unknown>, status = 200) { return new Response(JSON.stringify(payload), { status, headers: { ...corsHeaders, 'content-type': 'application/json' } }) }
