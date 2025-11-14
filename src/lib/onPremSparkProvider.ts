import { registerLLMGateway } from './llmGatewayProvider'

// Backwards-compatible shim for the legacy onPrem provider.
// This file keeps the original API (`registerOnPremSpark`) but delegates
// to the new cloud-agnostic `registerLLMGateway` implementation. That
// lets older deployments keep calling the old bootstrap while the
// repository prefers `llmGatewayProvider` going forward.

export type OnPremOptions = {
  endpoint: string // e.g., '/api/llm' or full https://host/path
  token?: string
  model?: string
}

export function registerOnPremSpark(opts: OnPremOptions) {
  // Reuse the LLM gateway registration for backwards compatibility
  try {
    registerLLMGateway({ endpoint: opts.endpoint, token: opts.token, model: opts.model })
  } catch (err) {
    // If anything goes wrong, fail silently in the shim to avoid breaking
    // the original bootstrap behavior in demos or existing deployments.
    // Consumers should prefer the new `registerLLMGateway` directly.
    try { console.warn('registerOnPremSpark shim failed to register gateway', String(err)) } catch {}
  }
}

// Keep the legacy window.spark registration behavior if someone imports
// this module directly in older setups. The actual provider implementation
// lives in `llmGatewayProvider.ts`.
// No auto-registration here; explicit bootstrap is preserved.
