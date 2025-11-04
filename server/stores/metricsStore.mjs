import fs from 'fs'
import path from 'path'

const DATA_DIR = path.resolve(process.cwd(), 'server', '.data')
const METRICS_FILE = path.join(DATA_DIR, 'metrics.jsonl')

function ensureDir() {
  if (!fs.existsSync(DATA_DIR)) fs.mkdirSync(DATA_DIR, { recursive: true })
}

export function createMetricsStore() {
  ensureDir()
  return {
    async append(point) {
      const base = {
        t: typeof point.t === 'number' ? point.t : Date.now(),
        id: point.id,
        n: point.n ?? 0,
        auroc: point.auroc ?? 0,
        brier: point.brier ?? 0,
        ece: point.ece ?? 0,
        threshold: point.threshold ?? 0.5,
      }
      fs.appendFileSync(METRICS_FILE, JSON.stringify(base) + '\n', 'utf8')
      return base
    },
    async query({ from, to, limit = 1000 } = {}) {
      if (!fs.existsSync(METRICS_FILE)) return []
      const lines = fs.readFileSync(METRICS_FILE, 'utf8').split('\n').filter(Boolean)
      const items = []
      for (let i = lines.length - 1; i >= 0; i--) {
        try {
          const rec = JSON.parse(lines[i])
          if (from && rec.t < from) continue
          if (to && rec.t > to) continue
          items.push(rec)
          if (items.length >= limit) break
        } catch {}
      }
      return items
    },
  }
}
