# 03 — Results and Acceptance

Summary
- Provide overall performance and calibration results across datasets and strata.

Metrics table (example)

| Model/Scope | Dataset | N | AUROC | Brier | ECE | Threshold | Pass/Fail |
|---|---|---:|---:|---:|---:|---:|:---:|
| Deviation risk | Pilot (shadow) | 1,234 | 0.78 | 0.18 | 0.09 | 0.35 | PASS |
| Equipment failure | Pilot (shadow) | 987 | 0.74 | 0.21 | 0.12 | 0.30 | FAIL* |

Notes
- If any metric falls short (e.g., AUROC < 0.75 or ECE > 0.10), provide rationale and mitigation (e.g., recalibration plan).

Calibration plots
- Attach reliability plots or screenshots. Document binning and smoothing.

Trendlines
- Include AI Audit Trail screenshots or exported data showing metric history from ModelMetricsSampler.

Acceptance criteria
- Meets targets: AUROC ≥ 0.75; Brier ≤ 0.20; ECE ≤ 0.10 (or justified exception with mitigation and monitoring plan).
- No critical UI errors under missing data scenarios.
- Full audit coverage for AI interactions.

Approvals
- Manufacturing lead: __________  Date: __________
- Quality lead: __________       Date: __________
- IT/Security lead: __________   Date: __________
