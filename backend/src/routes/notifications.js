import express from 'express'
import { z } from 'zod'

import { query } from '../lib/db.js'
import { requireAuth } from '../middleware/requireAuth.js'

export const notificationsRouter = express.Router()

function clampInt(val, { min, max, fallback }) {
  const n = Number(val)
  if (!Number.isFinite(n)) return fallback
  const i = Math.floor(n)
  return Math.max(min, Math.min(max, i))
}

// GET /notifications/me?unread=true|false&limit=..&offset=..
notificationsRouter.get('/me', requireAuth, async (req, res) => {
  const accountId = Number(req.auth?.sub)
  if (!Number.isFinite(accountId)) return res.status(401).json({ ok: false, error: 'Invalid token payload' })

  const limit = clampInt(req.query.limit, { min: 1, max: 50, fallback: 20 })
  const offset = clampInt(req.query.offset, { min: 0, max: 100000, fallback: 0 })
  const unreadParam = req.query.unread
  const unread = unreadParam === undefined ? undefined : String(unreadParam).toLowerCase() === 'true'

  const where = [`n.account_id = $1`]
  const params = [accountId]
  if (unread !== undefined) {
    params.push(unread ? false : true)
    where.push(`n.is_read = $${params.length}`)
  }

  params.push(limit)
  params.push(offset)

  const r = await query(
    `
    select id, title, message, link_url, is_read, created_at
    from notifications n
    where ${where.join(' and ')}
    order by n.created_at desc
    limit $${params.length - 1}
    offset $${params.length}
    `,
    params
  )

  const cnt = await query(
    `
    select count(*)::int as total,
           count(*) filter (where is_read = false)::int as unread
    from notifications
    where account_id = $1
    `,
    [accountId]
  )

  return res.json({
    ok: true,
    notifications: r.rows,
    meta: { total: cnt.rows[0]?.total ?? 0, unread: cnt.rows[0]?.unread ?? 0, limit, offset }
  })
})

// PATCH /notifications/:id/read { is_read: true|false }
notificationsRouter.patch('/:id/read', requireAuth, async (req, res) => {
  const accountId = Number(req.auth?.sub)
  if (!Number.isFinite(accountId)) return res.status(401).json({ ok: false, error: 'Invalid token payload' })

  const id = Number(req.params.id)
  if (!Number.isFinite(id)) return res.status(400).json({ ok: false, error: 'Invalid notification id' })

  const parsed = z.object({ is_read: z.boolean() }).safeParse(req.body)
  if (!parsed.success) return res.status(400).json({ ok: false, error: 'Invalid request', issues: parsed.error.issues })

  const r = await query(
    `
    update notifications
    set is_read = $3
    where id = $1 and account_id = $2
    returning id, title, message, link_url, is_read, created_at
    `,
    [id, accountId, parsed.data.is_read]
  )

  const row = r.rows[0]
  if (!row) return res.status(404).json({ ok: false, error: 'Notification not found' })
  return res.json({ ok: true, notification: row })
})

// PATCH /notifications/read-all { is_read: true }
notificationsRouter.patch('/read-all', requireAuth, async (req, res) => {
  const accountId = Number(req.auth?.sub)
  if (!Number.isFinite(accountId)) return res.status(401).json({ ok: false, error: 'Invalid token payload' })

  const parsed = z.object({ is_read: z.boolean().default(true) }).safeParse(req.body || {})
  if (!parsed.success) return res.status(400).json({ ok: false, error: 'Invalid request', issues: parsed.error.issues })

  const r = await query(
    `
    update notifications
    set is_read = $2
    where account_id = $1
    `,
    [accountId, parsed.data.is_read]
  )

  return res.json({ ok: true, updated: r.rowCount ?? 0 })
})


