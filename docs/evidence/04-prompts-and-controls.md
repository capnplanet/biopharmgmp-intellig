# 04 — Prompts and Controls

Prompt inventory
- List production prompts, intents, and versions.
- Include grounding rules and context windows.

Guardrails and controls
- Advisory-only language; no auto-disposition.
- Safety checks on outputs (e.g., highlight uncertainty; cite data snapshots when possible).
- Fallback behavior when LLM unavailable (documented in src/components/OperationsAssistant.tsx and audit entries).

Change history
- Date, author, change description, rationale, approval references.

Testing
- Prompt tests and groundedness checks; regression suite where feasible.

Attachments
- [ ] Prompt list with versions
- [ ] Example interactions (redacted)
- [ ] Audit exports showing prompts/responses
