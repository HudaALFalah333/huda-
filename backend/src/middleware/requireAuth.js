import { verifyToken } from '../lib/jwt.js'

function getBearerToken(req) {
  const h = req.headers.authorization || ''
  const [type, token] = h.split(' ')
  if (type !== 'Bearer' || !token) return null
  return token
}

export function requireAuth(req, res, next) {
  try {
    const token = getBearerToken(req)
    if (!token) return res.status(401).json({ ok: false, error: 'Missing Authorization Bearer token' })

    const payload = verifyToken(token)
    req.auth = payload
    return next()
  } catch (e) {
    return res.status(401).json({ ok: false, error: 'Invalid or expired token' })
  }
}


