import { requireAuthenticatedSupabase } from './client.js'

function normalizeRelease(release) {
  return {
    id: release.id,
    version: release.version,
    date: release.release_date_label,
    title: release.title,
    icon: release.icon || 'sparkles',
    summary: release.summary,
    cards: Array.isArray(release.cards) ? release.cards : [],
    details: Array.isArray(release.details) ? release.details : [],
  }
}

export const releaseNotesApi = {
  async list() {
    const client = await requireAuthenticatedSupabase()
    const { data, error } = await client
      .from('app_releases')
      .select('id, version, release_date_label, title, icon, summary, cards, details, sort_order')
      .eq('is_published', true)
      .order('sort_order', { ascending: false })
      .order('created_at', { ascending: false })

    if (error) return { data: [], error }

    return {
      data: data.map(normalizeRelease),
      error: null,
    }
  },
}
