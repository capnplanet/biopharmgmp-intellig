import fs from 'fs'
import path from 'path'
import crypto from 'crypto'

const DATA_DIR = path.resolve(process.cwd(), 'server', '.data')
const AUDIT_FILE = path.join(DATA_DIR, 'audit.jsonl')

function ensureDir() {
  if (!fs.existsSync(DATA_DIR)) fs.mkdirSync(DATA_DIR, { recursive: true })
}

function hashRecord(prevHash, payload) {
  const h = crypto.createHash('sha256')
  h.update(String(prevHash || ''))
  h.update(JSON.stringify(payload))
  return h.digest('hex')
}

function readTailHash() {
  try {
    if (!fs.existsSync(AUDIT_FILE)) return null
    const fd = fs.openSync(AUDIT_FILE, 'r')
    const stat = fs.fstatSync(fd)
    const size = stat.size
    const chunkSize = 8192
    let pos = Math.max(0, size - chunkSize)
    let data = ''
    while (pos >= 0) {
      const buf = Buffer.alloc(Math.min(chunkSize, size))
      const bytes = fs.readSync(fd, buf, 0, buf.length, pos)
      data = buf.slice(0, bytes).toString('utf8') + data
      const lines = data.trim().split('\n').filter(Boolean)
      for (let i = lines.length - 1; i >= 0; i--) {
        try {
          const rec = JSON.parse(lines[i])
          fs.closeSync(fd)
          return rec.hash || null
        } catch {}
      }
      if (pos === 0) break
      pos = Math.max(0, pos - chunkSize)
    }
    fs.closeSync(fd)
    return null
  } catch {
    return null
  }
}

export function createAuditStore() {
  ensureDir()
  return {
    async append(event) {
      const base = {
        id: event.id || `AUD-${Date.now()}`,
        timestamp: event.timestamp || new Date().toISOString(),
        userId: event.userId || 'user@unknown',
        userRole: event.userRole || 'User',
        action: event.action,
        module: event.module,
        details: event.details || '',
        recordId: event.recordId || null,
        ipAddress: event.ipAddress || '',
        sessionId: event.sessionId || '',
        outcome: event.outcome || 'success',
        digitalSignature: event.digitalSignature || null,
      }
      const prevHash = readTailHash()
      const hash = hashRecord(prevHash, base)
      const stored = { ...base, hash, prevHash }
      fs.appendFileSync(AUDIT_FILE, JSON.stringify(stored) + '\n', 'utf8')
      return stored
    },
    async query({ from, to, limit = 500 } = {}) {
      if (!fs.existsSync(AUDIT_FILE)) return []
      const lines = fs.readFileSync(AUDIT_FILE, 'utf8').split('\n').filter(Boolean)
      const items = []
      for (let i = lines.length - 1; i >= 0; i--) {
        try {
          const rec = JSON.parse(lines[i])
          const ts = new Date(rec.timestamp).getTime()
          if (from && ts < from.getTime()) continue
          if (to && ts > to.getTime()) continue
          items.push(rec)
          if (items.length >= limit) break
        } catch {}
      }
      return items
    },
    async verify() {
      if (!fs.existsSync(AUDIT_FILE)) return { valid: true, n: 0 }
      const lines = fs.readFileSync(AUDIT_FILE, 'utf8').split('\n').filter(Boolean)
      let prev = null
      for (let i = 0; i < lines.length; i++) {
        const rec = JSON.parse(lines[i])
        const expect = hashRecord(prev, {
          id: rec.id,
          timestamp: rec.timestamp,
          userId: rec.userId,
          userRole: rec.userRole,
          action: rec.action,
          module: rec.module,
          details: rec.details,
          recordId: rec.recordId,
          ipAddress: rec.ipAddress,
          sessionId: rec.sessionId,
          outcome: rec.outcome,
          digitalSignature: rec.digitalSignature,
        })
        if (expect !== rec.hash) {
          return { valid: false, atIndex: i, message: 'Hash chain broken' }
        }
        prev = rec.hash
      }
      return { valid: true, n: lines.length }
    }
  }
}
