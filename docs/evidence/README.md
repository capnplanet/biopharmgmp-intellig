# Evidence Package (Step 6)

This folder contains the structured evidence package outlined in Step 6 of the Risk-Based Credibility Assessment.

Use these templates to assemble your pilot and production evidence artifacts. Each file links back to relevant source code and UI surfaces for traceability.

Contents
- 01-context-of-use.md
- 02-data-and-methods.md
- 03-results-and-acceptance.md
- 04-prompts-and-controls.md
- 05-security-and-privacy.md
- 06-change-control.md

How to populate
- Export audit logs and AI audit events from the app UI (Audit Trail and AI Audit Trail pages) and attach under the appropriate sections.
- Capture metrics trendline screenshots or export underlying data if available.
- Record SME reviews and sign-offs in the designated sections.

References
- Risk-Based Credibility Assessment: ../ai-credibility-assessment.md
- Transparency surfaces: src/components/AIAuditTrail.tsx, src/components/AuditTrail.tsx
- Metrics and sampling: src/lib/modeling.ts, src/components/ModelMetricsSampler.tsx
