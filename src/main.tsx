import type { SparkAPI } from '@/types/spark'
import { createRoot } from 'react-dom/client'
import { ErrorBoundary } from "react-error-boundary";
import "@github/spark/spark"

import App from './App.tsx'
import { ErrorFallback } from './ErrorFallback.tsx'

import "./main.css"
import "./styles/theme.css"
import "./index.css"

// LLM provider bootstrap:
// - If VITE_ONPREM_LLM_ENDPOINT is set, register an on-prem provider.
// - Else, in development, install a dev mock so the UI always has a responder.
// - If window.spark is already present (host-provided), we respect it and do nothing.
if (typeof window !== 'undefined') {
  const w = window as unknown as Window & { spark?: SparkAPI }
  const endpoint = import.meta?.env?.VITE_ONPREM_LLM_ENDPOINT
  const token = import.meta?.env?.VITE_ONPREM_LLM_TOKEN
  if (!w.spark && endpoint) {
    import('./lib/onPremSparkProvider').then(m => m.registerOnPremSpark({ endpoint, token })).catch(() => {})
  } else if (!w.spark && import.meta?.env?.DEV) {
    import('./lib/devSparkMock')
  }
}

createRoot(document.getElementById('root')!).render(
  <ErrorBoundary FallbackComponent={ErrorFallback}>
    <App />
   </ErrorBoundary>
)
