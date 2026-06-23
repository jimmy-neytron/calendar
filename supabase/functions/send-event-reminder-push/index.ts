import { createClient } from 'npm:@supabase/supabase-js@2'
import webpush from 'npm:web-push@3.6.7'

interface NotificationRow {
  id: string
  workspace_id: string
  user_id: string
  payload: {
    type?: string
    title?: string
    message?: string
    eventId?: string
    eventDate?: string
    eventTime?: string
  }
}

interface WebhookPayload {
  type: 'INSERT' | 'UPDATE' | 'DELETE'
  table: string
  schema: string
  record: NotificationRow
}

const supabaseUrl = Deno.env.get('SUPABASE_URL') ?? ''
const serviceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
const vapidPublicKey = Deno.env.get('VAPID_PUBLIC_KEY') ?? ''
const vapidPrivateKey = Deno.env.get('VAPID_PRIVATE_KEY') ?? ''
const vapidSubject = Deno.env.get('VAPID_SUBJECT') ?? 'mailto:admin@example.com'

webpush.setVapidDetails(vapidSubject, vapidPublicKey, vapidPrivateKey)

Deno.serve(async (request) => {
  if (request.method !== 'POST') {
    return new Response('Method not allowed', { status: 405 })
  }
  if (request.headers.get('authorization') !== `Bearer ${serviceRoleKey}`) {
    return new Response('Unauthorized', { status: 401 })
  }

  const webhook = await request.json() as WebhookPayload
  const notification = webhook.record
  if (
    webhook.type !== 'INSERT'
    || webhook.table !== 'notifications'
    || notification?.payload?.type !== 'event_reminder'
  ) {
    return Response.json({ sent: 0, skipped: true })
  }

  const supabase = createClient(supabaseUrl, serviceRoleKey)
  const { data: subscriptions, error } = await supabase
    .from('push_subscriptions')
    .select('id, endpoint, p256dh, auth')
    .eq('user_id', notification.user_id)
    .eq('enabled', true)

  if (error) return Response.json({ error: error.message }, { status: 500 })

  const pushPayload = JSON.stringify({
    title: notification.payload.title || 'Скоро событие',
    body: notification.payload.message || 'Открой календарь, чтобы посмотреть событие',
    icon: '/icons/icon-192.png',
    badge: '/icons/icon-192.png',
    tag: `event-reminder:${notification.id}`,
    data: {
      notificationId: notification.id,
      eventId: notification.payload.eventId,
      url: `/?event=${encodeURIComponent(notification.payload.eventId || '')}&eventDate=${encodeURIComponent(notification.payload.eventDate || '')}`,
    },
  })

  let sent = 0
  let removed = 0

  for (const subscription of subscriptions || []) {
    try {
      await webpush.sendNotification({
        endpoint: subscription.endpoint,
        keys: {
          p256dh: subscription.p256dh,
          auth: subscription.auth,
        },
      }, pushPayload)
      sent += 1
    } catch (pushError) {
      const statusCode = Number((pushError as { statusCode?: number }).statusCode || 0)
      if (statusCode === 404 || statusCode === 410) {
        await supabase.from('push_subscriptions').delete().eq('id', subscription.id)
        removed += 1
      } else {
        console.error('Web push failed', pushError)
      }
    }
  }

  return Response.json({ sent, removed })
})
