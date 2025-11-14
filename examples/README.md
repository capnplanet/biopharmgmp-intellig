# Example LLM Gateway Handlers

This folder contains example server-side gateway handlers to securely proxy
requests from the browser SPA to cloud LLM providers. Keeping API keys and
credentials on the server prevents leakage in the client bundle.

Files:
- `azure-gateway.ts` — Express/Node handler for Azure OpenAI (returns `{ output: string }`).
- `aws-gateway.ts` — **placeholder** (deprecated). Use `aws-gateway.clean.ts` for the hardened example.
- `aws-gateway.clean.ts` — Hardened AWS Bedrock example (stream-safe normalization).

Security and production notes:
- Never embed keys in the SPA or expose them via public envs.
- Deploy these handlers in a trusted server (serverless function, containerized API).
- Add authentication on the gateway endpoints (JWT, cookie-based session, API key, etc.).
- Consider streaming/response chunking for large responses (both Azure and Bedrock support streaming)
  — the examples show a simple normalization but do not implement full streaming.
- Add retries, backoff, metrics, and observability for reliability.

Quick run (local dev):
1. Install dependencies if you plan to run examples: `npm i @aws-sdk/client-bedrock-runtime node-fetch`.
2. Start the API server: `npm run server` (the project already exposes `server/index.mjs`).
3. Mount the router from these files into your server or adapt them into your preferred framework.

These files are examples only — treat them as a starting point, not production-ready
code. If you want, I can convert them to runnable Express server examples and
add a short test harness.
