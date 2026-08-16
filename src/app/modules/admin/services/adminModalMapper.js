export const ADMIN_MODAL_STYLES = Object.freeze({
  notice: { label: 'Уведомление', icon: 'mail' },
  warning: { label: 'Предупреждение', icon: 'warning' },
  danger: { label: 'Критично', icon: 'warning' },
  success: { label: 'Успех', icon: 'check' },
  maintenance: { label: 'Техработы', icon: 'settings' },
})

const ADMIN_ROLES = new Set(['admin', 'user'])
const SUBSCRIPTION_TIERS = new Set(['free', 'pro'])

export function normalizeAdminModalType(value) {
  return Object.hasOwn(ADMIN_MODAL_STYLES, value) ? value : 'notice'
}

export function normalizeAdminModalList(value) {
  const items = Array.isArray(value) ? value : String(value || '').split(/[\n,; ]+/)
  return [...new Set(items.map((item) => String(item || '').trim()).filter(Boolean))]
}

export function normalizeAdminModalAudience(value) {
  const source = value && typeof value === 'object' && !Array.isArray(value) ? value : {}
  const userIds = normalizeAdminModalList(source.userIds || source.user_ids)
  const emails = normalizeLowerCaseList(source.emails)
  const roles = normalizeLowerCaseList(source.roles).filter((role) => ADMIN_ROLES.has(role))
  const tiers = normalizeLowerCaseList(source.tiers).filter((tier) => SUBSCRIPTION_TIERS.has(tier))
  const hasCriteria = hasAdminModalAudienceCriteria({ userIds, emails, roles, tiers })
  return {
    mode: source.mode === 'targeted' || hasCriteria ? 'targeted' : 'all',
    userIds,
    emails,
    roles,
    tiers,
  }
}

export function buildAdminModalAudience({ mode, userIds, emails, roles, tiers }) {
  return normalizeAdminModalAudience({ mode, userIds, emails, roles, tiers })
}

export function hasAdminModalAudienceCriteria(value) {
  return Boolean(value?.userIds?.length || value?.emails?.length || value?.roles?.length || value?.tiers?.length)
}

export function normalizeAdminModalButtons(buttons, { filterInvalid = false } = {}) {
  const normalized = (Array.isArray(buttons) ? buttons : []).map((button, index) => ({
    key: button?.key || `${index}`,
    label: String(button?.label || '').slice(0, 80),
    action: button?.action === 'close' ? 'close' : 'link',
    url: button?.action === 'close' ? '' : normalizeAdminModalUrl(button?.url),
    variant: button?.variant === 'secondary' ? 'secondary' : 'primary',
  }))
  return filterInvalid
    ? normalized.filter((button) => button.label && (button.action === 'close' || button.url))
    : normalized
}

export function mapAdminModal(row, { sanitizeContent = false, filterButtons = false } = {}) {
  if (!isAdminModalRow(row)) return null
  const modalType = normalizeAdminModalType(row.modal_type)
  const contentHtml = row.content_html || ''
  return {
    id: row.id,
    title: row.title || (sanitizeContent ? 'Сообщение' : ''),
    contentHtml: sanitizeContent ? sanitizeAdminModalHtml(contentHtml) : contentHtml,
    buttons: normalizeAdminModalButtons(row.buttons, { filterInvalid: filterButtons }),
    isActive: row.is_active === true,
    displayMode: row.display_mode === 'once' ? 'once' : 'always',
    modalType,
    style: ADMIN_MODAL_STYLES[modalType],
    isBlocking: row.is_blocking === true,
    audience: normalizeAdminModalAudience(row.audience),
    createdAt: row.created_at || '',
    updatedAt: row.updated_at || '',
  }
}

export function mapAdminModalSummary(row) {
  return { id: row?.id || '', title: row?.title || '', isActive: row?.is_active !== false }
}

export function getAdminModalRow(data) {
  const row = Array.isArray(data) ? data[0] : data
  return isAdminModalRow(row) ? row : null
}

export function isAdminModalRow(row) {
  return Boolean(row && typeof row === 'object' && !Array.isArray(row) && row.id)
}

export function matchesAdminModalAudience(audience, user) {
  if (!audience || audience.mode === 'all') return true
  if (!user) return false

  const userId = String(user.id || '').trim()
  const email = String(user.email || '').trim().toLowerCase()
  const role = String(user.role || 'user').trim().toLowerCase()
  const tier = String(user.subscriptionTier || 'pro').trim().toLowerCase()
  if (audience.userIds.includes(userId) || audience.emails.includes(email)) return true

  const hasRoleFilter = audience.roles.length > 0
  const hasTierFilter = audience.tiers.length > 0
  if (!hasRoleFilter && !hasTierFilter) return false
  return (!hasRoleFilter || audience.roles.includes(role)) && (!hasTierFilter || audience.tiers.includes(tier))
}

export function sanitizeAdminModalHtml(value) {
  const template = document.createElement('template')
  template.innerHTML = value || ''
  template.content.querySelectorAll('script,style,iframe,object,embed').forEach((node) => node.remove())
  template.content.querySelectorAll('*').forEach((node) => {
    Array.from(node.attributes).forEach((attribute) => {
      const name = attribute.name.toLowerCase()
      const attributeValue = attribute.value || ''
      if (name.startsWith('on') || (['href', 'src'].includes(name) && /^javascript:/i.test(attributeValue))) {
        node.removeAttribute(attribute.name)
      }
    })
  })
  return template.innerHTML
}

export function stripAdminModalHtml(value) {
  const template = document.createElement('template')
  template.innerHTML = value || ''
  return template.content.textContent || ''
}

export function normalizeAdminModalUrl(value) {
  const trimmed = String(value || '').trim()
  if (!trimmed) return ''
  return /^https?:\/\//i.test(trimmed) ? trimmed : `https://${trimmed}`
}

function toLowerCase(value) {
  return value.toLowerCase()
}

function normalizeLowerCaseList(value) {
  return [...new Set(normalizeAdminModalList(value).map(toLowerCase))]
}
