/**
 * Example Azure gateway handler (Node/Express) that securely proxies
 * requests from the SPA to Azure OpenAI. Keep API keys on the server.
 *
 * This example is intentionally minimal and focuses on security and
 * normalization: it returns `{ output: string }` to the client.
 */
import express from 'express'
import fetch from 'node-fetch'

const router = express.Router()

function safeString(v: unknown) {
  if (typeof v === 'string') return v
  try { return String(v ?? '') } catch { return '' }
}

router.post('/azure-llm', async (req, res) => {
  try {
    const prompt = safeString(req.body?.prompt)
    const model = safeString(req.body?.model) || safeString(process.env.AZURE_OPENAI_DEPLOYMENT)
    const endpoint = safeString(process.env.AZURE_OPENAI_ENDPOINT)
    const apiKey = safeString(process.env.AZURE_OPENAI_API_KEY)
    const apiVersion = process.env.AZURE_OPENAI_API_VERSION || '2023-05-15'

    if (!endpoint || !apiKey || !model) return res.status(500).json({ error: 'Gateway not configured' })

    const url = `${endpoint.replace(/\/$/, '')}/openai/deployments/${encodeURIComponent(model)}/chat/completions?api-version=${encodeURIComponent(apiVersion)}`

    // Minimal request validation and timeout
    const controller = new AbortController()
    const timeoutMs = Number(process.env.AZURE_GATEWAY_TIMEOUT_MS || 15000)
    const timeout = setTimeout(() => controller.abort(), timeoutMs)

    const r = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'api-key': apiKey },
      body: JSON.stringify({ messages: [{ role: 'user', content: prompt }], temperature: 0.2 }),
      signal: controller.signal
    })
    clearTimeout(timeout)

    if (!r.ok) {
      const text = await r.text().catch(() => '')
      return res.status(502).json({ error: `Upstream error ${r.status}`, detail: text })
    }

    // Try to parse JSON; if not JSON, return raw text.
    const ct = r.headers.get('content-type') || ''
    let out = ''
    if (ct.includes('application/json')) {
      const json = await r.json()
      out = json?.choices?.[0]?.message?.content ?? JSON.stringify(json)
    } else {
      out = await r.text()
    }

    res.json({ output: safeString(out) })
  } catch (err: unknown) {
    if (typeof err === 'object' && err !== null && 'name' in err && (err as { name?: unknown }).name === 'AbortError') {
      return res.status(504).json({ error: 'Gateway timeout' })
    }
    res.status(500).json({ error: String(err) })
  }
})

export default router
