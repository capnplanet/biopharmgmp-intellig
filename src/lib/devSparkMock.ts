// Dev-only Spark mock: if no LLM is injected, provide a minimal local implementation
// This avoids empty assistant responses and ensures AI audit logs populate during development.

function makePrompt(strings: any, ...expr: any[]) {
  let out = ''
  for (let i = 0; i < strings.length; i++) {
    out += strings[i]
    if (i < expr.length) out += String(expr[i])
  }
  return out
}

async function mockLlm(prompt: unknown, model: string): Promise<string> {
  const p = typeof prompt === 'string' ? prompt : JSON.stringify(prompt)
  const stamp = new Date().toISOString()
  // Keep it short and deterministic; this is only for local dev UX.
  return [
    `Mock ${model} @ ${stamp}`,
    '',
    'Summary:',
    (p || '').toString().split('\n').slice(0, 6).join('\n'),
    '',
    'Note: Replace dev mock with a real LLM by injecting window.spark.',
  ].join('\n')
}

export function ensureDevSparkMock() {
  if (typeof window === 'undefined') return
  const w = window as any
  if (w.spark) return
  w.spark = {
    llmPrompt: makePrompt,
    llm: mockLlm,
  }
}

ensureDevSparkMock()
