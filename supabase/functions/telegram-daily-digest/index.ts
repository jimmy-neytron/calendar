import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'
import { isStorePriceCurrent } from '../_shared/storePrice.ts'
import { code128, ean13, ean8, qrcode, upca } from 'npm:@bwip-js/node@4.11.4'

type TelegramConnection = {
  user_id: string
  telegram_chat_id: number
  include_calendar: boolean
  include_sport: boolean
  last_digest_sent_on: string | null
}

type Profile = {
  id: string
  subscription_tier: string
  is_active: boolean
}

type WorkspaceMember = {
  workspace_id: string
}

type CalendarEvent = {
  title: string
  start_time: string
  end_time: string
  all_day: boolean
  member_ids: string[]
  responsible_id: string | null
}

type SportExercise = {
  title: string
  sets: string
  reps: string
  note: string
  order: number
  muscle_groups?: string[]
  exercise_type?: string
  difficulty?: string
  equipment?: string
  duration_minutes?: number | null
  rest_seconds?: number | null
  tempo?: string
  instructions?: string
  common_mistakes?: string
  workout_name?: string
  workout_focus?: string[]
}

type DigestCoupon = {
  id: string
  title: string
  merchant: string
  discount_type: 'percent' | 'amount' | 'text'
  discount_value: number
  discount_label: string
  code_type: 'qr' | 'barcode' | 'promo' | 'none'
  code_value: string
  barcode_format: 'code128' | 'ean13' | 'ean8' | 'upca'
  expires_on: string | null
}

type DigestShoppingIngredient = {
  name: string
  amount: number
  unit: 'g' | 'ml' | 'piece'
}

type DigestPurchaseSummary = {
  lines: Array<{ name: string; packages: number; packagePrice: number; total: number }>
  total: number
  unresolvedCount: number
  ingredients: DigestShoppingIngredient[]
}

type DigestMealSlot = {
  recipeId?: string
  servings?: number
  recipeServings?: number
  ingredients?: unknown
}

type DigestMealRecipe = {
  id: string
  servings: number
  ingredients: unknown
}

type DigestRequest = {
  source?: string
  targetUserId?: string
  force?: boolean
}

const botToken = Deno.env.get('TELEGRAM_BOT_TOKEN') || ''
const cronSecret = Deno.env.get('DIGEST_CRON_SECRET') || ''
const supabaseUrl = Deno.env.get('SUPABASE_URL') || ''
const serviceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') || ''

const supabase = createClient(supabaseUrl, serviceRoleKey)

Deno.serve(async (request) => {
  if (request.method !== 'POST') {
    return json({ ok: false, error: 'Method not allowed' }, 405)
  }

  if (cronSecret && request.headers.get('x-cron-secret') !== cronSecret) {
    return json({ ok: false, error: 'Unauthorized' }, 401)
  }

  if (!botToken || !supabaseUrl || !serviceRoleKey) {
    return json({ ok: false, error: 'Missing function secrets' }, 500)
  }

  const payload = await readDigestRequest(request)
  const targetUserId = payload.targetUserId?.trim() || ''
  const force = payload.force === true

  if (targetUserId && !isUuid(targetUserId)) {
    return json({ ok: false, error: 'targetUserId must be a valid UUID' }, 400)
  }
  if (force && !targetUserId) {
    return json({ ok: false, error: 'force requires targetUserId' }, 400)
  }
  if ((targetUserId || force) && !cronSecret) {
    return json({ ok: false, error: 'Test mode requires DIGEST_CRON_SECRET' }, 500)
  }

  const today = getMoscowDate()
  const weekday = new Date(`${today}T12:00:00+03:00`).getDay()

  let connectionsQuery = supabase
    .from('telegram_connections')
    .select('user_id,telegram_chat_id,include_calendar,include_sport,last_digest_sent_on')
    .eq('is_connected', true)
    .eq('daily_digest_enabled', true)

  if (targetUserId) connectionsQuery = connectionsQuery.eq('user_id', targetUserId)
  const { data: connectionRows, error: connectionError } = await connectionsQuery

  if (connectionError) {
    return json({ ok: false, error: connectionError.message }, 500)
  }

  const connections = (connectionRows || []) as TelegramConnection[]
  const userIds = connections.map((connection) => connection.user_id)
  if (!userIds.length) {
    return json(targetUserId
      ? { ok: false, sent: 0, error: 'Target user has no active Telegram digest connection' }
      : { ok: true, sent: 0 }, targetUserId ? 404 : 200)
  }

  const { data: profileRows } = await supabase
    .from('profiles')
    .select('id,subscription_tier,is_active')
    .in('id', userIds)

  const profiles = new Map(
    ((profileRows || []) as Profile[]).map((profile) => [profile.id, profile]),
  )

  let sent = 0
  let codeImagesSent = 0
  let codeImagesFailed = 0
  for (const connection of connections) {
    const profile = profiles.get(connection.user_id)
    if (!profile || profile.subscription_tier !== 'pro' || profile.is_active === false) continue
    if (!force && connection.last_digest_sent_on === today) continue

    const workspaceIds = await loadWorkspaceIds(connection.user_id)
    const [events, exercises, coupons, shoppingIngredients] = await Promise.all([
      connection.include_calendar ? loadEvents(connection.user_id, workspaceIds, today) : Promise.resolve([]),
      connection.include_sport ? loadSportExercises(connection.user_id, weekday) : Promise.resolve([]),
      loadDigestCoupons(workspaceIds, today),
      loadTodayShoppingIngredients(workspaceIds, today),
    ])
    const purchaseSummary = await priceShoppingIngredients(workspaceIds, shoppingIngredients)

    const message = buildDigestMessage(today, events, exercises, coupons, purchaseSummary)
    const telegramResponse = await sendMessage(connection.telegram_chat_id, message)

    if (telegramResponse.ok) {
      const imageResult = await sendCouponCodeImages(connection.telegram_chat_id, coupons)
      codeImagesSent += imageResult.sent
      codeImagesFailed += imageResult.failed
      sent += 1
      await supabase
        .from('telegram_connections')
        .update({ last_digest_sent_on: today, updated_at: new Date().toISOString() })
        .eq('user_id', connection.user_id)
    } else if (telegramResponse.status === 403 || telegramResponse.status === 400) {
      await supabase
        .from('telegram_connections')
        .update({ is_connected: false, updated_at: new Date().toISOString() })
        .eq('user_id', connection.user_id)
    }
  }

  return json({ ok: true, sent, codeImagesSent, codeImagesFailed, testMode: Boolean(targetUserId), targetUserId: targetUserId || undefined, forced: force })
})

async function readDigestRequest(request: Request): Promise<DigestRequest> {
  const requestUrl = new URL(request.url)
  try {
    const payload = await request.json()
    const body = payload && typeof payload === 'object' ? payload as DigestRequest : {}
    return {
      ...body,
      targetUserId: body.targetUserId || requestUrl.searchParams.get('targetUserId') || undefined,
      force: body.force === true || requestUrl.searchParams.get('force') === 'true',
    }
  } catch {
    return {
      targetUserId: requestUrl.searchParams.get('targetUserId') || undefined,
      force: requestUrl.searchParams.get('force') === 'true',
    }
  }
}

function isUuid(value: string) {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(value)
}

async function loadWorkspaceIds(userId: string) {
  const { data } = await supabase
    .from('workspace_members')
    .select('workspace_id')
    .eq('user_id', userId)

  return ((data || []) as WorkspaceMember[]).map((member) => member.workspace_id)
}

async function loadEvents(userId: string, workspaceIds: string[], today: string) {
  if (!workspaceIds.length) return []

  const { data } = await supabase
    .from('events')
    .select('title,start_time,end_time,all_day,member_ids,responsible_id')
    .eq('date', today)
    .in('workspace_id', workspaceIds)
    .order('start_time', { ascending: true })

  return ((data || []) as CalendarEvent[])
    .filter((event) => {
      const memberIds = Array.isArray(event.member_ids) ? event.member_ids : []
      return !memberIds.length || memberIds.includes(userId) || event.responsible_id === userId
    })
    .slice(0, 12)
}

async function loadSportExercises(userId: string, weekday: number) {
  const richFields = 'title,sets,reps,note,order,muscle_groups,exercise_type,difficulty,equipment,duration_minutes,rest_seconds,tempo,instructions,common_mistakes,workout_name,workout_focus'
  const { data, error } = await supabase
    .from('sport_exercises')
    .select(richFields)
    .eq('user_id', userId)
    .eq('weekday', weekday)
    .order('order', { ascending: true })

  if (!error) return ((data || []) as SportExercise[]).slice(0, 12)

  // Keeps the digest working while the optional details migration is being applied.
  const { data: legacyData } = await supabase
    .from('sport_exercises')
    .select('title,sets,reps,note,order')
    .eq('user_id', userId)
    .eq('weekday', weekday)
    .order('order', { ascending: true })

  return ((legacyData || []) as SportExercise[]).slice(0, 12)
}

async function loadDigestCoupons(workspaceIds: string[], today: string) {
  if (!workspaceIds.length) return []

  const { data } = await supabase
    .from('coupons')
    .select('id,title,merchant,discount_type,discount_value,discount_label,code_type,code_value,barcode_format,expires_on')
    .in('workspace_id', workspaceIds)
    .eq('is_used', false)
    .or(`expires_on.is.null,expires_on.gte.${today}`)
    .order('expires_on', { ascending: true, nullsFirst: false })
    .limit(24)

  const coupons = (data || []) as DigestCoupon[]
  return selectDigestCoupons(coupons)
}

async function loadTodayShoppingIngredients(workspaceIds: string[], today: string) {
  if (!workspaceIds.length) return []

  const { data: weekRows, error } = await supabase
    .from('meal_weeks')
    .select('plan')
    .in('workspace_id', workspaceIds)
    .eq('week_start', getMondayDateKey(today))

  if (error) {
    console.error('Failed to load meal weeks for digest:', error.message)
    return []
  }

  const plans = (weekRows || []).map((row) => (
    row.plan && typeof row.plan === 'object' && !Array.isArray(row.plan)
      ? row.plan as Record<string, unknown>
      : {}
  ))
  const slots = plans.flatMap((plan) => {
    const day = plan[today] as Record<string, DigestMealSlot> | undefined
    return day && typeof day === 'object' ? Object.values(day).filter(Boolean) : []
  })
  const manualItems = plans.flatMap((plan) => normalizeManualDigestItems(plan.__shoppingItems, today))
  if (!slots.length && !manualItems.length) return []

  const entries: Array<{ ingredient: DigestShoppingIngredient; multiplier: number }> = manualItems
    .map((ingredient) => ({ ingredient, multiplier: 1 }))
  const unresolvedSlots: DigestMealSlot[] = []
  slots.forEach((slot) => {
    const ingredients = normalizeDigestIngredients(slot.ingredients)
    if (!ingredients.length) {
      unresolvedSlots.push(slot)
      return
    }
    const multiplier = Math.max(0, Number(slot.servings) || 0) / Math.max(1, Number(slot.recipeServings) || 1)
    ingredients.forEach((ingredient) => entries.push({ ingredient, multiplier }))
  })

  const recipeIds = [...new Set(unresolvedSlots.map((slot) => slot.recipeId).filter(Boolean))] as string[]
  if (recipeIds.length) {
    const { data: recipeRows, error: recipeError } = await supabase
      .from('meal_recipes')
      .select('id,servings,ingredients')
      .in('workspace_id', workspaceIds)
      .in('id', recipeIds)

    if (recipeError) {
      console.error('Failed to load meal recipes for digest:', recipeError.message)
    } else {
      const recipes = new Map(((recipeRows || []) as DigestMealRecipe[]).map((recipe) => [recipe.id, recipe]))
      unresolvedSlots.forEach((slot) => {
        const recipe = slot.recipeId ? recipes.get(slot.recipeId) : undefined
        if (!recipe) return
        const multiplier = Math.max(0, Number(slot.servings) || 0) / Math.max(1, Number(recipe.servings) || 1)
        normalizeDigestIngredients(recipe.ingredients)
          .forEach((ingredient) => entries.push({ ingredient, multiplier }))
      })
    }
  }

  const merged = new Map<string, DigestShoppingIngredient>()
  entries.forEach(({ ingredient, multiplier }) => {
    const key = `${normalizeDigestName(ingredient.name)}:${ingredient.unit}`
    const current = merged.get(key) || { ...ingredient, amount: 0 }
    current.amount += ingredient.amount * multiplier
    merged.set(key, current)
  })
  return [...merged.values()]
    .map((ingredient) => ({ ...ingredient, amount: Math.round(ingredient.amount * 100) / 100 }))
    .filter((ingredient) => ingredient.amount > 0)
    .sort((left, right) => left.name.localeCompare(right.name, 'ru'))
    .slice(0, 30)
}

async function priceShoppingIngredients(
  workspaceIds: string[],
  ingredients: DigestShoppingIngredient[],
): Promise<DigestPurchaseSummary> {
  const empty = { lines: [], total: 0, unresolvedCount: ingredients.length, ingredients }
  if (!workspaceIds.length || !ingredients.length) return empty

  const { data: linkRows, error: linkError } = await supabase
    .from('meal_ingredient_product_links')
    .select('workspace_id,normalized_ingredient_name,ingredient_unit,product_id,package_amount_override')
    .in('workspace_id', workspaceIds)
  if (linkError) {
    console.error('Failed to load ingredient product links:', linkError.message)
    return empty
  }

  const links = (linkRows || []) as Array<{
    normalized_ingredient_name: string
    ingredient_unit: DigestShoppingIngredient['unit']
    product_id: string
    package_amount_override: number | null
  }>
  const productIds = [...new Set(links.map((link) => link.product_id))]
  if (!productIds.length) return empty
  const { data: productRows, error: productError } = await supabase
    .from('store_products')
    .select('id,name,package_amount,package_unit,current_price,price_verified,price_updated_at')
    .in('id', productIds)
  if (productError) {
    console.error('Failed to load store products:', productError.message)
    return empty
  }

  const products = new Map((productRows || []).map((product) => [String(product.id), product]))
  const linkByIngredient = new Map(links.map((link) => [`${link.normalized_ingredient_name}:${link.ingredient_unit}`, link]))
  const lines: DigestPurchaseSummary['lines'] = []
  let unresolvedCount = 0
  ingredients.forEach((ingredient) => {
    const link = linkByIngredient.get(`${normalizeDigestName(ingredient.name)}:${ingredient.unit}`)
    const product = link ? products.get(link.product_id) : null
    const packageAmount = Number(link?.package_amount_override || product?.package_amount || 0)
    const packagePrice = Number(product?.current_price)
    if (!product || product.package_unit !== ingredient.unit || !Number.isFinite(packageAmount) || packageAmount <= 0
      || !isStorePriceCurrent(product.current_price, product.price_verified, product.price_updated_at)) {
      unresolvedCount += 1
      return
    }
    const packages = Math.ceil(ingredient.amount / packageAmount)
    lines.push({ name: ingredient.name, packages, packagePrice, total: Math.round(packages * packagePrice * 100) / 100 })
  })
  return {
    lines,
    total: Math.round(lines.reduce((sum, line) => sum + line.total, 0) * 100) / 100,
    unresolvedCount,
    ingredients,
  }
}

function normalizeDigestIngredients(value: unknown): DigestShoppingIngredient[] {
  if (!Array.isArray(value)) return []
  return value.flatMap((item) => {
    if (!item || typeof item !== 'object') return []
    const source = item as Record<string, unknown>
    const name = String(source.name || '').trim()
    const amount = Math.max(0, Number(source.amount) || 0)
    const unit = ['g', 'ml', 'piece'].includes(String(source.unit))
      ? String(source.unit) as DigestShoppingIngredient['unit']
      : 'g'
    return name && amount ? [{ name, amount, unit }] : []
  })
}

function normalizeManualDigestItems(value: unknown, date: string) {
  if (!Array.isArray(value)) return []
  return value.flatMap((item) => {
    if (!item || typeof item !== 'object') return []
    const source = item as Record<string, unknown>
    return String(source.date || '') === date ? normalizeDigestIngredients([source]) : []
  })
}

function normalizeDigestName(value: string) {
  return value.toLocaleLowerCase('ru-RU').replace(/ё/g, 'е').trim()
}

function getMondayDateKey(date: string) {
  const current = new Date(`${date}T12:00:00+03:00`)
  const weekday = current.getUTCDay() || 7
  current.setUTCDate(current.getUTCDate() - weekday + 1)
  return current.toISOString().slice(0, 10)
}

function selectDigestCoupons(coupons: DigestCoupon[]) {
  const selected: DigestCoupon[] = []
  const preferredCodeTypes: DigestCoupon['code_type'][] = ['promo', 'qr', 'barcode']

  preferredCodeTypes.forEach((codeType) => {
    const nearest = coupons.find((coupon) => coupon.code_type === codeType)
    if (nearest) selected.push(nearest)
  })

  for (const coupon of coupons) {
    if (selected.length >= 3) break
    if (!selected.some((item) => item.id === coupon.id)) selected.push(coupon)
  }

  return selected.sort((left, right) => expirySortValue(left.expires_on) - expirySortValue(right.expires_on))
}

function expirySortValue(value: string | null) {
  return value ? new Date(`${value}T23:59:59+03:00`).getTime() : Number.MAX_SAFE_INTEGER
}

function buildDigestMessage(
  today: string,
  events: CalendarEvent[],
  exercises: SportExercise[],
  coupons: DigestCoupon[],
  purchaseSummary: DigestPurchaseSummary,
) {
  const lines = [
    '<b>☀️ Доброе утро!</b>',
    `<i>${formatRussianDate(today)} · ваш план на день</i>`,
    '',
    '━━━━━━━━━━━━━━',
    '',
    `<b>📅 Календарь</b> · ${events.length ? formatRussianCount(events.length, ['событие', 'события', 'событий']) : 'свободный день'}`,
  ]

  if (events.length) {
    const eventLines = events.map((event) => {
      const time = event.all_day ? 'весь день' : [event.start_time, event.end_time].filter(Boolean).join('-')
      return `${time ? `<b>${escapeTelegramHtml(time)}</b>  ` : ''}${escapeTelegramHtml(event.title)}`
    })
    lines.push(`<blockquote>${eventLines.join('\n')}</blockquote>`)
  } else {
    lines.push('<i>Можно оставить время для себя</i>')
  }

  if (purchaseSummary.ingredients.length) {
    lines.push('', `<b>🛒 Купить сегодня</b> · ${formatRussianCount(purchaseSummary.ingredients.length, ['продукт', 'продукта', 'продуктов'])}`)
    const purchaseLines = purchaseSummary.lines.map((line) => (
      `${escapeTelegramHtml(line.name)} — <b>${line.packages} уп. × ${formatMoney(line.packagePrice)} = ${formatMoney(line.total)}</b>`
    ))
    if (purchaseLines.length) purchaseLines.push('', `<b>Ориентировочно: ${formatMoney(purchaseSummary.total)}</b>`)
    if (purchaseSummary.unresolvedCount) purchaseLines.push(`Не связано с каталогом: <b>${purchaseSummary.unresolvedCount}</b>`)
    lines.push(`<blockquote>${purchaseLines.join('\n')}</blockquote>`)
  }

  const totalDuration = exercises.reduce((sum, exercise) => sum + Math.max(0, Number(exercise.duration_minutes) || 0), 0)
  const sportSummary = exercises.length
    ? [formatRussianCount(exercises.length, ['упражнение', 'упражнения', 'упражнений']), totalDuration ? `${totalDuration} мин` : ''].filter(Boolean).join(' · ')
    : 'день отдыха'
  lines.push('', `<b>🏃 Тренировка</b> · ${sportSummary}`)
  if (exercises.length) {
    const instructionLines: string[] = []
    const workoutGroups = new Map<string, {
      name: string
      focus: string[]
      rows: Array<{ exercise: SportExercise; index: number }>
    }>()

    exercises.forEach((exercise, index) => {
      const workoutName = exercise.workout_name?.trim() || 'План тренировки'
      const workoutKey = workoutName.toLocaleLowerCase('ru-RU').replace(/ё/g, 'е')
      const group = workoutGroups.get(workoutKey) || {
        name: workoutName,
        focus: exercise.workout_focus || [],
        rows: [],
      }
      group.rows.push({ exercise, index })
      workoutGroups.set(workoutKey, group)

      const context = [
        ...(exercise.muscle_groups || []),
        exercise.exercise_type,
        exercise.equipment,
      ].filter(Boolean).join(' · ')

      const instructions = [
        context ? `Фокус: ${context}` : '',
        exercise.instructions,
        exercise.tempo ? `Темп: ${exercise.tempo}` : '',
        exercise.rest_seconds != null ? `Отдых: ${exercise.rest_seconds} сек` : '',
        exercise.note ? `Заметка: ${exercise.note}` : '',
      ].filter(Boolean).join(' · ')
      if (instructions) instructionLines.push(`<b>${index + 1}. ${escapeTelegramHtml(exercise.title)}</b>\n${escapeTelegramHtml(instructions)}`)
    })

    const workoutMarkers = ['🟣', '🔵', '🟢', '🟠']
    Array.from(workoutGroups.values()).forEach((group, groupIndex) => {
      const focus = group.focus.join(' · ')
      lines.push(
        `${workoutMarkers[groupIndex % workoutMarkers.length]} <b>${escapeTelegramHtml(group.name)}</b>${focus ? `\n<i>${escapeTelegramHtml(focus)}</i>` : ''}`,
        `<pre>${escapeTelegramHtml(buildSportTable(group.rows))}</pre>`,
      )
    })

    if (instructionLines.length) lines.push(`<blockquote expandable><b>💡 Техника и подсказки</b>\n${instructionLines.join('\n\n')}</blockquote>`)
  } else {
    lines.push('<i>Сегодня можно восстановиться</i>')
  }

  if (coupons.length) {
    lines.push('', `<b>🎟 Купоны рядом</b> · ${coupons.length}`)
    const merchantGroups = new Map<string, { merchant: string; coupons: DigestCoupon[] }>()
    coupons.forEach((coupon) => {
      const merchant = coupon.merchant.trim() || 'Другие предложения'
      const key = merchant.toLocaleLowerCase('ru-RU').replace(/ё/g, 'е')
      const group = merchantGroups.get(key) || { merchant, coupons: [] }
      group.coupons.push(coupon)
      merchantGroups.set(key, group)
    })
    const couponLines: string[] = []
    merchantGroups.forEach((group) => {
      couponLines.push(`<b>${escapeTelegramHtml(group.merchant)}</b>`)
      group.coupons.forEach((coupon) => {
        couponLines.push(`<b>${escapeTelegramHtml(formatCouponBenefit(coupon))}</b> · ${escapeTelegramHtml(coupon.title)}`)
        couponLines.push(`<i>${coupon.expires_on ? `до ${formatShortDate(coupon.expires_on)}` : 'без срока'}</i>`)
        const code = formatCouponCode(coupon)
        if (code) couponLines.push(code)
      })
    })
    lines.push(`<blockquote>${couponLines.join('\n')}</blockquote>`)
  }

  lines.push('', '━━━━━━━━━━━━━━', '<i>Хорошего и продуктивного дня ✨</i>')

  return truncateTelegramHtml(lines)
}

function formatMoney(value: number) {
  return `${new Intl.NumberFormat('ru-RU', { maximumFractionDigits: 2 }).format(value)} ₽`
}

function formatRussianCount(value: number, forms: [string, string, string]) {
  const mod100 = value % 100
  const mod10 = value % 10
  const form = mod100 >= 11 && mod100 <= 19 ? forms[2] : mod10 === 1 ? forms[0] : mod10 >= 2 && mod10 <= 4 ? forms[1] : forms[2]
  return `${value} ${form}`
}

function buildSportTable(rows: Array<{ exercise: SportExercise; index: number }>) {
  const tableLines = [
    '№  Упражнение       Подх Повт  Мин',
    '── ──────────────── ──── ───── ───',
  ]

  rows.forEach(({ exercise, index }) => {
    tableLines.push([
      formatTableCell(String(index + 1), 2, 'right'),
      formatTableCell(exercise.title, 16),
      formatTableCell(compactExerciseMetric(exercise.sets), 4, 'right'),
      formatTableCell(compactExerciseMetric(exercise.reps), 5, 'right'),
      formatTableCell(exercise.duration_minutes ? String(exercise.duration_minutes) : '—', 3, 'right'),
    ].join(' '))
  })

  return tableLines.join('\n')
}

function compactExerciseMetric(value: string) {
  const match = String(value || '').match(/\d+(?:\s*[–—-]\s*\d+)?/)
  return match?.[0].replace(/\s+/g, '') || '—'
}

function formatTableCell(value: string, width: number, align: 'left' | 'right' = 'left') {
  const normalized = String(value || '—').trim()
  const clipped = normalized.length > width ? `${normalized.slice(0, Math.max(1, width - 1))}…` : normalized
  return align === 'right' ? clipped.padStart(width) : clipped.padEnd(width)
}

function formatCouponBenefit(coupon: DigestCoupon) {
  if (coupon.discount_label.trim()) return coupon.discount_label.trim()
  if (coupon.discount_type === 'percent') return `−${coupon.discount_value}%`
  if (coupon.discount_type === 'amount') return `−${new Intl.NumberFormat('ru-RU').format(coupon.discount_value)} ₽`
  return 'Специальное предложение'
}

function formatCouponCode(coupon: DigestCoupon) {
  if (!coupon.code_value || coupon.code_type === 'none') return ''
  if (coupon.code_type === 'promo') return `Промокод: <code>${escapeTelegramHtml(coupon.code_value)}</code>`
  const label = coupon.code_type === 'qr' ? 'QR-код' : 'Штрихкод'
  return `<i>${label} — изображение ниже</i>`
}

function formatShortDate(date: string) {
  return new Intl.DateTimeFormat('ru-RU', { day: 'numeric', month: 'short' })
    .format(new Date(`${date}T12:00:00+03:00`))
    .replace('.', '')
}

function truncateTelegramHtml(lines: string[]) {
  const limit = 3900
  const suffix = '\n\n<i>…остальное смотри в приложении</i>'
  const result: string[] = []
  for (const line of lines) {
    const candidate = [...result, line].join('\n')
    if (candidate.length + suffix.length > limit) return `${result.join('\n').trimEnd()}${suffix}`
    result.push(line)
  }
  return result.join('\n')
}

function escapeTelegramHtml(value: unknown) {
  return String(value ?? '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
}

function getMoscowDate() {
  const parts = new Intl.DateTimeFormat('en-CA', {
    timeZone: 'Europe/Moscow',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).formatToParts(new Date())

  const year = parts.find((part) => part.type === 'year')?.value || '1970'
  const month = parts.find((part) => part.type === 'month')?.value || '01'
  const day = parts.find((part) => part.type === 'day')?.value || '01'
  return `${year}-${month}-${day}`
}

function formatRussianDate(date: string) {
  const formatted = new Intl.DateTimeFormat('ru-RU', {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
  }).format(new Date(`${date}T12:00:00+03:00`))
  return formatted.charAt(0).toLocaleUpperCase('ru-RU') + formatted.slice(1)
}

async function sendCouponCodeImages(chatId: number, coupons: DigestCoupon[]) {
  const codeCoupons = coupons.filter((coupon) => ['qr', 'barcode'].includes(coupon.code_type) && coupon.code_value)
  const images = (await Promise.all(codeCoupons.map(async (coupon) => {
    try {
      return { coupon, png: await renderCouponCode(coupon) }
    } catch (error) {
      console.error(`Failed to render coupon code ${coupon.id}:`, error instanceof Error ? error.message : String(error))
      return null
    }
  }))).filter((image): image is { coupon: DigestCoupon; png: Uint8Array } => image !== null)

  const renderFailures = codeCoupons.length - images.length
  if (!images.length) return { sent: 0, failed: renderFailures }
  const form = new FormData()
  form.append('chat_id', String(chatId))

  if (images.length === 1) {
    const [image] = images
    form.append('caption', formatCouponImageCaption(image.coupon))
    form.append('parse_mode', 'HTML')
    form.append('photo', new Blob([image.png], { type: 'image/png' }), `coupon-${image.coupon.id}.png`)
    const response = await fetch(`https://api.telegram.org/bot${botToken}/sendPhoto`, { method: 'POST', body: form })
    if (!response.ok) console.error('Telegram sendPhoto failed:', response.status, await response.text())
    return response.ok ? { sent: 1, failed: renderFailures } : { sent: 0, failed: renderFailures + 1 }
  }

  const media = images.map((image, index) => {
    const attachmentName = `coupon_code_${index}`
    form.append(attachmentName, new Blob([image.png], { type: 'image/png' }), `coupon-${image.coupon.id}.png`)
    return { type: 'photo', media: `attach://${attachmentName}`, caption: formatCouponImageCaption(image.coupon), parse_mode: 'HTML' }
  })
  form.append('media', JSON.stringify(media))
  const response = await fetch(`https://api.telegram.org/bot${botToken}/sendMediaGroup`, { method: 'POST', body: form })
  if (!response.ok) console.error('Telegram sendMediaGroup failed:', response.status, await response.text())
  return response.ok ? { sent: images.length, failed: renderFailures } : { sent: 0, failed: renderFailures + images.length }
}

async function renderCouponCode(coupon: DigestCoupon): Promise<Uint8Array> {
  const common = { text: coupon.code_value, backgroundcolor: 'FFFFFF', padding: 12 }
  if (coupon.code_type === 'qr') return Uint8Array.from(await qrcode({ ...common, scale: 6, eclevel: 'M' }))

  const options = { ...common, scale: 3, height: 18, includetext: true, textxalign: 'center' as const, textsize: 10 }
  const retailOptions = { ...options, height: 16, textsize: 9, textyoffset: -9, guarddescent: 2, paddingbottom: 10 }
  if (coupon.barcode_format === 'ean13') return Uint8Array.from(await ean13(retailOptions))
  if (coupon.barcode_format === 'ean8') return Uint8Array.from(await ean8(retailOptions))
  if (coupon.barcode_format === 'upca') return Uint8Array.from(await upca(retailOptions))
  return Uint8Array.from(await code128(options))
}

function formatCouponImageCaption(coupon: DigestCoupon) {
  const merchant = coupon.merchant.trim() || 'Купон'
  const expiry = coupon.expires_on ? `до ${formatShortDate(coupon.expires_on)}` : 'без срока'
  const codeLabel = coupon.code_type === 'qr' ? 'QR-код' : 'Штрихкод'
  return `🎟 <b>${escapeTelegramHtml(merchant)}</b> · ${escapeTelegramHtml(formatCouponBenefit(coupon))}\n${escapeTelegramHtml(coupon.title)}\n🗓 ${expiry}\n📱 <i>${codeLabel} — покажите на кассе</i>`
}

async function sendMessage(chatId: number, text: string) {
  return fetch(`https://api.telegram.org/bot${botToken}/sendMessage`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ chat_id: chatId, text, parse_mode: 'HTML', disable_web_page_preview: true }),
  })
}

function json(payload: Record<string, unknown>, status = 200) {
  return new Response(JSON.stringify(payload), {
    status,
    headers: { 'Content-Type': 'application/json' },
  })
}
