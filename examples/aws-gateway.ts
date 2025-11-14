/**
 * Example AWS Bedrock gateway handler (Node/Express).
 * Clean, hardened example that is safe to inspect and adapt.
 */
/**
 * Example AWS Bedrock gateway handler (Node/Express).
 * Clean, hardened example that is safe to inspect and adapt.
 *
 * Notes:
 * - Requires `@aws-sdk/client-bedrock-runtime` to be installed to run.
 * - Keep AWS credentials out of the frontend.
 */
import express from 'express'
import { BedrockRuntimeClient, InvokeModelCommand } from '@aws-sdk/client-bedrock-runtime'

const router = express.Router()

function safeString(v: unknown) {
  if (typeof v === 'string') return v
  try { return String(v ?? '') } catch { return '' }
}

router.post('/aws-bedrock', async (req, res) => {
  try {
    const prompt = safeString(req.body?.prompt)
    const modelId = safeString(process.env.BEDROCK_MODEL_ID)
    const region = safeString(process.env.AWS_REGION)
    if (!modelId || !region) return res.status(500).json({ error: 'Bedrock model or region not configured' })

    const client = new BedrockRuntimeClient({ region })
    const cmd = new InvokeModelCommand({
      modelId,
      body: Buffer.from(JSON.stringify({ input: prompt })),
      contentType: 'application/json',
      accept: 'application/json'
    })

    const r = await client.send(cmd)

    // Normalize response: many Bedrock responses are streamed or structured differently.
    // This best-effort example tries to extract a string `output` from common shapes.
    let out = ''
    try {
      type StreamBody = { transformToWebStream?: () => Promise<ReadableStream<Uint8Array>> }
      const maybeBody = (r as unknown as { body?: unknown }).body

      if (maybeBody && typeof (maybeBody as StreamBody).transformToWebStream === 'function') {
        const stream = await (maybeBody as StreamBody).transformToWebStream()
        const reader = stream.getReader()
        const chunks: Uint8Array[] = []
        while (true) {
          const { done, value } = await reader.read()
          if (done) break
          if (value) chunks.push(Buffer.from(value))
        }
        const buf = Buffer.concat(chunks)
        try { out = JSON.parse(buf.toString('utf8')).output } catch { out = buf.toString('utf8') }
      } else if (typeof maybeBody === 'string') {
        try { out = JSON.parse(maybeBody).output } catch { out = String(maybeBody) }
      } else {
        // Fallback: serialize the response object
        out = JSON.stringify(r)
      }
    } catch (parseErr) {
      out = String(parseErr ?? '')
    }

    res.json({ output: safeString(out) })
  } catch (err: unknown) {
    res.status(500).json({ error: String(err) })
  }
})

export default router
