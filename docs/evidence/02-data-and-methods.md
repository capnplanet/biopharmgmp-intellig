# 02 — Data and Methods

Datasets
- Development: src/lib/digitalTwin.ts scenarios; src/data/seed.ts reference records.
- Pilot: On-prem historian/quality systems (document connections, tag maps, units).

Data integrity and preprocessing
- Timestamp normalization to UTC; unit consistency; tag mapping validation.
- Missing data strategy: last-known-good with flags; conservative defaults.

Modeling methods
- Classification utilities and metrics in src/lib/modeling.ts
  - AUROC, Brier score, Expected Calibration Error (ECE, 5-bin default)
- Decision thresholds per model (document here with rationale)

Calibration and evaluation
- Reliability plots; stratification by equipment type and batch stage.
- Sampling history captured via src/components/ModelMetricsSampler.tsx.

LLM methods
- Provider selection via src/main.tsx with on-prem gateway (src/lib/onPremSparkProvider.ts) or dev mock (src/lib/devSparkMock.ts).
- Prompt templates and grounding strategy documented in 04-prompts-and-controls.md.

Acceptance metrics (targets)
- AUROC ≥ 0.75; Brier ≤ 0.20; ECE ≤ 0.10.

Attachments
- [ ] Data dictionaries and tag maps
- [ ] Units and normalization rules
- [ ] Sample datasets (deidentified)
- [ ] Evaluation notebooks/exports (optional)
