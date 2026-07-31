import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

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

  const today = getMoscowDate()
  const weekday = new Date(`${today}T12:00:00+03:00`).getDay()

  const { data: connectionRows, error: connectionError } = await supabase
    .from('telegram_connections')
    .select('user_id,telegram_chat_id,include_calendar,include_sport,last_digest_sent_on')
    .eq('is_connected', true)
    .eq('daily_digest_enabled', true)

  if (connectionError) {
    return json({ ok: false, error: connectionError.message }, 500)
  }

  const connections = (connectionRows || []) as TelegramConnection[]
  const userIds = connections.map((connection) => connection.user_id)
  if (!userIds.length) {
    return json({ ok: true, sent: 0 })
  }

  const { data: profileRows } = await supabase
    .from('profiles')
    .select('id,subscription_tier,is_active')
    .in('id', userIds)

  const profiles = new Map(
    ((profileRows || []) as Profile[]).map((profile) => [profile.id, profile]),
  )

  let sent = 0
  for (const connection of connections) {
    const profile = profiles.get(connection.user_id)
    if (!profile || profile.subscription_tier !== 'pro' || profile.is_active === false) continue
    if (connection.last_digest_sent_on === today) continue

    const workspaceIds = await loadWorkspaceIds(connection.user_id)
    const [events, exercises] = await Promise.all([
      connection.include_calendar ? loadEvents(connection.user_id, workspaceIds, today) : Promise.resolve([]),
      connection.include_sport ? loadSportExercises(connection.user_id, weekday) : Promise.resolve([]),
    ])

    const message = buildDigestMessage(today, events, exercises)
    const telegramResponse = await sendMessage(connection.telegram_chat_id, message)

    if (telegramResponse.ok) {
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

  return json({ ok: true, sent })
})

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

function buildDigestMessage(today: string, events: CalendarEvent[], exercises: SportExercise[]) {
  const lines = [`План на сегодня (${formatRussianDate(today)})`, '']

  lines.push('Календарь:')
  if (events.length) {
    for (const event of events) {
      const time = event.all_day ? 'весь день' : [event.start_time, event.end_time].filter(Boolean).join('-')
      lines.push(`- ${time ? `${time} ` : ''}${event.title}`)
    }
  } else {
    lines.push('- событий нет')
  }

  lines.push('', 'Спорт:')
  if (exercises.length) {
    let currentWorkout = ''
    exercises.forEach((exercise, index) => {
      if (exercise.workout_name && exercise.workout_name !== currentWorkout) {
        currentWorkout = exercise.workout_name
        const focus = (exercise.workout_focus || []).join(' · ')
        lines.push('', `${currentWorkout}${focus ? ` — ${focus}` : ''}`)
      }
      const details = [exercise.sets, exercise.reps, exercise.duration_minutes ? `${exercise.duration_minutes} мин` : ''].filter(Boolean).join(' · ')
      const context = [
        ...(exercise.muscle_groups || []),
        exercise.exercise_type,
        exercise.equipment,
      ].filter(Boolean).join(' · ')
      lines.push(`${index + 1}. ${exercise.title}${details ? ` — ${details}` : ''}`)
      if (context) lines.push(`   ${context}`)
      if (exercise.instructions) lines.push(`   Как делать: ${exercise.instructions}`)
      if (exercise.tempo || exercise.rest_seconds != null) {
        lines.push(`   ${[exercise.tempo ? `Темп: ${exercise.tempo}` : '', exercise.rest_seconds != null ? `Отдых: ${exercise.rest_seconds} сек` : ''].filter(Boolean).join(' · ')}`)
      }
      if (exercise.note) lines.push(`   Заметка: ${exercise.note}`)
    })
  } else {
    lines.push('- тренировок нет')
  }

  return truncateTelegramText(lines.join('\n'))
}

function truncateTelegramText(text: string) {
  const limit = 3900
  if (text.length <= limit) return text
  return `${text.slice(0, limit - 35).trimEnd()}\n\n…остальное смотри в приложении`
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
  return new Intl.DateTimeFormat('ru-RU', {
    day: '2-digit',
    month: 'long',
  }).format(new Date(`${date}T12:00:00+03:00`))
}

async function sendMessage(chatId: number, text: string) {
  return fetch(`https://api.telegram.org/bot${botToken}/sendMessage`, {
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
