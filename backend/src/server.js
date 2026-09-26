import express from 'express'
import cors from 'cors'

import { env } from './lib/env.js'
import { healthCheck } from './lib/db.js'
import { authRouter } from './routes/auth.js'
import { jobsRouter } from './routes/jobs.js'
import { applicationsRouter } from './routes/applications.js'
import { interviewsRouter } from './routes/interviews.js'
import { notificationsRouter } from './routes/notifications.js'
import { resumesRouter } from './routes/resumes.js'
import { dashboardRouter } from './routes/dashboard.js'

const app = express()

app.use(
  cors({
    origin: env.CORS_ORIGIN,
    credentials: true
  })
)
app.use(express.json({ limit: '2mb' }))

app.get('/health', async (_req, res) => {
  try {
    const hc = await healthCheck()
    if (!hc.ok) return res.status(500).json(hc)
    return res.json(hc)
  } catch (e) {
    return res.status(500).json({ ok: false, error: e?.message || 'Health check failed' })
  }
})

app.use('/auth', authRouter)
app.use('/jobs', jobsRouter)
app.use('/applications', applicationsRouter)
app.use('/interviews', interviewsRouter)
app.use('/notifications', notificationsRouter)
app.use('/resumes', resumesRouter)
app.use('/dashboard', dashboardRouter)

app.listen(env.PORT, () => {
  // eslint-disable-next-line no-console
  console.log(`Backend running on http://localhost:${env.PORT}`)
})



