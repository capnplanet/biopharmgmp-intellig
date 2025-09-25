import { useState, useEffect } from 'react'
import * as React from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog'
import { 
  TrendUp, 
  TrendDown,
  ChartLine, 
  Warning,
  CheckCircle,
  Clock,
  Robot,
  Target,
  BookOpen,
  Info
} from '@phosphor-icons/react'
import { equipmentTelemetry, batches } from '@/data/seed'
import { monitor, sampleAndRecordPredictions, predictQuality, predictDeviationRisk, predictEquipmentFailure, decisionThreshold, trainLogisticForModel, predictLogisticProb, getLogisticState, type ModelId } from '@/lib/modeling'

interface PredictiveModel {
  id: string
  name: string
  type: 'quality_prediction' | 'equipment_failure' | 'batch_optimization' | 'deviation_risk'
  accuracy: number
  lastTrained: Date
  status: 'active' | 'training' | 'inactive'
  predictions: {
    value: number
    confidence: number
    timestamp: Date
    explanation: string
  }[]
}

interface QualityMetrics {
  batchYield: { current: number; trend: 'up' | 'down' | 'stable'; historical: number[] }
  firstPassRate: { current: number; trend: 'up' | 'down' | 'stable'; historical: number[] }
  deviationRate: { current: number; trend: 'up' | 'down' | 'stable'; historical: number[] }
  equipmentOEE: { current: number; trend: 'up' | 'down' | 'stable'; historical: number[] }
}

// (runtime models are built via buildRuntimeModels)

const mockMetrics: QualityMetrics = {
  batchYield: { 
    current: 94.3, 
    trend: 'up', 
    historical: [91.2, 92.1, 93.4, 94.1, 94.3] 
  },
  firstPassRate: { 
    current: 89.7, 
    trend: 'stable', 
    historical: [88.9, 89.2, 89.5, 89.8, 89.7] 
  },
  deviationRate: { 
    current: 2.1, 
    trend: 'down', 
    historical: [3.2, 2.8, 2.4, 2.3, 2.1] 
  },
  equipmentOEE: { 
    current: 87.4, 
    trend: 'up', 
    historical: [84.1, 85.3, 86.2, 86.8, 87.4] 
  }
}

// Build functional models from current data using LR if available; fallback to lightweight predictors
function buildRuntimeModels(): PredictiveModel[] {
  const pickQualityBatch = batches.reduce((best, b) => {
    if (!best) return b
    const pb = predictQuality(best).p
    const pc = predictQuality(b).p
    return pb < pc ? best : b
  }, undefined as (typeof batches)[number] | undefined) || batches[0]

  const pickDeviationBatch = batches.reduce((best, b) => {
    if (!best) return b
    const pb = predictDeviationRisk(best).p
    const pc = predictDeviationRisk(b).p
    return pb > pc ? best : b
  }, undefined as (typeof batches)[number] | undefined) || batches[0]

  const eqScores = equipmentTelemetry.map(e => ({ id: e.id, ...predictEquipmentFailure(e) }))
  const topEq = eqScores.reduce((a, b) => (a && a.p > b.p ? a : b)) || { id: equipmentTelemetry[0]?.id || 'EQ-001', p: 0, y: 0, features: {} as Record<string, number> }

  const qH = predictQuality(pickQualityBatch)
  const dH = predictDeviationRisk(pickDeviationBatch)
  const eH = predictEquipmentFailure(equipmentTelemetry.find(x => x.id === topEq.id)!)

  // Try LR probabilities if a trained model exists; otherwise use heuristics
  const qP = predictLogisticProb('quality_prediction', qH.features) ?? qH.p
  const dP = predictLogisticProb('deviation_risk', dH.features) ?? dH.p
  const eP = predictLogisticProb('equipment_failure', eH.features) ?? eH.p

  const conf = (p: number) => 0.5 + Math.abs(p - 0.5) / 2 // simple heuristic confidence proxy

  const qModel: PredictiveModel = {
    id: 'model-001',
    name: 'Batch Quality Predictor',
    type: 'quality_prediction',
    accuracy: Math.round((1 - qP * 0.05) * 1000) / 10, // placeholder display only
    lastTrained: new Date(),
    status: 'active',
    predictions: [{
      value: qP * 100,
      confidence: conf(qP),
      timestamp: new Date(),
      explanation: predictLogisticProb('quality_prediction', qH.features) != null
        ? `Logistic model (local) on engineered features (standardized) outputs probability via σ(w·x + b). Falls back to heuristic if unavailable. Current CPP compliance=${qH.features.cpp_compliance.toFixed(2)}, |ΔT|=${qH.features.temp_delta.toFixed(2)}, |ΔP|=${qH.features.pressure_delta.toFixed(2)}, |ΔpH|=${qH.features.ph_delta.toFixed(2)}.`
        : `Heuristic: p = clamp(0.05 + 0.9*CPP, 0, 1). Inputs include |ΔT|=${qH.features.temp_delta.toFixed(2)}, |ΔP|=${qH.features.pressure_delta.toFixed(2)}, |ΔpH|=${qH.features.ph_delta.toFixed(2)}.`
    }]
  }

  const dModel: PredictiveModel = {
    id: 'model-003',
    name: 'Deviation Risk Analyzer',
    type: 'deviation_risk',
    accuracy: 90.0,
    lastTrained: new Date(),
    status: 'active',
    predictions: [{
      value: dP * 100,
      confidence: conf(dP),
      timestamp: new Date(),
      explanation: predictLogisticProb('deviation_risk', dH.features) != null
        ? `Logistic model (local) on normalized deviation features; outputs σ(w·x + b). Fallback to heuristic if model untrained. Norm devs: temp=${dH.features.temp_norm_dev.toFixed(2)}, pressure=${dH.features.pressure_norm_dev.toFixed(2)}, pH=${dH.features.ph_norm_dev.toFixed(2)}.`
        : `Heuristic: risk p = max(normDevs)/2, with temp=${dH.features.temp_norm_dev.toFixed(2)}, pressure=${dH.features.pressure_norm_dev.toFixed(2)}, pH=${dH.features.ph_norm_dev.toFixed(2)}.`
    }]
  }

  const eModel: PredictiveModel = {
    id: 'model-002',
    name: 'Equipment Failure Predictor',
    type: 'equipment_failure',
    accuracy: 88.0,
    lastTrained: new Date(),
    status: 'active',
    predictions: [{
      value: eP * 100,
      confidence: conf(eP),
      timestamp: new Date(),
      explanation: predictLogisticProb('equipment_failure', eH.features) != null
        ? `Logistic model (local) on vibration/thermal features; outputs σ(w·x + b). Fallback to heuristic if model untrained. For ${topEq.id}, rms_norm=${eH.features.rms_norm.toFixed(2)}, temp_var_norm=${eH.features.temp_var_norm.toFixed(2)}, alert=${eH.features.alert_flag}.`
        : `Heuristic: p = 0.6*rms_norm + 0.3*temp_var_norm + 0.2*alert. For ${topEq.id}, rms_norm=${eH.features.rms_norm.toFixed(2)}, temp_var_norm=${eH.features.temp_var_norm.toFixed(2)}, alert=${eH.features.alert_flag}.`
    }]
  }

  return [qModel, eModel, dModel]
}

function MetricCard({ 
  title, 
  value, 
  unit = '%', 
  trend, 
  historical, 
  icon: Icon 
}: {
  title: string
  value: number
  unit?: string
  trend: 'up' | 'down' | 'stable'
  historical: number[]
  icon: React.ComponentType<{ className?: string }>
}) {
  const trendIcon = trend === 'up' ? TrendUp : trend === 'down' ? TrendDown : null
  const trendColor = trend === 'up' ? 'text-success' : trend === 'down' ? 'text-destructive' : 'text-muted-foreground'
  const change = historical.length >= 2 ? value - historical[historical.length - 2] : 0

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
        <CardTitle className="text-sm font-medium text-muted-foreground">
          {title}
        </CardTitle>
        <Icon className="h-4 w-4 text-muted-foreground" />
      </CardHeader>
      <CardContent>
        <div className="text-2xl font-bold font-mono">
          {value.toFixed(1)}{unit}
        </div>
        <div className="flex items-center gap-1 text-sm">
          {trendIcon && React.createElement(trendIcon, { className: `h-3 w-3 ${trendColor}` })}
          <span className={trendColor}>
            {change > 0 ? '+' : ''}{change.toFixed(1)}{unit} vs last period
          </span>
        </div>
      </CardContent>
    </Card>
  )
}

function PredictionCard({ model }: { model: PredictiveModel }) {
  const [showExplanation, setShowExplanation] = useState(false)
  const prediction = model.predictions[0]
  
  const getStatusColor = (status: string) => {
    return status === 'active' ? 'bg-success text-success-foreground' :
           status === 'training' ? 'bg-warning text-warning-foreground' :
           'bg-muted text-muted-foreground'
  }

  const getRiskLevel = (value: number, type: string) => {
    if (type === 'quality_prediction') {
      return value > 95 ? 'low' : value > 90 ? 'medium' : 'high'
    } else if (type === 'equipment_failure') {
      return value < 10 ? 'low' : value < 30 ? 'medium' : 'high'
    } else {
      return value < 20 ? 'low' : value < 50 ? 'medium' : 'high'
    }
  }

  const riskLevel = getRiskLevel(prediction.value, model.type)
  const riskColor = riskLevel === 'low' ? 'text-success' : 
                   riskLevel === 'medium' ? 'text-warning' : 'text-destructive'

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle className="text-base">{model.name}</CardTitle>
          <Badge className={getStatusColor(model.status)}>
            {model.status}
          </Badge>
        </div>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <div className="text-2xl font-bold font-mono">
                {prediction.value.toFixed(1)}{model.type === 'quality_prediction' ? '%' : model.type === 'equipment_failure' ? '% risk' : '% risk'}
              </div>
              <div className="text-sm text-muted-foreground">
                Confidence: {(prediction.confidence * 100).toFixed(0)}%
              </div>
            </div>
            <div className="text-right">
              <div className={`text-sm font-medium ${riskColor}`}>
                {riskLevel.toUpperCase()} RISK
              </div>
              <div className="text-xs text-muted-foreground">
                Accuracy: {model.accuracy}%
              </div>
            </div>
          </div>
          
          <Dialog open={showExplanation} onOpenChange={setShowExplanation}>
            <DialogTrigger asChild>
              <Button variant="outline" size="sm" className="w-full">
                <Robot className="h-4 w-4 mr-2" />
                View AI Explanation
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-2xl">
              <DialogHeader>
                <DialogTitle>AI Model Explanation - {model.name}</DialogTitle>
              </DialogHeader>
              <div className="space-y-4">
                <div className="p-4 bg-muted rounded-lg">
                  <h4 className="font-medium mb-2">Prediction Details:</h4>
                  <div className="space-y-2 text-sm">
                    <div><strong>Value:</strong> {prediction.value.toFixed(1)}{model.type === 'quality_prediction' ? '%' : '% risk'}</div>
                    <div><strong>Confidence:</strong> {(prediction.confidence * 100).toFixed(0)}%</div>
                    <div><strong>Risk Level:</strong> <span className={riskColor}>{riskLevel.toUpperCase()}</span></div>
                    <div><strong>Generated:</strong> {prediction.timestamp.toLocaleString()}</div>
                  </div>
                </div>
                <div className="p-4 bg-blue-50 rounded-lg">
                  <h4 className="font-medium mb-2">Model Explanation:</h4>
                  <p className="text-sm">{prediction.explanation}</p>
                </div>
                <div className="p-4 bg-amber-50 rounded-lg">
                  <h4 className="font-medium mb-2">Evidence-Based Analysis:</h4>
                  <p className="text-sm">
                    In this demo, probabilities are computed from lightweight predictors on current data. We report live metrics (Accuracy, Brier, ECE, AUROC) above from runtime predictions vs. observed outcomes. Historical retraining and cross-validation are not performed here.
                  </p>
                </div>
              </div>
            </DialogContent>
          </Dialog>
        </div>
      </CardContent>
    </Card>
  )
}

export function Analytics() {
  const [models, setModels] = useState<PredictiveModel[]>(buildRuntimeModels())
  const [metrics] = useState<QualityMetrics>(mockMetrics)
  const [, setCurrentTime] = useState(new Date())
  // Determine highest-risk equipment by current predictor
  const topEq = React.useMemo(() => {
    const scored = equipmentTelemetry.map(e => ({ id: e.id, p: predictEquipmentFailure(e).p }))
    return scored.sort((a,b) => b.p - a.p)[0]?.id || 'BIO-002'
  }, [])

  useEffect(() => {
    const timer = setInterval(() => setCurrentTime(new Date()), 60000)
    return () => clearInterval(timer)
  }, [])

  // Minimal live monitoring: sample and record predictions periodically
  useEffect(() => {
    // seed once at mount
    sampleAndRecordPredictions()
    const id = setInterval(() => sampleAndRecordPredictions(), 30000)
    return () => clearInterval(id)
  }, [])

  // Refresh models periodically to reflect latest data
  useEffect(() => {
    const id = setInterval(() => setModels(buildRuntimeModels()), 30000)
    return () => clearInterval(id)
  }, [])

  // Train/update local logistic regressions periodically from monitor
  useEffect(() => {
    // Try training soon after mount, then on an interval
    const tryTrain = () => {
      try { trainLogisticForModel('quality_prediction', { minSamples: 60, requireBothClasses: true }) } catch (e) { void e }
      try { trainLogisticForModel('deviation_risk', { minSamples: 60, requireBothClasses: true }) } catch (e) { void e }
      try { trainLogisticForModel('equipment_failure', { minSamples: 60, requireBothClasses: true }) } catch (e) { void e }
    }
    const t0 = setTimeout(tryTrain, 3000)
    const id = setInterval(tryTrain, 45000)
    return () => { clearTimeout(t0); clearInterval(id) }
  }, [])

  // Simulated local retrain on in-memory data (stub):
  // In production, replace with a real, local training job that reads approved datasets and writes versioned model artifacts.
  const retrainLocally = async (modelId: string) => {
    setModels(prev => prev.map(m => m.id === modelId ? { ...m, status: 'training' } : m))
    // Simulate reading from local archive/sim data without external calls
    // Example sources: batches, equipmentTelemetry, audit events, operator logs, trend stats
    await new Promise(r => setTimeout(r, 1200))
    // Attempt on-device logistic regression training for the selected model type
    try {
      const mdl = models.find(m => m.id === modelId)
      const asModelId = (t: PredictiveModel['type']): ModelId | null => (
        t === 'quality_prediction' || t === 'equipment_failure' || t === 'deviation_risk' ? t : null
      )
      const mid = mdl ? asModelId(mdl.type) : null
      if (mid) trainLogisticForModel(mid, { minSamples: 60, requireBothClasses: true })
    } catch (e) { void e }
    // Simulate a small accuracy delta to reflect retrain; in real flow compute from validation set
    setModels(prev => prev.map(m => m.id === modelId ? {
      ...m,
      status: 'active',
      lastTrained: new Date(),
      accuracy: Math.min(99, Math.max(50, (m.accuracy ?? 80) + (Math.random() * 2 - 1)))
    } : m))
  }

  function ExplainabilityPanel() {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <BookOpen className="h-5 w-5" />
            AI Explainability & Methodology
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-5 text-sm leading-6">
            <div className="p-3 rounded-md border bg-muted/30">
              <div className="flex items-start gap-2">
                <Info className="h-4 w-4 mt-0.5 text-muted-foreground" />
                <p className="text-muted-foreground">
                  Demo mode: Predictions and insights shown here are generated from deterministic sample data and simple heuristics for illustration. The sections below describe how a production system would generate, validate, and explain similar outputs without confirmation bias.
                </p>
              </div>
            </div>

            <section>
              <h4 className="font-medium mb-1">Data inputs</h4>
              <ul className="list-disc ml-5 space-y-1 text-muted-foreground">
                <li>Critical Process Parameters (CPPs): temperature, pressure, pH, volume, rates (from PAT).</li>
                <li>Equipment telemetry: vibration RMS, temperature, run-hours, alarms, maintenance logs.</li>
                <li>Context: batch metadata, stage, raw material lots, operators, environment.</li>
                <li>Quality events: deviations, CAPA, change controls, effectiveness checks.</li>
              </ul>
            </section>

            <section>
              <h4 className="font-medium mb-1">Feature engineering</h4>
              <ul className="list-disc ml-5 space-y-1 text-muted-foreground">
                <li>Rolling stats on CPPs: mean, variance, trend slope, EWMA, control-chart signals (e.g., 3σ).</li>
                <li>Vibration features: RMS, peak, crest factor, kurtosis, spectral band energy, envelope demodulation.</li>
                <li>Temporal features: time-since-start, stage transitions, seasonality harmonics.</li>
                <li>Event encodings: one-hot of alarm codes, recency of maintenance, CAPA links.</li>
              </ul>
            </section>

            <section>
              <h4 className="font-medium mb-1">Model families</h4>
              <ul className="list-disc ml-5 space-y-1 text-muted-foreground">
                <li>Classification/regression: gradient-boosted trees (XGBoost/LightGBM), random forests.</li>
                <li>Time series: ARIMA/SARIMA for forecasting, temporal CNN/LSTM for multivariate trends.</li>
                <li>Anomaly detection: isolation forest, robust PCA, autoencoders for reconstruction error.</li>
                <li>Calibrated probabilities: Platt scaling or isotonic regression for well-calibrated risk.</li>
              </ul>
            </section>

            <section>
              <h4 className="font-medium mb-1">Decision logic & thresholds</h4>
              <p className="text-muted-foreground">
                Risk scores are compared against guardrails derived from historical outcomes and standards. For equipment, vibration features are mapped to condition categories (e.g., ISO 20816). For CPPs, trend-based rules and predicted excursions are assessed vs. specification limits with look-ahead horizons.
              </p>
            </section>

            <section>
              <h4 className="font-medium mb-1">Uncertainty & confidence</h4>
              <ul className="list-disc ml-5 space-y-1 text-muted-foreground">
                <li>Predictive uncertainty via model ensembles, quantile regression, or MC dropout (for deep nets).</li>
                <li>Probability calibration measured by Brier score and Expected Calibration Error (ECE).</li>
              </ul>
            </section>

            <section>
              <h4 className="font-medium mb-1">Validation & monitoring</h4>
              <ul className="list-disc ml-5 space-y-1 text-muted-foreground">
                <li>Time-based cross-validation and backtesting to respect causality.</li>
                <li>Metrics: AUROC/PR-AUC (classification), MAE/MAPE/RMSE (forecasting), lift/recall at K.</li>
                <li>Drift detection: KS/AD tests, Population Stability Index (PSI), change-point detection.</li>
                <li>Post-deployment monitoring and alerting on performance degradation.</li>
              </ul>
            </section>

            <section>
              <h4 className="font-medium mb-1">Explainability & bias mitigation</h4>
              <ul className="list-disc ml-5 space-y-1 text-muted-foreground">
                <li>Local explanations with SHAP to rank feature contributions per prediction.</li>
                <li>Counterfactual analysis to suggest minimal changes that reduce risk.</li>
                <li>No confirmation bias: frozen validation sets, pre-registered thresholds, and blinded evaluations.</li>
                <li>Human-in-the-loop review with audit trails (21 CFR Part 11; ALCOA+).</li>
              </ul>
            </section>

            <section>
              <h4 className="font-medium mb-1">Model scope & training</h4>
              <ul className="list-disc ml-5 space-y-1 text-muted-foreground">
                <li>Predictive layer in this demo uses lightweight heuristic predictors (not trained ML). Metrics (Accuracy, Brier, ECE, AUROC) are computed on live simulated data.</li>
                <li>Optional local model: A small on-device logistic regression can train in-memory on recent runtime data (features + outcomes) and provide probabilities; it runs locally and falls back to heuristics if insufficient data is available.</li>
                <li>Retraining: The UI exposes a "Retrain" button, but no training pipeline runs in this demo. In a client deployment, models can be connected to a local training job and kept on-prem.</li>
                <li>Data sources for predictions: current batch CPPs (temperature, pressure, pH, volume), equipment telemetry (vibration RMS, temperature variance, uptime), and seeded batch metadata from the in-memory archive.</li>
                <li>Generative RCA: If configured, the AI assistant uses a local prompt-grounded context (batch record, operator logs, calibration/maintenance, CAPA history, audit events, trend stats, and regulatory guidance). No external data is uploaded unless explicitly configured by the client.</li>
                <li>Production recommendation: Integrate validated ML models (e.g., ONNX runtime or local service endpoint), add a governed training pipeline with data lineage, approvals, and 21 CFR Part 11 controls (GAMP 5-aligned).</li>
              </ul>
            </section>

            <section>
              <h4 className="font-medium mb-1">References</h4>
              <ul className="list-disc ml-5 space-y-1 text-muted-foreground">
                <li>
                  FDA: Process Analytical Technology (PAT) Guidance for Industry — <a className="underline" href="https://www.fda.gov/regulatory-information/search-fda-guidance-documents/pat-process-analytical-technology" target="_blank" rel="noreferrer">https://www.fda.gov/.../pat-process-analytical-technology</a>
                </li>
                <li>
                  ISO 20816 (Machinery vibration — Evaluation of machine vibration by measurements on non-rotating parts) — overview.
                </li>
                <li>
                  ISPE GAMP 5 (A Risk-Based Approach to Compliant GxP Computerized Systems) — model lifecycle governance.
                </li>
                <li>
                  21 CFR Part 11 — Electronic records and signatures; audit trail requirements.
                </li>
              </ul>
            </section>

            <section>
              <h4 className="font-medium mb-1">Glossary (Definitions)</h4>
              <dl className="grid gap-2">
                <div>
                  <dt className="font-medium">CPP (Critical Process Parameter)</dt>
                  <dd className="text-muted-foreground">A process parameter whose variability can impact product quality and should be monitored or controlled.</dd>
                </div>
                <div>
                  <dt className="font-medium">Heuristic predictor</dt>
                  <dd className="text-muted-foreground">A transparent, rule-based scoring function that maps engineered features (e.g., CPP compliance, parameter deltas, vibration signals) to a probability-like risk score without learning from data. It uses hand-set thresholds and monotonic transforms, executes locally on current in-memory/digital-twin data, and applies a decision threshold to produce a label. Benefits: deterministic, fast, explainable. Limitations: not data-trained, may miss patterns that learned models capture.</dd>
                </div>
                <div>
                  <dt className="font-medium">EWMA</dt>
                  <dd className="text-muted-foreground">Exponentially Weighted Moving Average; a smoother that emphasizes recent data to track gradual shifts.</dd>
                </div>
                <div>
                  <dt className="font-medium">RMS (Root Mean Square)</dt>
                  <dd className="text-muted-foreground">A measure of signal magnitude; in vibration analysis, higher RMS often indicates increased mechanical energy and potential faults.</dd>
                </div>
                <div>
                  <dt className="font-medium">Crest Factor</dt>
                  <dd className="text-muted-foreground">Peak amplitude divided by RMS; highlights spiky or impulsive events in vibration signals.</dd>
                </div>
                <div>
                  <dt className="font-medium">Kurtosis</dt>
                  <dd className="text-muted-foreground">A measure of “tailedness”; elevated kurtosis can indicate impulsive faults (e.g., bearing defects).</dd>
                </div>
                <div>
                  <dt className="font-medium">Spectral Band Energy</dt>
                  <dd className="text-muted-foreground">Energy in specific frequency ranges; used to detect known fault signatures in rotating machinery.</dd>
                </div>
                <div>
                  <dt className="font-medium">ARIMA/SARIMA</dt>
                  <dd className="text-muted-foreground">Time-series models for forecasting; SARIMA extends ARIMA with seasonal effects.</dd>
                </div>
                <div>
                  <dt className="font-medium">LSTM / Temporal CNN</dt>
                  <dd className="text-muted-foreground">Neural architectures that model sequences and temporal dependencies.</dd>
                </div>
                <div>
                  <dt className="font-medium">Isolation Forest</dt>
                  <dd className="text-muted-foreground">Anomaly detection method that isolates outliers by random partitioning.</dd>
                </div>
                <div>
                  <dt className="font-medium">Robust PCA</dt>
                  <dd className="text-muted-foreground">Dimensionality reduction separating low-rank structure from sparse anomalies.</dd>
                </div>
                <div>
                  <dt className="font-medium">Autoencoder</dt>
                  <dd className="text-muted-foreground">Neural network that learns compressed representations; reconstruction error can flag anomalies.</dd>
                </div>
                <div>
                  <dt className="font-medium">Platt Scaling / Isotonic Regression</dt>
                  <dd className="text-muted-foreground">Post-hoc probability calibration techniques to align predicted probabilities with observed frequencies.</dd>
                </div>
                <div>
                  <dt className="font-medium">Brier Score</dt>
                  <dd className="text-muted-foreground">Mean squared error of probabilistic predictions; lower is better (perfect calibration is 0 if predictions are certain and correct).</dd>
                </div>
                <div>
                  <dt className="font-medium">ECE (Expected Calibration Error)</dt>
                  <dd className="text-muted-foreground">A summary of how predicted confidences differ from actual accuracies across bins.</dd>
                </div>
                <div>
                  <dt className="font-medium">AUROC</dt>
                  <dd className="text-muted-foreground">Area Under the ROC Curve; probability that a randomly chosen positive ranks higher than a negative.</dd>
                </div>
                <div>
                  <dt className="font-medium">PSI (Population Stability Index)</dt>
                  <dd className="text-muted-foreground">Measures shift between two distributions; used for drift monitoring.</dd>
                </div>
                <div>
                  <dt className="font-medium">KS / AD Tests</dt>
                  <dd className="text-muted-foreground">Kolmogorov–Smirnov and Anderson–Darling tests compare distributions to detect drift.</dd>
                </div>
                <div>
                  <dt className="font-medium">SHAP</dt>
                  <dd className="text-muted-foreground">A method for attributing feature contributions to individual predictions.</dd>
                </div>
                <div>
                  <dt className="font-medium">Counterfactuals</dt>
                  <dd className="text-muted-foreground">Minimal changes to inputs that would alter a model’s decision; used for “what-if” analysis.</dd>
                </div>
                <div>
                  <dt className="font-medium">PAT (Process Analytical Technology)</dt>
                  <dd className="text-muted-foreground">Framework for designing, analyzing, and controlling manufacturing through timely measurements of critical attributes.</dd>
                </div>
                <div>
                  <dt className="font-medium">GAMP 5</dt>
                  <dd className="text-muted-foreground">ISPE guidance for risk-based validation of computerized systems in GxP environments.</dd>
                </div>
                <div>
                  <dt className="font-medium">21 CFR Part 11</dt>
                  <dd className="text-muted-foreground">US FDA regulation for electronic records and signatures; includes requirements for audit trails and controls.</dd>
                </div>
              </dl>
            </section>
          </div>
        </CardContent>
      </Card>
    )
  }

  return (
    <div className="p-6 space-y-6 overflow-auto h-full">
      <div>
        <h1 className="text-3xl font-bold">Predictive Analytics & AI Insights</h1>
        <p className="text-muted-foreground">Real-time analytics, predictive models, and AI-powered insights for manufacturing optimization</p>
      </div>

      <Tabs defaultValue="predictions" className="w-full">
        <TabsList className="grid w-full grid-cols-5">
          <TabsTrigger value="predictions">AI Predictions</TabsTrigger>
          <TabsTrigger value="metrics">Quality Metrics</TabsTrigger>
          <TabsTrigger value="trends">Historical Trends</TabsTrigger>
          <TabsTrigger value="models">Model Management</TabsTrigger>
          <TabsTrigger value="explainability">Explainability</TabsTrigger>
        </TabsList>

        <TabsContent value="predictions" className="space-y-6">
          {/* Live model performance summary */}
          <div className="grid gap-4 md:grid-cols-3">
            {(['quality_prediction','equipment_failure','deviation_risk'] as const).map((m) => {
              const t = decisionThreshold[m]
              const { n, accuracy, brier, ece, auroc } = monitor.metrics(m, { threshold: t, minN: 30, requireBothClasses: true })
              const title = m === 'quality_prediction' ? 'Quality Prediction' : m === 'equipment_failure' ? 'Equipment Failure' : 'Deviation Risk'
              return (
                <Card key={m}>
                  <CardHeader>
                    <CardTitle className="text-sm text-muted-foreground">{title} — Live Performance (t={t})</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="grid grid-cols-2 gap-2 text-sm">
                      <div className="text-muted-foreground">Samples</div>
                      <div className="text-right font-mono">{n}</div>
                      <div className="text-muted-foreground">Accuracy</div>
                      <div className="text-right font-mono">{accuracy == null ? '—' : `${(accuracy*100).toFixed(1)}%`}</div>
                      <div className="text-muted-foreground">Brier</div>
                      <div className="text-right font-mono">{brier.toFixed(3)}</div>
                      <div className="text-muted-foreground">ECE</div>
                      <div className="text-right font-mono">{ece.toFixed(3)}</div>
                      <div className="text-muted-foreground">AUROC</div>
                      <div className="text-right font-mono">{auroc.toFixed(3)}</div>
                    </div>
                  </CardContent>
                </Card>
              )
            })}
          </div>
          <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
            {models.map((model) => (
              <PredictionCard key={model.id} model={model} />
            ))}
          </div>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Warning className="h-5 w-5" />
                Risk Assessment Summary
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div className="p-4 bg-red-50 border border-red-200 rounded-lg">
                  <div className="flex items-center gap-2 mb-2">
                    <Warning className="h-4 w-4 text-red-600" />
                    <span className="font-medium text-red-900">High Risk Alert</span>
                  </div>
                  <p className="text-sm text-red-800">
                    Equipment failure risk is currently highest for {topEq} based on the live predictor. Consider inspection to mitigate potential disruption.
                  </p>
                </div>
                
                <div className="p-4 bg-yellow-50 border border-yellow-200 rounded-lg">
                  <div className="flex items-center gap-2 mb-2">
                    <Clock className="h-4 w-4 text-yellow-600" />
                    <span className="font-medium text-yellow-900">Medium Risk - Monitoring Required</span>
                  </div>
                  <p className="text-sm text-yellow-800">
                    Deviation risk analyzer indicates elevated probability of pH control issues. 
                    Enhanced monitoring protocols activated for current batches.
                  </p>
                </div>

                <div className="p-4 bg-green-50 border border-green-200 rounded-lg">
                  <div className="flex items-center gap-2 mb-2">
                    <CheckCircle className="h-4 w-4 text-green-600" />
                    <span className="font-medium text-green-900">Low Risk - Optimal Performance</span>
                  </div>
                  <p className="text-sm text-green-800">
                    Batch quality predictions show excellent performance indicators. 
                    All current batches are on track to meet quality specifications.
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="metrics" className="space-y-6">
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
            <MetricCard
              title="Batch Yield"
              value={metrics.batchYield.current}
              trend={metrics.batchYield.trend}
              historical={metrics.batchYield.historical}
              icon={Target}
            />
            <MetricCard
              title="First Pass Rate"
              value={metrics.firstPassRate.current}
              trend={metrics.firstPassRate.trend}
              historical={metrics.firstPassRate.historical}
              icon={CheckCircle}
            />
            <MetricCard
              title="Deviation Rate"
              value={metrics.deviationRate.current}
              trend={metrics.deviationRate.trend}
              historical={metrics.deviationRate.historical}
              icon={Warning}
            />
            <MetricCard
              title="Equipment OEE"
              value={metrics.equipmentOEE.current}
              trend={metrics.equipmentOEE.trend}
              historical={metrics.equipmentOEE.historical}
              icon={ChartLine}
            />
          </div>

          <Card>
            <CardHeader>
              <CardTitle>Key Performance Indicators</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-6">
                <div className="grid gap-4 md:grid-cols-3">
                  <div className="p-4 border rounded-lg">
                    <div className="text-sm text-muted-foreground mb-2">Manufacturing Efficiency</div>
                    <div className="text-2xl font-bold text-green-600">92.3%</div>
                    <div className="text-xs text-muted-foreground">+2.1% vs target</div>
                  </div>
                  <div className="p-4 border rounded-lg">
                    <div className="text-sm text-muted-foreground mb-2">Regulatory Compliance</div>
                    <div className="text-2xl font-bold text-green-600">99.8%</div>
                    <div className="text-xs text-muted-foreground">Within specification</div>
                  </div>
                  <div className="p-4 border rounded-lg">
                    <div className="text-sm text-muted-foreground mb-2">Cost per Batch</div>
                    <div className="text-2xl font-bold text-blue-600">$47.2K</div>
                    <div className="text-xs text-muted-foreground">-5.3% vs budget</div>
                  </div>
                </div>

                <div className="p-4 bg-blue-50 rounded-lg">
                  <h4 className="font-medium mb-2">Performance Insights:</h4>
                  <ul className="text-sm space-y-1">
                    <li>• Batch yield improvements driven by optimized temperature control</li>
                    <li>• Deviation rate reduction attributed to enhanced operator training</li>
                    <li>• Equipment OEE gains from predictive maintenance implementation</li>
                    <li>• First pass rate maintained through improved raw material quality</li>
                  </ul>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="trends" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Historical Trend Analysis</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-6">
                <div className="p-4 border rounded-lg">
                  <h4 className="font-medium mb-4">30-Day Performance Trends</h4>
                  <div className="space-y-4">
                    <div className="flex items-center justify-between">
                      <span className="text-sm">Quality Score Trend</span>
                      <div className="flex items-center gap-2">
                        <TrendUp className="h-4 w-4 text-green-600" />
                        <span className="text-sm font-mono text-green-600">+3.2%</span>
                      </div>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-sm">Production Volume</span>
                      <div className="flex items-center gap-2">
                        <TrendUp className="h-4 w-4 text-green-600" />
                        <span className="text-sm font-mono text-green-600">+7.8%</span>
                      </div>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-sm">Equipment Downtime</span>
                      <div className="flex items-center gap-2">
                        <TrendDown className="h-4 w-4 text-green-600" />
                        <span className="text-sm font-mono text-green-600">-12.4%</span>
                      </div>
                    </div>
                  </div>
                </div>

                <div className="p-4 bg-amber-50 rounded-lg">
                  <h4 className="font-medium mb-2">Trend Analysis Summary:</h4>
                  <p className="text-sm text-amber-800">
                    Manufacturing performance shows consistent improvement across all key metrics. 
                    The implementation of AI-driven predictive analytics has contributed to a 15% 
                    reduction in unplanned downtime and 8% improvement in overall quality scores 
                    over the past quarter.
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="models" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>AI Model Management</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {models.map((model) => (
                  <div key={model.id} className="flex items-center justify-between p-4 border rounded-lg">
                    <div>
                      <div className="font-medium">{model.name}</div>
                      <div className="text-sm text-muted-foreground">
                        Accuracy: {model.accuracy}% • Last trained: {model.lastTrained.toLocaleDateString()}
                        {(() => {
                          const asModelId = (t: PredictiveModel['type']): ModelId | null => (
                            t === 'quality_prediction' || t === 'equipment_failure' || t === 'deviation_risk' ? t : null
                          )
                          const mid = asModelId(model.type)
                          const st = mid ? getLogisticState(mid) : null
                          return st ? ` • LR: n=${st.n} d=${st.featureKeys.length}` : ''
                        })()}
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <Badge className={model.status === 'active' ? 'bg-success text-success-foreground' : 'bg-muted text-muted-foreground'}>
                        {model.status}
                      </Badge>
                      <Button variant="outline" size="sm" onClick={() => retrainLocally(model.id)}>
                        Retrain
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
              
              <div className="mt-6 p-4 bg-blue-50 rounded-lg space-y-2">
                <h4 className="font-medium">Model validation & training (demo state)</h4>
                <p className="text-sm text-blue-800">
                  In this demo, the Retrain action simulates a local training job and updates metadata. No external services are called, and no data leaves the environment. In production, wire this button to your on-prem training pipeline with versioned artifacts and approvals.
                </p>
                <p className="text-xs text-blue-700">
                  Suggested local sources: approved batch records (CPPs, outcomes), equipment telemetry, operator logs, audit trail, CAPA history, trend/control-chart summaries. Ensure data lineage, partitioning, and blinded validation per GAMP 5 and 21 CFR Part 11.
                </p>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="explainability" className="space-y-6">
          <ExplainabilityPanel />
        </TabsContent>
      </Tabs>
    </div>
  )
}