# Evidence Completion Protocol (Step 6)

Purpose
- Provide a prescriptive, step-by-step protocol to populate the evidence package in this folder for pilots and production readiness.

Prerequisites
- Access to the running app (dev/pilot) with a user that can view Audit Trail and AI Audit Trail.
- Time window selected for evaluation (e.g., last 2 weeks of pilot shadow mode).
- Stakeholders available for sign-off (Manufacturing, Quality, IT/Security).

Key UI locations
- Audit Trail: full event log with export.
- AI Audit Trail: AI events, conversation archive, model metrics history and export.
- Operations Assistant: to generate a minimal conversation for audit capture.
- Equipment and Analytics pages: for context screenshots if needed.

Routes and navigation
- AI Audit Trail: open Audit Trail and then the “AI Audit Trail” button, or navigate to the #audit/ai hash route.
- Operations Assistant: open the Assistant page or floating assistant widget.

---

## Step A — Freeze the evaluation period
- Define the time window (start/end). Use this consistently across exports, screenshots, and metrics.
- If needed, note any system outages or configuration changes that overlap the window.

## Step B — Populate 01-context-of-use.md
- Intended use: State this is decision support for manufacturing oversight; no automated product disposition.
- Roles: List Operators, Supervisors, Quality Analysts/Approvers, and Admins.
- Decision boundaries: Copy in-scope/out-of-scope items and tailor to site SOPs.
- System overview: Briefly describe UI surfaces and data sources.
- Traceability: Insert references to:
  - src/App.tsx (app shell, routing)
  - src/lib/equipmentFeed.ts (data abstraction)
  - src/lib/digitalTwin.ts (dev twin)
  - src/hooks/use-audit.ts, src/components/AuditTrail.tsx, src/components/AIAuditTrail.tsx (audit)
  - src/components/OperationsAssistant*.tsx, src/hooks/use-operations-assistant.ts (assistant)
- Sign-off: Collect Manufacturing, Quality, and IT/Security signatures and dates.

## Step C — Populate 02-data-and-methods.md
- Datasets:
  - Development: describe twin scenarios and reference src/lib/digitalTwin.ts, src/data/seed.ts.
  - Pilot: document historian/quality sources, tag maps, units, and connections.
- Data integrity:
  - Describe timestamp normalization (UTC), unit consistency, and missing-data handling.
  - Attach tag maps and any data dictionaries.
- Modeling methods:
  - Reference src/lib/modeling.ts (AUROC, Brier, ECE with 5-bin default).
  - List models/scopes evaluated and their decisionThreshold values with rationale.
- Calibration and evaluation:
  - Describe stratification (equipment type, batch stage) and how ECE is computed.
- LLM methods:
  - Document provider (on‑prem gateway via src/lib/onPremSparkProvider.ts) or dev mock behavior (src/lib/devSparkMock.ts) during evaluation.
- Acceptance targets:
  - Restate AUROC ≥ 0.75, Brier ≤ 0.20, ECE ≤ 0.10.
- Attachments checklist:
  - [ ] Data dictionaries and tag maps
  - [ ] Units/normalization rules
  - [ ] Deidentified sample datasets
  - [ ] Evaluation exports/plots (optional)

## Step D — Populate 03-results-and-acceptance.md
1) Collect AI metrics history
- Navigate to AI Audit Trail (#audit/ai).
- Press “Sample now” (if visible) and wait ~5–10 seconds to ensure a fresh metrics point.
- Use “Refresh” to ensure latest history is displayed.
- Use the Export control to download JSON/CSV of metrics history.
- Attach the export file(s) and note the number of samples during the period.

2) Capture calibration and trendlines
- Toggle between AUROC/Brier/ECE in AI Audit Trail to capture trendline screenshots.
- Include reliability plots if generated externally; otherwise, rely on ECE and trendlines.

3) Summarize results and determine acceptance
- Fill the metrics table for each model/scope and dataset (pilot shadow mode recommended).
- Mark Pass/Fail against targets. For any Fail, document rationale, mitigation, and follow-up (recalibration plan).
- Confirm no critical UI errors occurred under missing-data scenarios.

4) Sign-offs
- Obtain Manufacturing, Quality, and IT/Security approvals in this file.

## Step E — Populate 04-prompts-and-controls.md
- Prompt inventory
  - Enumerate prompts/intents used by Operations Assistant; include versions and context/grounding rules.
  - If prompts are embedded in code, search/inspect src/hooks/use-operations-assistant.ts and related components.
- Guardrails
  - Confirm advisory-only language; document uncertainty handling and references to data snapshots.
  - Describe fallback behavior when LLM unavailable (see src/components/OperationsAssistant.tsx and audit entries).
- Change history
  - Record date, author, description, rationale, and approval references for each prompt/template update.
- Attachments
  - Redacted example interactions and audit exports (prompts/responses).

## Step F — Populate 05-security-and-privacy.md
- Architecture
  - Document on‑prem LLM gateway endpoint, authentication, and TLS; confirm no secrets in browser.
  - Note that dev mock is used only when no provider and in development.
- Access controls
  - Describe roles and least-privilege access for data sources.
- Data handling and retention
  - Provide retention policies for audit logs/metrics; transport encryption; backup/restore policies.
- Threats and mitigations
  - Fill the table with site-specific controls (e.g., WAF rules, token scopes, IP allowlists).
- Attach diagrams and policies as applicable.

## Step G — Populate 06-change-control.md
- Policy and release notes
  - State that model/threshold/prompt/template changes require change control before deployment.
  - Add versioned release notes with impact assessment.
- Traceability
  - Link change records to audit events (IDs/timestamps) and evidence updates.
- Approvals
  - Collect required sign-offs in this file.

---

## Evidence to export from the app (how-to)
- AI metrics history
  - Go to AI Audit Trail → use Export (JSON/CSV). Ensure sampling is current (Sample now + Refresh).
- AI conversation archive
  - From AI Audit Trail, export AI events; optionally start a new short conversation in the Operations Assistant to validate logging, then Refresh and export again.
- Full audit trail
  - From Audit Trail, export logs for the evaluation window; include navigation and AI events.

## Acceptance gate (green criteria)
- Metrics: AUROC ≥ 0.75 (key models), Brier ≤ 0.20, ECE ≤ 0.10—or documented exception with mitigation.
- Reliability: No unhandled exceptions under missing data/outage scenarios; safe fallbacks observed.
- Traceability: 100% logging of AI prompts/responses and key navigation; exports contain required metadata.
- Governance: Human-in-the-loop preserved; no auto-disposition.
- Security: On‑prem gateway configured for pilots; authentication enforced server-side; no secrets in browser.

## Final packaging
- Ensure all six files are complete and signed where required.
- Place exports (JSON/CSV/screenshots) alongside these files or reference a controlled repository.
- Optional: produce a zip of docs/evidence/ as a submission artifact.

## Verification checklist
- [ ] 01-context-of-use.md complete and signed
- [ ] 02-data-and-methods.md populated with datasets, methods, acceptance targets
- [ ] 03-results-and-acceptance.md filled with metrics, plots, decision, and sign-offs
- [ ] 04-prompts-and-controls.md includes inventory, guardrails, and changes
- [ ] 05-security-and-privacy.md includes architecture, controls, and policies
- [ ] 06-change-control.md includes policy, traceability, approvals
- [ ] Exports attached: AI metrics (JSON/CSV), AI events, full audit logs, screenshots
