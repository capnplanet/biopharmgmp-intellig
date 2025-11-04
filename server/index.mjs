import express from 'express'
import cors from 'cors'
import { createAuditStore } from './stores/auditStore.mjs'
import { createMetricsStore } from './stores/metricsStore.mjs'

const PORT = process.env.PORT ? Number(process.env.PORT) : 5000

const app = express()
app.use(cors())
app.use(express.json({ limit: '1mb' }))

// In-memory + file-backed stores (JSONL with hash chain for audit)
const audit = createAuditStore()
const metrics = createMetricsStore()

app.get('/api/health', (req, res) => {
  res.json({ ok: true, service: 'biopharmgmp-api', time: new Date().toISOString(), version: '0.1.0' })
})

app.post('/api/audit', async (req, res) => {
  try {
    const event = req.body
    if (!event || !event.action || !event.module) {
      return res.status(400).json({ ok: false, error: 'Invalid audit event' })
    }
    const stored = await audit.append(event)
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

app.post('/api/metrics', async (req, res) => {
  try {
    const point = req.body
    const stored = await metrics.append(point)
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

app.listen(PORT, () => {
  console.log(`[api] listening on http://localhost:${PORT}`)
})
