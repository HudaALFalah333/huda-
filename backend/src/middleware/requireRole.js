export function requireRole(role) {
  return function requireRoleMiddleware(req, res, next) {
    const actual = req.auth?.role
    if (!actual) return res.status(401).json({ ok: false, error: 'Missing auth payload' })
    if (actual !== role) return res.status(403).json({ ok: false, error: `Requires role ${role}` })
    return next()
  }
}


