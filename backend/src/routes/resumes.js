import express from 'express'
import { z } from 'zod'
import { query } from '../lib/db.js'
import { requireAuth } from '../middleware/requireAuth.js'
import { requireRole } from '../middleware/requireRole.js'

export const resumesRouter = express.Router()

const uploadResumeSchema = z.object({
  original_filename: z.string().min(1).max(255),
  file_url: z.string().min(1)
})

// GET /resumes/me - Get current user's resumes
resumesRouter.get('/me', requireAuth, requireRole('USER'), async (req, res) => {
  const userId = Number(req.auth.sub)
  if (!Number.isFinite(userId)) return res.status(401).json({ ok: false, error: 'Invalid token payload' })

  try {
    const r = await query(
      `
      select id, original_filename, file_url, uploaded_at
      from resumes
      where account_id = $1
      order by uploaded_at desc
      `,
      [userId]
    )

    return res.json({ ok: true, resumes: r.rows })
  } catch (e) {
    return res.status(500).json({ ok: false, error: 'Failed to fetch resumes' })
  }
})

// POST /resumes/me - Upload a new resume
resumesRouter.post('/me', requireAuth, requireRole('USER'), async (req, res) => {
  const parsed = uploadResumeSchema.safeParse(req.body)
  if (!parsed.success) return res.status(400).json({ ok: false, error: 'Invalid request', issues: parsed.error.issues })

  const userId = Number(req.auth.sub)
  if (!Number.isFinite(userId)) return res.status(401).json({ ok: false, error: 'Invalid token payload' })

  const { original_filename, file_url } = parsed.data

  try {
    const r = await query(
      `
      insert into resumes (account_id, original_filename, file_url)
      values ($1, $2, $3)
      returning id, original_filename, file_url, uploaded_at
      `,
      [userId, original_filename, file_url]
    )

    return res.status(201).json({ ok: true, resume: r.rows[0] })
  } catch (e) {
    return res.status(500).json({ ok: false, error: 'Failed to upload resume' })
  }
})

// DELETE /resumes/:id - Delete a resume
resumesRouter.delete('/:id', requireAuth, requireRole('USER'), async (req, res) => {
  const resumeId = Number(req.params.id)
  if (!Number.isFinite(resumeId)) return res.status(400).json({ ok: false, error: 'Invalid resume id' })

  const userId = Number(req.auth.sub)
  if (!Number.isFinite(userId)) return res.status(401).json({ ok: false, error: 'Invalid token payload' })

  try {
    const r = await query(
      `
      delete from resumes
      where id = $1 and account_id = $2
      returning id
      `,
      [resumeId, userId]
    )

    if (r.rows.length === 0) {
      return res.status(404).json({ ok: false, error: 'Resume not found or unauthorized' })
    }

    return res.json({ ok: true })
  } catch (e) {
    return res.status(500).json({ ok: false, error: 'Failed to delete resume' })
  }
})
