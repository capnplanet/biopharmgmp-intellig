import fs from 'fs'
import path from 'path'
import crypto from 'crypto'

const DEFAULT_ARCHIVE_DIR = path.resolve(process.cwd(), 'server', '.archive')

function ensureDir(p) {
  if (!fs.existsSync(p)) fs.mkdirSync(p, { recursive: true })
}

function sha256(buf) {
  return crypto.createHash('sha256').update(buf).digest('hex')
}

function ymdDirs(ts) {
  const d = new Date(ts)
  const yyyy = String(d.getUTCFullYear())
  const mm = String(d.getUTCMonth() + 1).padStart(2, '0')
  const dd = String(d.getUTCDate()).padStart(2, '0')
  return { yyyy, mm, dd }
}

export function createImmutableArchive({ baseDir } = {}) {
  const root = baseDir || process.env.ARCHIVE_DIR || DEFAULT_ARCHIVE_DIR
  ensureDir(root)
  return {
    /**
     * Archive a JSON-serializable object under {root}/YYYY/MM/DD/{type}/{id}-{ts}-{hash}.json
     * Returns the written file path and checksum. Files are marked read-only (0444).
     */
    async archiveObject(type, id, payload) {
      const ts = new Date(payload?.timestamp || Date.now()).toISOString()
      const { yyyy, mm, dd } = ymdDirs(ts)
      const dir = path.join(root, yyyy, mm, dd, type)
      ensureDir(dir)
      const body = Buffer.from(JSON.stringify(payload, null, 2), 'utf8')
      const sum = sha256(body)
      const safeId = String(id || 'unknown').replace(/[^A-Za-z0-9_-]/g, '-')
      const name = `${safeId}-${ts.replace(/[:.]/g, '-')}-${sum}.json`
      const filePath = path.join(dir, name)
      if (fs.existsSync(filePath)) return { filePath, checksum: sum, existed: true }
      fs.writeFileSync(filePath, body, { flag: 'wx' })
      try {
        // best-effort set to read-only (WORM-like)
        fs.chmodSync(filePath, 0o444)
      } catch {}
      // sidecar checksum for external verification if needed
      try {
        fs.writeFileSync(filePath + '.sha256', sum + '  ' + path.basename(filePath) + '\n', { flag: 'wx' })
        fs.chmodSync(filePath + '.sha256', 0o444)
      } catch {}
      return { filePath, checksum: sum, existed: false }
    },

    /**
     * Verify all archived files by recomputing checksums.
     * Returns { ok, total, failed: [{ file, expect, got }] }
     */
    async verify() {
      const failed = []
      let total = 0
      const walk = (dir) => {
        const entries = fs.existsSync(dir) ? fs.readdirSync(dir, { withFileTypes: true }) : []
        for (const e of entries) {
          const p = path.join(dir, e.name)
          if (e.isDirectory()) walk(p)
          else if (e.isFile() && e.name.endsWith('.json')) {
            total++
            try {
              const buf = fs.readFileSync(p)
              const got = sha256(buf)
              const expect = path.basename(p).split('-').pop()?.replace(/\.json$/, '')
              if (!expect || expect !== got) failed.push({ file: p, expect, got })
            } catch (err) {
              failed.push({ file: p, error: String(err) })
            }
          }
        }
      }
      walk(root)
      return { ok: failed.length === 0, total, failed }
    },

    get root() { return root }
  }
}
