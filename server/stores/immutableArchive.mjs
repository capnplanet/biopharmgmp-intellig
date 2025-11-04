import fs from 'fs'
import path from 'path'
import crypto from 'crypto'

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
      const body = Buffer.from(JSON.stringify(record, null, 2), 'utf8')
      // Write-once: use flag 'wx' to avoid overwrite; mark read-only after writing
      await fs.promises.writeFile(fpath, body, { flag: 'wx' })
      await fs.promises.chmod(fpath, 0o444)
      try {
        // Sidecar checksum for verifiability
        const sum = crypto.createHash('sha256').update(body).digest('hex')
        const sumPath = fpath + '.sha256'
        await fs.promises.writeFile(sumPath, sum + '  ' + path.basename(fpath) + '\n', { flag: 'wx' })
        await fs.promises.chmod(sumPath, 0o444)
      } catch {}
      return { path: fpath }
    },
    async status() {
      // Count files and verify checksums
      const res = { root: ARCHIVE_DIR, totalFiles: 0, kinds: {}, verify: { ok: true, checked: 0, failed: [] } }
      const kinds = ['audit', 'metrics']
      for (const k of kinds) {
        const kdir = path.join(ARCHIVE_DIR, k)
        let count = 0
        try {
          const days = fs.existsSync(kdir) ? await fs.promises.readdir(kdir) : []
          for (const day of days) {
            const ddir = path.join(kdir, day)
            const files = await fs.promises.readdir(ddir)
            for (const f of files) {
              if (!f.endsWith('.json')) continue
              count++
              try {
                const p = path.join(ddir, f)
                const body = await fs.promises.readFile(p)
                const got = crypto.createHash('sha256').update(body).digest('hex')
                const sumPath = p + '.sha256'
                let expect = ''
                try {
                  const s = await fs.promises.readFile(sumPath, 'utf8')
                  expect = (s.split(/\s+/)[0] || '').trim()
                } catch {}
                res.verify.checked++
                if (!expect || expect !== got) {
                  res.verify.ok = false
                  res.verify.failed.push({ file: p, expect, got })
                }
              } catch (err) {
                res.verify.ok = false
                res.verify.failed.push({ file: path.join(ddir, f), error: String(err) })
              }
            }
          }
        } catch {}
        res.kinds[k] = count
        res.totalFiles += count
      }
      return res
    },
  }
}
