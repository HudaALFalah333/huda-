import express from 'express'
import bcrypt from 'bcryptjs'
import { z } from 'zod'

import { query } from '../lib/db.js'
import { signToken } from '../lib/jwt.js'
import { requireAuth } from '../middleware/requireAuth.js'

export const authRouter = express.Router()

const signupSchema = z
  .object({
    role: z.enum(['USER', 'HR']),
    first_name: z.string().min(1).max(80).optional(),
    last_name: z.string().min(1).max(80).optional(),
    full_name: z.string().min(1).max(160).optional(),
    email: z.string().email().max(255),
    phone: z.string().min(3).max(40).optional(),
    password: z.string().min(6).max(200),
    resume: z
      .object({
        original_filename: z.string().min(1).max(255),
        file_url: z.string().min(1)
      })
      .optional()
  })
  .superRefine((val, ctx) => {
    const hasFull = Boolean(val.full_name && val.full_name.trim())
    const hasFirst = Boolean(val.first_name && val.first_name.trim())
    const hasLast = Boolean(val.last_name && val.last_name.trim())
    if (!hasFull && !(hasFirst && hasLast)) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: 'Name is required: provide full_name OR (first_name and last_name)'
      })
    }
  })

const loginSchema = z.object({
  role: z.enum(['USER', 'HR']),
  // Allow login with either email or phone (UI supports both)
  email: z.string().min(1).max(255),
  password: z.string().min(1).max(200)
})

authRouter.post('/signup', async (req, res) => {
  const parsed = signupSchema.safeParse(req.body)
  if (!parsed.success) return res.status(400).json({ ok: false, error: 'Invalid request', issues: parsed.error.issues })

  const { role, email, password, first_name, last_name, full_name, phone, resume } = parsed.data
  const computedFullName =
    (full_name && full_name.trim()) ||
    [first_name, last_name].filter(Boolean).join(' ').trim() ||
    null
  const password_hash = await bcrypt.hash(password, 10)

  try {
    const r = await query(
      `
      insert into accounts (role, first_name, last_name, full_name, email, phone, password_hash)
      values ($1, $2, $3, $4, $5, $6, $7)
      returning id, role, email, full_name, first_name, last_name, created_at
      `,
      [role, first_name ?? null, last_name ?? null, computedFullName, email, phone ?? null, password_hash]
    )

    const account = r.rows[0]

    // Create role-specific profile row (optional but nice)
    if (role === 'USER') {
      await query(`insert into user_profiles (account_id) values ($1) on conflict (account_id) do nothing`, [account.id])
    } else {
      await query(`insert into hr_profiles (account_id) values ($1) on conflict (account_id) do nothing`, [account.id])
    }

    // Optional: store resume metadata on signup (file upload handled later)
    if (role === 'USER' && resume) {
      await query(
        `
        insert into resumes (account_id, original_filename, file_url)
        values ($1, $2, $3)
        `,
        [account.id, resume.original_filename, resume.file_url]
      )
    }

    const token = signToken({ sub: String(account.id), role: account.role })
    return res.status(201).json({ ok: true, token, account })
  } catch (e) {
    const msg = e?.message || String(e)
    // crude uniqueness handling
    if (msg.toLowerCase().includes('duplicate') || msg.toLowerCase().includes('unique')) {
      return res.status(409).json({ ok: false, error: 'Email or phone already exists' })
    }
    return res.status(500).json({ ok: false, error: 'Signup failed' })
  }
})

authRouter.post('/login', async (req, res) => {
  const parsed = loginSchema.safeParse(req.body)
  if (!parsed.success) return res.status(400).json({ ok: false, error: 'Invalid request', issues: parsed.error.issues })

  const { role, email, password } = parsed.data
  const identifierRaw = String(email || '').trim()
  const identifier = identifierRaw.includes('@') ? identifierRaw : identifierRaw.replaceAll(' ', '')

  const r = await query(
    `
    select id, role, email, full_name, first_name, last_name, password_hash
    from accounts
    where email = $1 or phone = $1
    limit 1
    `,
    [identifier]
  )
  const acc = r.rows[0]
  if (!acc) return res.status(401).json({ ok: false, error: 'Invalid credentials' })
  if (acc.role !== role) return res.status(403).json({ ok: false, error: `Account role is ${acc.role}` })

  const ok = await bcrypt.compare(password, acc.password_hash)
  if (!ok) return res.status(401).json({ ok: false, error: 'Invalid credentials' })

  const token = signToken({ sub: String(acc.id), role: acc.role })
  delete acc.password_hash
  return res.json({ ok: true, token, account: acc })
})

authRouter.get('/me', requireAuth, async (req, res) => {
  const accountId = Number(req.auth?.sub)
  if (!accountId) return res.status(401).json({ ok: false, error: 'Invalid token payload' })

  const r = await query(
    `
    select id, role, email, full_name, first_name, last_name, phone, profile_image_url, created_at, updated_at
    from accounts
    where id = $1
    `,
    [accountId]
  )
  const acc = r.rows[0]
  if (!acc) return res.status(404).json({ ok: false, error: 'Account not found' })

  return res.json({ ok: true, account: acc })
})

const updateProfileImageSchema = z.object({
  profile_image_url: z.string()
    .max(10000000) // Allow up to ~10MB for base64 images
    .refine(
      (val) => {
        if (!val) return true // optional
        // Accept regular URLs or base64 data URLs
        return val.startsWith('http://') || 
               val.startsWith('https://') || 
               val.startsWith('data:image/')
      },
      { message: 'Must be a valid URL or base64 data URL' }
    )
    .optional()
})

authRouter.patch('/me', requireAuth, async (req, res) => {
  const accountId = Number(req.auth?.sub)
  if (!accountId) return res.status(401).json({ ok: false, error: 'Invalid token payload' })

  const parsed = updateProfileImageSchema.safeParse(req.body)
  if (!parsed.success) return res.status(400).json({ ok: false, error: 'Invalid request', issues: parsed.error.issues })

  try {
    const r = await query(
      `
      update accounts
      set profile_image_url = $1, updated_at = NOW()
      where id = $2
      returning id, role, email, full_name, first_name, last_name, phone, profile_image_url, created_at, updated_at
      `,
      [parsed.data.profile_image_url || null, accountId]
    )
    const acc = r.rows[0]
    if (!acc) return res.status(404).json({ ok: false, error: 'Account not found' })

    return res.json({ ok: true, account: acc })
  } catch (e) {
    return res.status(500).json({ ok: false, error: 'Failed to update profile image' })
  }
})

