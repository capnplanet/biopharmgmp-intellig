# 05 — Security and Privacy

Architecture
- LLM gateway (src/lib/llmGatewayProvider.ts); tokens optional and scoped; TLS recommended. Legacy on-prem provider (`src/lib/onPremSparkProvider.ts`) remains available.
- Dev mock only when no provider and in development (src/lib/devSparkMock.ts).
- No secrets stored in browser; provider registered at runtime.

Access control
- Least privilege for data sources; read-only where possible.
- Role-based access in downstream systems (document roles here).

Data handling
- Deidentify data for evaluation artifacts; retain policy for audit logs and metrics.
- Transport encryption; endpoint authentication.

Threats and mitigations
- LLM endpoint exposure → network controls, authentication.
- PII leakage → prompt and output reviews; masking if applicable.
- Tampering with logs → immutable store in production; export and sign.

Attachments
- [ ] Network diagrams and endpoints
- [ ] Authentication schemes and token scopes
- [ ] Retention and backup policies
- [ ] Security review sign-offs
