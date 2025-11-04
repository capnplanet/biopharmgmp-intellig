# Risk-Based Credibility Assessment for BioPharm GMP Intelligence

This document applies FDA’s 7-Step Risk-Based Credibility Assessment Framework (from “Considerations for the Use of Artificial Intelligence to Support Regulatory Decision-Making for Drug and Biological Products”) to this platform. It tailors credibility goals, evidence, and ongoing monitoring to our specific context, components, and deployment modes (dev twin, pilot on‑prem, production with audited data flows).

> Scope: The platform provides manufacturing oversight dashboards, AI-assisted insights (Operations Assistant), quality automation recommendations, and model transparency. It is intended as decision support with human-in-the-loop; it does not perform automated release decisions.

## Executive summary

- Intended use: Real-time monitoring, risk triage, and decision support across equipment, batches, and quality workflows.
- Decision impact: Moderate (prioritization, investigation guidance); high-impact decisions (e.g., product release) remain outside scope.
- Credibility focus: Accuracy and calibration (AUROC/Brier/ECE), data integrity (ALCOA+, 21 CFR Part 11), traceability (full audit), transparency (AI audit + model metrics), and change control.
- Deployment posture: LLM-agnostic via on‑prem gateway; dev twin for simulation; extensible to historian/OPC UA in production with the equipment feed abstraction.

---

## Step 1 — Define the decision context

- Context of use
  - Real-time dashboards (Dashboard, Analytics) for CPP drift, equipment health, batch status.
  - AI assistant (Operations Assistant) providing summaries and suggestions; AI audit trail records prompts/responses.
  - Quality automation proposals (non-binding) surfaced through alerts and workflows.
- Users and roles
  - Production Operators, Manufacturing Supervisors, Quality Analysts/Approvers, System Administrators.
- Decision boundaries
  - In-scope: Triage, prioritization, investigation planning, review assistance.
  - Out-of-scope: Automated batch disposition, label-impacting changes without human approval, GMP-significant changes without change control.

## Step 2 — Identify and analyze risks

- Model/output risks
  - False negatives: Missed equipment alerts or under-reported deviation risk → delayed investigation.
  - False positives: Alert fatigue, unnecessary escalations.
  - Miscalibration: Overconfident but incorrect probabilities.
  - LLM hallucination: Inaccurate or non-evidence-based suggestions.
- Data risks
  - Timestamp drift, data loss/outages, incorrect tag mapping, unit inconsistencies.
  - Data integrity violations (tampering or incomplete records).
- Operational risks
  - Model drift due to process changes; untracked updates; undocumented prompt/template changes.
  - Access control gaps, PII leakage, or unsecured LLM endpoints.
- Residual risks (after controls)
  - Moderate residual risk for triage accuracy; mitigated by human review, calibration checks, and audit visibility.

## Step 3 — Set credibility goals (risk-aligned)

- Performance & calibration
  - AUROC ≥ 0.75 for deviation risk and equipment failure classifiers (shadow-mode acceptance for pilots).
  - Brier ≤ 0.20; ECE ≤ 0.10 (calibration acceptable); flags when exceeded.
  - Decision thresholds documented per model (decisionThreshold), justified and versioned.
- Robustness
  - Sensible behavior with missing data: last-known-good with flags; bounded outputs [0,1]; no crashes.
  - Graceful degradation when LLM unavailable: fallback summary + explicit audit entry.
- Data integrity & traceability
  - Full audit logs for navigation, AI prompts/responses/errors, and exports.
  - 21 CFR Part 11 alignment (computer-generated, time-stamped, protected records; electronic signatures where applicable).
- Security & privacy
  - On‑prem LLM gateway by default for pilots; no secrets in browser; tokens optional and scoped.
  - Principle of least privilege for data sources; read-only monitoring where possible.
- Human-in-the-loop
  - UI clearly presents suggestions as non-binding; requires human review for quality actions; change control routed via dedicated workflows.

## Step 4 — Plan evidence generation

- Data sources for verification
  - Development twin (src/lib/digitalTwin.ts): controlled perturbations, alert spikes, CPP drift; used for initial VV and drift monitors.
  - Seed/reference data (src/data/seed.ts, quality records) for deterministic tests.
  - Pilot data (on-prem): shadow mode; compare predictions vs observed events (deviations, equipment alerts).
- Methods
  - Offline evaluation: compute AUROC, Brier, ECE; stratify by equipment type and batch stage.
  - Calibration checks: reliability plots; expected calibration error bins (existing implementation uses 5 bins).
  - Robustness: simulate missing tags/outages and verify UI degrades gracefully.
  - LLM evaluation: prompt library tests; groundedness checks referencing structured snapshot.
- Acceptance criteria
  - Metrics meet goals above across N≥100 mixed samples; no category <0.65 AUROC without rationale/mitigation.
  - No high-severity UI failures on missing data paths.
  - AI assistant must display clear context attribution; audit logging 100% for prompts/responses.

## Step 5 — Perform V&V and independent review

- Verification
  - Unit-level: AUROC, ECE, Brier utilities (src/lib/modeling.ts).
  - Integration: ModelMetricsSampler, chart rendering, and audit logging flows.
  - Routing: deep links (#audit/ai, #dashboard/equipment/:id) behave and are audited.
- Validation
  - Shadow-mode pilot comparing predicted risks to actual observed deviations/alerts over ≥2 weeks.
  - Independent SME review of thresholds, prompts, and UI language (to avoid misleading claims).
- Documentation artifacts
  - VV log: datasets, versions, metrics and acceptance results.
  - Prompt inventory and change history.

## Step 6 — Present evidence and rationale

- Built-in transparency features (evidence surfaces)
  - AI Audit Trail page: lists AI events, conversation archive, export (JSON/CSV), and model metrics (AUROC/Brier/ECE) with sampling history.
  - Equipment Details: calibration info and supported interfaces.
  - Audit Trail: comprehensive event log with signatures and export.
- Evidence package structure (suggested)
  - 01-context-of-use.md (this doc references it)
  - 02-data-and-methods.md (datasets, sampling, binning)
  - 03-results-and-acceptance.md (tables/plots, pass/fail)
  - 04-prompts-and-controls.md (prompt set, guardrails, fallback behavior)
  - 05-security-and-privacy.md (gateway, tokens, roles)
  - 06-change-control.md (release notes, approvals)

## Step 7 — Monitor, maintain, and change control

- Post-deployment monitoring
  - ModelMetricsSampler persists metrics points to KV; AI Audit Trail shows history counts and trendlines.
  - Alerts when thresholds exceeded (e.g., AUROC drops by >0.1 absolute or ECE > 0.15).
- Drift & recalibration
  - Retraining gated by change control; record model ID, training data summary, and acceptance rerun.
  - Thresholds revisited when prevalence shifts; update decisionThreshold with rationale and audit entry.
- Change management
  - All model/prompt/template changes require a change control record; link to audits.
  - Version bump and distribution notes added to release artifacts.

---

## Mapping: platform features to credibility controls

- Data integrity & audit
  - src/hooks/use-audit.ts (centralized logger) and Audit Trail UI; exports + signatures; navigation and AI events.
- Performance transparency
  - src/lib/modeling.ts metrics (AUROC/Brier/ECE) + ModelMetricsSampler + AI Audit charts.
- Safe fallback behavior
  - src/components/OperationsAssistant.tsx logs prompt/response; fallback path logs response when LLM unavailable.
- Deployment safety
  - src/lib/onPremSparkProvider.ts for secured, internal LLM.
  - src/lib/devSparkMock.ts only if no provider & dev; does not override host-provided providers.
- Data source abstraction
  - equipment feed abstraction enables swapping twin for historian/OPC UA with consistent snapshot contract.

## Risk control checklist (pilot readiness)

- [ ] On‑prem LLM gateway configured; no secrets in browser; TLS enforced.
- [ ] AI audit logging validated: prompt, response, and error events present; exports work.
- [ ] Metrics sampling active; AUROC/Brier/ECE visible; thresholds documented.
- [ ] Equipment feed uses production adapter; timestamps normalized to UTC.
- [ ] UI labels and assistant phrasing reviewed for non-binding language.
- [ ] Access controls and roles defined; least privilege for data sources.
- [ ] Change control workflow available for prompts/models; release notes prepared.

## Acceptance criteria summary

- Performance: AUROC ≥ 0.75 (key models); Brier ≤ 0.20; ECE ≤ 0.10; rationale recorded if unmet.
- Reliability: No unhandled exceptions during outages or missing data scenarios.
- Traceability: 100% logging of AI interactions and key navigation; exports contain full metadata.
- Human-in-the-loop: No automated product release or irreversible actions without approval.
- Security: On‑prem endpoint used for pilots; authentication enforced server-side.

## Residual risk and sign-off (template)

- Summary of residual risks after controls: …
- Decision impact level: Informational/Decision Support (non-determinative).
- Approvers:
  - Manufacturing Lead: __________  Date: __________
  - Quality Lead: __________       Date: __________
  - IT/Security Lead: __________   Date: __________

---

## Alignment with FDA AI guidance

The repository aligns with key principles emphasized in the guidance as follows:

- Defined context of use and human oversight
  - Non-automated decision support by design; UI communicates advisory nature (Operations Assistant); no auto-disposition.
- Data quality and integrity
  - Deterministic seeds (src/data/seed.ts) and a digital twin (src/lib/digitalTwin.ts) for controlled evaluation; audit logging across interactions.
- Transparency and traceability
  - AI Audit Trail and Audit Trail UIs provide comprehensive, time-stamped logs; exportable for review and records.
- Performance and calibration monitoring
  - AUROC, Brier, and ECE implemented in src/lib/modeling.ts; persisted history via ModelMetricsSampler; visual trendlines in AIAuditTrail.
- Change control and lifecycle management
  - Explicit thresholds and prompts to be versioned; audit events record interactions and can tie to change records; deploy-time provider selection with on-prem gateway support.
- Security and privacy
  - On‑prem LLM gateway scaffold (src/lib/onPremSparkProvider.ts) with token option; dev mock used only when no provider is present; avoids exposing secrets in browser.
- Documentation and evidence generation
  - This document provides a risk-based plan tied to platform artifacts; additional package structure suggested for pilots and production.

Limitations and next steps
- For production, integrate persistent storage (for audit/metrics) with appropriate access control and retention.
- Add automated alerting when metrics thresholds breached; document triage runbooks.
- Maintain a prompt inventory with reviewed, approved templates; link to change control records.
- Expand robustness tests to cover more outage patterns and data anomalies.
