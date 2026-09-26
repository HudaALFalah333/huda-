import { query } from './db.js'
import { sendSms } from './sms.js'

export async function createNotification({ account_id, title, message, link_url = null }) {
  const r = await query(
    `
    insert into notifications (account_id, title, message, link_url)
    values ($1, $2, $3, $4)
    returning id, account_id, title, message, link_url, is_read, created_at
    `,
    [account_id, title, message, link_url]
  )
  const notif = r.rows[0]

  // Best-effort SMS (never block DB notification)
  try {
    const phoneR = await query(`select phone from accounts where id = $1`, [account_id])
    const phone = phoneR.rows[0]?.phone || ''
    await sendSms({
      to: phone,
      message: `${title}\n${message}`.trim()
    })
  } catch {
    // ignore
  }

  return notif
}


