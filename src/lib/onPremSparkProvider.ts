// Minimal on-prem LLM provider scaffold
// Registers window.spark to forward prompts to your internal gateway endpoint.

export type OnPremOptions = {
  endpoint: string // e.g., '/api/llm' or full https://host/path
  token?: string // optional bearer token; prefer cookie-based auth when possible
  model?: string // default model name to pass through
}

function buildPrompt(strings: any, ...values: any[]): string {
  let out = ''
  for (let i = 0; i < strings.length; i++) {
    out += strings[i]
    if (i < values.length) out += String(values[i])
  }
  return out
}

async function callOnPrem(endpoint: string, token: string | undefined, payload: unknown): Promise<string> {
  const headers: Record<string, string> = { 'Content-Type': 'application/json' }
  if (token) headers['Authorization'] = `Bearer ${token}`
  const res = await fetch(endpoint, { method: 'POST', headers, body: JSON.stringify(payload) })
  if (!res.ok) throw new Error(`LLM gateway ${res.status}`)
  // Expect JSON { output: string } but fall back to text
  const ct = res.headers.get('content-type') || ''
  if (ct.includes('application/json')) {
    const data = await res.json().catch(() => ({})) as any
    return typeof data?.output === 'string' ? data.output : JSON.stringify(data)
  }
  return await res.text()
}

export function registerOnPremSpark(opts: OnPremOptions) {
  if (typeof window === 'undefined') return
  const w = window as any
  if (w.spark) return // respect an existing provider
  const endpoint = opts.endpoint
  const token = opts.token
  const defaultModel = opts.model || 'gpt-4o'
  w.spark = {
    llmPrompt: buildPrompt,
    async llm(prompt: unknown, model?: string) {
      return callOnPrem(endpoint, token, { prompt, model: model || defaultModel })
    }
  }
}
