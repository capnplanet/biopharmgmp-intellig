import type { SparkAPI } from '@/types/spark'
import { createRoot } from 'react-dom/client'
import { ErrorBoundary } from "react-error-boundary";
import "@github/spark/spark"

import App from './App.tsx'
import { ErrorFallback } from './ErrorFallback.tsx'

import "./main.css"
import "./styles/theme.css"
import "./index.css"

// LLM provider bootstrap (cloud-first name):
// - Prefer `VITE_LLM_GATEWAY_ENDPOINT` (cloud or on‑prem gateway).
// - For backward compatibility, fall back to `VITE_ONPREM_LLM_ENDPOINT`.
// - In development, install a dev mock when no provider is available.
// - If `window.spark` is already present (host-provided), respect it and do nothing.
if (typeof window !== 'undefined') {
  const w = window as unknown as Window & { spark?: SparkAPI }
  const endpoint = import.meta?.env?.VITE_LLM_GATEWAY_ENDPOINT ?? import.meta?.env?.VITE_ONPREM_LLM_ENDPOINT
  const token = import.meta?.env?.VITE_LLM_GATEWAY_TOKEN ?? import.meta?.env?.VITE_ONPREM_LLM_TOKEN
  if (!w.spark && endpoint) {
    import('./lib/llmGatewayProvider').then(m => m.registerLLMGateway({ endpoint, token })).catch(() => {})
  } else if (!w.spark && import.meta?.env?.DEV) {
    import('./lib/devSparkMock')
  }
}

createRoot(document.getElementById('root')!).render(
  <ErrorBoundary FallbackComponent={ErrorFallback}>
    <App />
   </ErrorBoundary>
)
