import fs from 'fs'
import path from 'path'

const ARCHIVE_DIR = path.resolve(process.cwd(), 'server', '.archive')

function ensureDir(p) {
  if (!fs.existsSync(p)) fs.mkdirSync(p, { recursive: true })
}

function ymd(ts) {
  const d = new Date(ts)
  const y = d.getUTCFullYear()
  const m = String(d.getUTCMonth() + 1).padStart(2, '0')
  const da = String(d.getUTCDate()).padStart(2, '0')
  return `${y}${m}${da}`
}

export function createImmutableArchive() {
  ensureDir(ARCHIVE_DIR)
  return {
    async save(kind, record) {
      const ts = record.timestamp ? new Date(record.timestamp) : new Date()
      const day = ymd(ts)
      const dir = path.join(ARCHIVE_DIR, kind, day)
      ensureDir(dir)
      const fname = `${ts.getTime()}-${record.id || 'rec'}.json`
      const fpath = path.join(dir, fname)
      // Write-once: use flag 'wx' to avoid overwrite; mark read-only after writing
      await fs.promises.writeFile(fpath, JSON.stringify(record, null, 2), { flag: 'wx' })
      await fs.promises.chmod(fpath, 0o444)
      return { path: fpath }
    },
    async status() {
      // Count files for a quick health check
      const res = { totalFiles: 0, kinds: {} }
      const kinds = ['audit', 'metrics']
      for (const k of kinds) {
        const kdir = path.join(ARCHIVE_DIR, k)
        let count = 0
        try {
          const days = fs.existsSync(kdir) ? await fs.promises.readdir(kdir) : []
          for (const day of days) {
            const ddir = path.join(kdir, day)
            const files = await fs.promises.readdir(ddir)
            count += files.length
          }
        } catch {}
        res.kinds[k] = count
        res.totalFiles += count
      }
      return res
    },
  }
}
