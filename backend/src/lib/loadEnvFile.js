import fs from 'fs'
import path from 'path'

/**
 * Loads `backend/.env` manually and supports both:
 * - KEY=value
 * - KEY : value
 *
 * This is needed because some editors/users write `.env` with ":" which `dotenv` won't parse.
 * We only set process.env[key] if it's not already set.
 */
export function loadEnvFileIfPresent() {
  try {
    const candidates = [
      path.join(process.cwd(), '.env'),
      // if server was started from repo root, look for backend/.env
      path.join(process.cwd(), 'backend', '.env')
    ]

    const envPath = candidates.find((p) => fs.existsSync(p))
    if (!envPath) return { loaded: false, candidates }

    const raw = fs.readFileSync(envPath, 'utf8')
    const lines = raw.split(/\r?\n/)
    const keysLoaded = []
    const linesParsed = { total: lines.length, matched: 0 }

    for (const line of lines) {
      const trimmed = line.trim()
      if (!trimmed || trimmed.startsWith('#')) continue

      // Robust split: KEY (=|:|：) VALUE  (don't break on URL schemes like https://)
      // Note: we accept fullwidth colon "：" because some keyboards insert it.
      const m = trimmed.match(/^([^=:#：]+?)\s*(=|:|：)\s*(.*)$/)
      if (!m) continue
      linesParsed.matched += 1

      let key = (m[1] || '').trim().replace(/^\uFEFF/, '')
      let value = (m[3] || '').trim()

      if (!key) continue
      if (value?.startsWith('"') && value?.endsWith('"')) value = value.slice(1, -1)
      if (value?.startsWith("'") && value?.endsWith("'")) value = value.slice(1, -1)

      // Alias mapping (accept user-friendly keys)
      const normalized = key.replace(/\s+/g, '_')
      const upper = normalized.toUpperCase()
      const aliasMap = {
        CONNECTION_STRING: 'DATABASE_URL',
        DATABASE_CONNECTION_STRING: 'DATABASE_URL'
      }
      const finalKey = aliasMap[upper] || normalized

      if (process.env[finalKey] === undefined) process.env[finalKey] = value
      keysLoaded.push(finalKey)
    }
    return { loaded: true, path: envPath, candidates, keysLoaded, linesParsed }
  } catch {
    return { loaded: false, candidates: [] }
  }
}


