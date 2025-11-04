# 01 — Context of Use

Purpose
- Describe the intended use, decision boundaries, and human-in-the-loop controls for the platform.

Scope and intended use
- Decision support for manufacturing oversight (equipment, batches, quality triage) — not automated disposition.
- Roles: Operators, Supervisors, Quality Analysts/Approvers, Administrators.

Decision boundaries
- In-scope: Triage, prioritization, investigation guidance, review assistance.
- Out-of-scope: Automated batch release, label-impacting changes without approval, GMP-significant changes without change control.

System overview
- UI: Dashboard, Analytics, Equipment Details, Operations Assistant, Audit Trail, AI Audit Trail.
- Data sources: Digital twin (dev), historian/OPC UA adapters (prod via equipment feed abstraction).
- AI components: 
  - Risk scoring/classifiers (in-browser modeling utilities)
  - LLM assistant via on-prem gateway in pilots; dev mock if no provider.

Traceability references
- App shell/routing: src/App.tsx
- Equipment feed abstraction: src/lib/equipmentFeed.ts
- Digital twin: src/lib/digitalTwin.ts
- Assistant: src/components/OperationsAssistant*.tsx, src/hooks/use-operations-assistant.ts
- Audit: src/hooks/use-audit.ts, src/components/AuditTrail.tsx, src/components/AIAuditTrail.tsx

Sign-off
- Manufacturing lead: __________  Date: __________
- Quality lead: __________       Date: __________
- IT/Security lead: __________   Date: __________
