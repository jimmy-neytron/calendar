import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

type TelegramUpdate = {
  message?: {
    text?: string
    chat?: { id?: number }
    from?: {
      username?: string
      first_name?: string
    }
  }
}

const botToken = Deno.env.get('TELEGRAM_BOT_TOKEN') || ''
const webhookSecret = Deno.env.get('TELEGRAM_WEBHOOK_SECRET') || ''
const supabaseUrl = Deno.env.get('SUPABASE_URL') || ''
const serviceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') || ''

const supabase = createClient(supabaseUrl, serviceRoleKey)

Deno.serve(async (request) => {
  if (request.method !== 'POST') {
    return json({ ok: false, error: 'Method not allowed' }, 405)
  }

  if (webhookSecret && request.headers.get('x-telegram-bot-api-secret-token') !== webhookSecret) {
    return json({ ok: false, error: 'Unauthorized' }, 401)
  }

  if (!botToken || !supabaseUrl || !serviceRoleKey) {
    return json({ ok: false, error: 'Missing function secrets' }, 500)
  }

  const update = await request.json() as TelegramUpdate
  const text = update.message?.text?.trim() || ''
  const chatId = update.message?.chat?.id
  const username = update.message?.from?.username || ''
  const firstName = update.message?.from?.first_name || ''
  const code = parseStartCode(text)

  if (!chatId) {
    return json({ ok: true })
  }

  if (!code) {
    await sendMessage(chatId, 'Откройте интеграцию в приложении и нажмите "Подключить Telegram".')
    return json({ ok: true })
  }

  const { data: linkCode, error: linkError } = await supabase
    .from('telegram_link_codes')
    .select('code,user_id,expires_at,used_at')
    .eq('code', code)
    .is('used_at', null)
    .gt('expires_at', new Date().toISOString())
    .maybeSingle()

  if (linkError || !linkCode) {
    await sendMessage(chatId, 'Код не найден или уже истек. Создайте новый код в разделе "Интеграции".')
    return json({ ok: true })
  }

  const userId = String(linkCode.user_id)
  const { data: profile } = await supabase
    .from('profiles')
    .select('subscription_tier,is_active')
    .eq('id', userId)
    .maybeSingle()

  if (profile?.subscription_tier !== 'pro' || profile?.is_active === false) {
    await sendMessage(chatId, 'Telegram-интеграция доступна только на тарифе Pro.')
    return json({ ok: true })
  }

  const now = new Date().toISOString()
  const { error: upsertError } = await supabase
    .from('telegram_connections')
    .upsert({
      user_id: userId,
      telegram_chat_id: chatId,
      telegram_username: username,
      telegram_first_name: firstName,
      is_connected: true,
      daily_digest_enabled: true,
      include_calendar: true,
      include_sport: true,
      connected_at: now,
      updated_at: now,
    }, { onConflict: 'user_id' })

  if (upsertError) {
    await sendMessage(chatId, 'Не удалось подключить Telegram. Попробуйте создать новый код.')
    return json({ ok: false, error: upsertError.message }, 500)
  }

  await supabase
    .from('telegram_link_codes')
    .update({ used_at: now })
    .eq('code', code)

  await sendMessage(chatId, 'Telegram подключен. Ежедневная сводка будет приходить в 08:00 по Москве.')
  return json({ ok: true })
})

function parseStartCode(text: string) {
  const match = text.match(/^\/start\s+([a-z0-9_-]{6,32})$/i)
  return match?.[1]?.toUpperCase() || ''
}

async function sendMessage(chatId: number, text: string) {
  await fetch(`https://api.telegram.org/bot${botToken}/sendMessage`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ chat_id: chatId, text }),
  })
}

function json(payload: Record<string, unknown>, status = 200) {
  return new Response(JSON.stringify(payload), {
    status,
    headers: { 'Content-Type': 'application/json' },
  })
}
