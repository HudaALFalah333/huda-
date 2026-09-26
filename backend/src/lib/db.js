import pg from 'pg'
import { env, envFile } from './env.js'

const { Pool } = pg

export function hasPgConfig() {
  return Boolean(env.DATABASE_URL)
}

// Supabase Postgres requires SSL. If you use a local Postgres, SSL will still work.
// Remove sslmode from connection string to avoid conflicts, we handle SSL via Pool config
function normalizeConnectionString(url) {
  if (!url) return url
  // Remove sslmode parameter to avoid SSL verification conflicts with Supabase
  return url.replace(/[?&]sslmode=[^&]*/g, '').replace(/\?$/, '')
}

export const pool = hasPgConfig()
  ? new Pool({
      connectionString: normalizeConnectionString(env.DATABASE_URL),
      ssl: {
        rejectUnauthorized: false // Allow self-signed certificates (Supabase uses these)
      }
    })
  : null

export async function query(text, params) {
  if (!pool) throw new Error('DATABASE_URL is missing (required for pg connection)')
  return pool.query(text, params)
}

export async function healthCheck() {
  // Prefer direct DB connection if DATABASE_URL exists.
  if (hasPgConfig()) {
    const r = await query('select now() as now')
    return { mode: 'pg', ok: true, dbTime: r.rows[0]?.now ?? null }
  }

  // Fallback: Supabase HTTP REST check (uses anon key or service role key).
  if (!env.SUPABASE_URL) {
    return {
      mode: 'none',
      ok: false,
      error: 'Missing DATABASE_URL and SUPABASE_URL',
      debug: {
        cwd: process.cwd(),
        envFile
      }
    }
  }

  const key = env.SUPABASE_SERVICE_ROLE_KEY || env.SUPABASE_ANON_KEY
  if (!key) return { mode: 'supabase-rest', ok: false, error: 'Missing SUPABASE_ANON_KEY (or SUPABASE_SERVICE_ROLE_KEY)' }

  const url = `${env.SUPABASE_URL}/rest/v1/accounts?select=id&limit=1`
  const resp = await fetch(url, {
    headers: {
      apikey: key,
      authorization: `Bearer ${key}`
    }
  })

  if (!resp.ok) {
    const txt = await resp.text().catch(() => '')
    return { mode: 'supabase-rest', ok: false, error: `Supabase REST failed (${resp.status})`, details: txt.slice(0, 500) }
  }

  return { mode: 'supabase-rest', ok: true }
}



