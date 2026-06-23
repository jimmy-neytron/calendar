import { requireAuthenticatedSupabase } from './client.js'

export async function savePushSubscription({ deviceId, subscription }) {
  const client = await requireAuthenticatedSupabase()
  const json = subscription.toJSON()
  return client.rpc('register_push_subscription', {
    p_device_id: deviceId,
    p_endpoint: json.endpoint,
    p_p256dh: json.keys?.p256dh,
    p_auth: json.keys?.auth,
    p_user_agent: navigator.userAgent,
  })
}

export async function removePushSubscription(deviceId) {
  const client = await requireAuthenticatedSupabase()
  return client.rpc('remove_push_subscription', {
    p_device_id: deviceId,
  })
}
