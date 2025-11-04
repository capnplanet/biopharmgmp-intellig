import express from 'express'
import cors from 'cors'
import { createAuditStore } from './stores/auditStore.mjs'
import { createMetricsStore } from './stores/metricsStore.mjs'
import { createImmutableArchive } from './stores/immutableArchive.mjs'

const PORT = process.env.PORT ? Number(process.env.PORT) : 5000
const AUTH_TOKEN = process.env.AUTH_TOKEN || ''
const RBAC_ENABLED = String(process.env.RBAC_ENABLED || 'false').toLowerCase() === 'true'
const ARCHIVE_ENABLED = String(process.env.ARCHIVE_ENABLED || 'false').toLowerCase() === 'true'

const app = express()
app.use(cors())
app.use(express.json({ limit: '1mb' }))

// Optional token-based auth (non-breaking defaults). If AUTH_TOKEN is set,
// require header Authorization: Bearer <token> for mutating endpoints.
function requireAuth(req, res, next) {
  if (!AUTH_TOKEN) return next() // disabled by default
  const h = String(req.headers['authorization'] || '')
  if (!h.startsWith('Bearer ')) return res.status(401).json({ ok: false, error: 'Unauthorized' })
  const token = h.slice('Bearer '.length)
  if (token !== AUTH_TOKEN) return res.status(401).json({ ok: false, error: 'Unauthorized' })
  return next()
}

// Optional RBAC via X-User-Role header. Disabled by default.
function requireRole(roles = []) {
  return (req, res, next) => {
    if (!RBAC_ENABLED) return next()
    if (!roles || roles.length === 0) return next()
    const role = String(req.headers['x-user-role'] || '')
    if (!role || !roles.includes(role)) return res.status(403).json({ ok: false, error: 'Forbidden' })
    return next()
  }
}

// In-memory + file-backed stores (JSONL with hash chain for audit)
const audit = createAuditStore()
const metrics = createMetricsStore()
const archive = createImmutableArchive()

app.get('/api/health', (req, res) => {
  res.json({ ok: true, service: 'biopharmgmp-api', time: new Date().toISOString(), version: '0.1.0' })
})

app.post('/api/audit', requireAuth, requireRole(['Admin','Quality Approver','System']), async (req, res) => {
  try {
    const event = req.body
    if (!event || !event.action || !event.module) {
      return res.status(400).json({ ok: false, error: 'Invalid audit event' })
    }
    const stored = await audit.append(event)
    if (ARCHIVE_ENABLED) {
      try { await archive.save('audit', stored) } catch { /* non-blocking */ }
    }
    res.json({ ok: true, event: stored })
  } catch (err) {
    console.error(err)
    res.status(500).json({ ok: false, error: 'Failed to append audit event' })
  }
})

app.get('/api/audit', async (req, res) => {
  try {
    const { from, to, limit } = req.query
    const items = await audit.query({
      from: from ? new Date(String(from)) : undefined,
      to: to ? new Date(String(to)) : undefined,
      limit: limit ? Number(limit) : 500,
    })
    res.json({ ok: true, events: items })
  } catch (err) {
    console.error(err)
    res.status(500).json({ ok: false, error: 'Failed to read audit events' })
  }
})

app.get('/api/audit/verify', async (req, res) => {
  try {
    const result = await audit.verify()
    res.json({ ok: true, ...result })
  } catch (err) {
    console.error(err)
    res.status(500).json({ ok: false, error: 'Failed to verify audit log' })
  }
})

app.post('/api/metrics', requireAuth, requireRole(['Admin','System']), async (req, res) => {
  try {
    const point = req.body
    const stored = await metrics.append(point)
    if (ARCHIVE_ENABLED) {
      try { await archive.save('metrics', stored) } catch { /* non-blocking */ }
    }
    res.json({ ok: true, point: stored })
  } catch (err) {
    console.error(err)
    res.status(500).json({ ok: false, error: 'Failed to append metrics point' })
  }
})

app.get('/api/metrics', async (req, res) => {
  try {
    const { from, to, limit } = req.query
    const points = await metrics.query({
      from: from ? Number(from) : undefined,
      to: to ? Number(to) : undefined,
      limit: limit ? Number(limit) : 1000,
    })
    res.json({ ok: true, points })
  } catch (err) {
    console.error(err)
    res.status(500).json({ ok: false, error: 'Failed to read metrics' })
  }
})

// E-sign verification endpoint: computes a SHA-256 signature over userId|reason|timestamp.
// In production, integrate with IdP/PKI/HSM. Here it returns a deterministic signature.
import crypto from 'node:crypto'
app.post('/api/esign/verify', requireAuth, requireRole(['Admin','Quality Approver','Supervisor']), async (req, res) => {
  try {
    const { userId, reason, timestamp } = req.body || {}
    if (!userId || !reason) return res.status(400).json({ ok: false, error: 'Missing fields' })
    const ts = timestamp ? new Date(timestamp).toISOString() : new Date().toISOString()
    const payload = `${userId}|${reason}|${ts}`
    const sig = crypto.createHash('sha256').update(payload).digest('hex')
    res.json({ ok: true, signature: `SHA256:${sig}`, timestamp: ts })
  } catch (err) {
    console.error(err)
    res.status(500).json({ ok: false, error: 'Failed to verify e-sign' })
  }
})

// Archive status endpoint
app.get('/api/audit/archive/status', async (req, res) => {
  try {
    const status = await archive.status()
    res.json({ ok: true, ...status, enabled: ARCHIVE_ENABLED })
  } catch (err) {
    console.error(err)
    res.status(500).json({ ok: false, error: 'Failed to read archive status' })
  }
})

app.listen(PORT, () => {
  console.log(`[api] listening on http://localhost:${PORT}`)
})
