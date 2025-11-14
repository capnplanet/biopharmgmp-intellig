import type { SparkAPI } from '@/types/spark'
// Minimal LLM gateway provider scaffold
// Registers window.spark to forward prompts to your gateway endpoint (cloud or on‑prem).

export type LLMGatewayOptions = {
  endpoint: string // e.g., '/api/llm' or full https://host/path
  token?: string // optional bearer token; prefer cookie-based auth when possible
  model?: string // default model name to pass through
}

function buildPrompt(strings: TemplateStringsArray, ...values: unknown[]): string {
  let out = ''
  for (let i = 0; i < strings.length; i++) {
    out += strings[i]
    if (i < values.length) out += String(values[i])
  }
  return out
}

async function callLLMGateway(endpoint: string, token: string | undefined, payload: unknown): Promise<string> {
  const headers: Record<string, string> = { 'Content-Type': 'application/json' }
  if (token) headers['Authorization'] = `Bearer ${token}`
  const res = await fetch(endpoint, { method: 'POST', headers, body: JSON.stringify(payload) })
  if (!res.ok) throw new Error(`LLM gateway ${res.status}`)
  const ct = res.headers.get('content-type') || ''
  if (ct.includes('application/json')) {
    const data: unknown = await res.json().catch(() => ({}))
    if (data && typeof data === 'object' && 'output' in data) {
      const o = (data as { output?: unknown }).output
      if (typeof o === 'string') return o
    }
    return JSON.stringify(data)
  }
  return await res.text()
}

export function registerLLMGateway(opts: LLMGatewayOptions) {
  if (typeof window === 'undefined') return
  const w = window as unknown as Window & { spark?: SparkAPI }
  if (w.spark) return // respect an existing provider
  const endpoint = opts.endpoint
  const token = opts.token
  const defaultModel = opts.model || 'gpt-4o'
  w.spark = {
    llmPrompt: buildPrompt,
    async llm(prompt: unknown, model?: string) {
      return callLLMGateway(endpoint, token, { prompt, model: model || defaultModel })
    }
  }
}
