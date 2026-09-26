import { env } from './env.js'

function normalizeE164(phone) {
  if (!phone) return null
  const p = String(phone).trim()
  if (!p) return null
  // Minimal check: E.164 should start with '+'
  if (!p.startsWith('+')) return null
  if (p.length < 8 || p.length > 20) return null
  return p
}

export async function sendSms({ to, message }) {
  if (!env.SMS_ENABLED) return { ok: false, skipped: true, reason: 'SMS_ENABLED=false' }

  const toE164 = normalizeE164(to)
  if (!toE164) return { ok: false, skipped: true, reason: 'Invalid or missing E.164 phone (must start with +)' }
  if (!message || !String(message).trim()) return { ok: false, skipped: true, reason: 'Empty message' }

  const provider = String(env.SMS_PROVIDER || 'none').toLowerCase()

  if (provider === 'none') return { ok: false, skipped: true, reason: 'SMS_PROVIDER=none' }

  if (provider === 'console') {
    // eslint-disable-next-line no-console
    console.log('[SMS:console]', { to: toE164, message: String(message) })
    return { ok: true, provider: 'console' }
  }

  if (provider === 'twilio') {
    if (!env.TWILIO_ACCOUNT_SID || !env.TWILIO_AUTH_TOKEN || !env.TWILIO_FROM_NUMBER) {
      return { ok: false, skipped: true, reason: 'Missing TWILIO_* env vars' }
    }

    const { default: twilio } = await import('twilio')
    const client = twilio(env.TWILIO_ACCOUNT_SID, env.TWILIO_AUTH_TOKEN)
    await client.messages.create({
      from: env.TWILIO_FROM_NUMBER,
      to: toE164,
      body: String(message)
    })
    return { ok: true, provider: 'twilio' }
  }

  return { ok: false, skipped: true, reason: `Unknown SMS_PROVIDER=${provider}` }
}


