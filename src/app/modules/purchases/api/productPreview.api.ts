import { requireAuthenticatedSupabase } from '../../../api/supabase/client.js'
import type { ProductLinkPreview } from '../../../types/purchase'

interface PreviewResponse {
  preview?: Partial<ProductLinkPreview>
  error?: string
}

export async function loadProductPreview(url: string): Promise<ProductLinkPreview> {
  const client = await requireAuthenticatedSupabase()
  const { data, error } = await client.functions.invoke<PreviewResponse>('product-link-preview', {
    body: { url },
  })

  if (error) {
    const details = await error.context?.clone?.().json?.().catch?.(() => null) as PreviewResponse | null
    throw new Error(details?.error || error.message || 'Не удалось прочитать страницу товара')
  }
  if (data?.error) throw new Error(data.error)

  return {
    title: String(data?.preview?.title || ''),
    description: String(data?.preview?.description || ''),
    productUrl: String(data?.preview?.productUrl || url),
    imageUrl: String(data?.preview?.imageUrl || ''),
    source: String(data?.preview?.source || new URL(url).hostname.replace(/^www\./, '')),
    price: Math.max(0, Number(data?.preview?.price || 0)),
    currency: String(data?.preview?.currency || 'RUB').toUpperCase(),
  }
}
