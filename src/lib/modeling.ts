import { batches, equipmentTelemetry, getCPPCompliance, BatchData, EquipmentTelemetry as EqT } from '@/data/seed'

export type ModelId = 'quality_prediction' | 'equipment_failure' | 'deviation_risk'

export type Features = Record<string, number>

export type PredictionRecord = {
  id: string
  model: ModelId
  timestamp: number
  p: number // predicted probability [0,1]
  y: 0 | 1 // observed outcome
  features: Features
}

// Simple singleton monitor
class ModelMonitor {
  private records: PredictionRecord[] = []

  add(record: PredictionRecord) {
    this.records.push(record)
  }

  getRecords(model?: ModelId) {
    return model ? this.records.filter(r => r.model === model) : this.records.slice()
  }

  metrics(
    model: ModelId,
    opts?: { threshold?: number; minN?: number; requireBothClasses?: boolean }
  ) {
    const t = opts?.threshold ?? 0.5
    const minN = opts?.minN ?? 1
    const needBoth = opts?.requireBothClasses ?? false
    const rs = this.getRecords(model)
    const n = rs.length
    if (!n) return { n: 0, accuracy: null as number | null, brier: 0, ece: 0, auroc: 0, threshold: t, hasPosNeg: false }
    const preds = rs.map(r => ({ c: r.p >= t ? 1 : 0 as 0|1, y: r.y }))
    const pos = rs.filter(r => r.y === 1).length
    const neg = rs.filter(r => r.y === 0).length
    const hasPosNeg = pos > 0 && neg > 0
    const rawAcc = preds.filter(x => x.c === x.y).length / n
    const brier = rs.reduce((s, r) => s + (r.p - r.y) * (r.p - r.y), 0) / n
    const ece = expectedCalibrationError(rs, 5)
    const auroc = computeAUROC(rs)
    const accuracy: number | null = (n >= minN && (!needBoth || hasPosNeg)) ? rawAcc : null
    return { n, accuracy, brier, ece, auroc, threshold: t, hasPosNeg }
  }
}

export const monitor = new ModelMonitor()

// Per-model decision thresholds for converting probabilities to classes
export const decisionThreshold: Record<ModelId, number> = {
  quality_prediction: 0.95, // strict since y=1 means all CPPs in spec
  deviation_risk: 0.5,
  equipment_failure: 0.5,
}

// Expected Calibration Error with equal-width bins
function expectedCalibrationError(rs: PredictionRecord[], bins = 5) {
  const hist: { sumP: number; sumY: number; count: number }[] = Array.from({ length: bins }, () => ({ sumP: 0, sumY: 0, count: 0 }))
  for (const r of rs) {
    const b = Math.min(bins - 1, Math.max(0, Math.floor(r.p * bins)))
    hist[b].sumP += r.p
    hist[b].sumY += r.y
    hist[b].count += 1
  }
  let ece = 0
  for (const h of hist) {
    if (h.count === 0) continue
    const conf = h.sumP / h.count
    const acc = h.sumY / h.count
    ece += (h.count / rs.length) * Math.abs(conf - acc)
  }
  return ece
}

// AUROC via rank-based calculation (ties handled by average rank)
function computeAUROC(rs: PredictionRecord[]) {
  const pos = rs.filter(r => r.y === 1)
  const neg = rs.filter(r => r.y === 0)
  const nPos = pos.length
  const nNeg = neg.length
  if (nPos === 0 || nNeg === 0) return 0
  const sorted = rs.slice().sort((a, b) => a.p - b.p)
  // assign ranks 1..n, average ranks for ties
  const ranks: number[] = new Array(sorted.length)
  let i = 0
  while (i < sorted.length) {
    let j = i
    while (j + 1 < sorted.length && sorted[j + 1].p === sorted[i].p) j++
    const avgRank = (i + j + 2) / 2 // 1-indexed average rank
    for (let k = i; k <= j; k++) ranks[k] = avgRank
    i = j + 1
  }
  let sumPosRanks = 0
  for (let idx = 0; idx < sorted.length; idx++) {
    if (sorted[idx].y === 1) sumPosRanks += ranks[idx]
  }
  const auc = (sumPosRanks - (nPos * (nPos + 1)) / 2) / (nPos * nNeg)
  return auc
}

// ---------- Predictors and outcomes ----------

export function predictQuality(batch: BatchData) {
  const cpp = getCPPCompliance(batch) // [0,1]
  // Simple mapping with small smoothing
  const p = clamp(0.05 + 0.9 * cpp, 0, 1)
  const features: Features = {
    cpp_compliance: cpp,
    temp_delta: Math.abs(batch.parameters.temperature.current - batch.parameters.temperature.target),
    pressure_delta: Math.abs(batch.parameters.pressure.current - batch.parameters.pressure.target),
    ph_delta: Math.abs(batch.parameters.pH.current - batch.parameters.pH.target),
  }
  const y = outcomeQuality(batch)
  return { p, y, features }
}

export function outcomeQuality(batch: BatchData): 0 | 1 {
  return getCPPCompliance(batch) === 1 ? 1 : 0
}

export function predictDeviationRisk(batch: BatchData) {
  // Risk based on max normalized deviation from mid-spec
  const { cppBounds: s, parameters: p } = batch
  const norm = (val: number, min: number, max: number) => Math.abs(val - (min + max) / 2) / ((max - min) / 2)
  const devs = [
    norm(p.temperature.current, s.temperature.min, s.temperature.max),
    norm(p.pressure.current, s.pressure.min, s.pressure.max),
    norm(p.pH.current, s.pH.min, s.pH.max),
  ]
  const risk = clamp(Math.max(...devs), 0, 2) / 2 // map to [0,1]
  const features: Features = {
    temp_norm_dev: devs[0],
    pressure_norm_dev: devs[1],
    ph_norm_dev: devs[2],
  }
  const y = outcomeDeviation(batch)
  return { p: risk, y, features }
}

export function outcomeDeviation(batch: BatchData): 0 | 1 {
  const { parameters, cppBounds } = batch
  const outOfSpec = !(
    parameters.temperature.current >= cppBounds.temperature.min && parameters.temperature.current <= cppBounds.temperature.max &&
    parameters.pressure.current >= cppBounds.pressure.min && parameters.pressure.current <= cppBounds.pressure.max &&
    parameters.pH.current >= cppBounds.pH.min && parameters.pH.current <= cppBounds.pH.max &&
    parameters.volume.current >= cppBounds.volume.min && parameters.volume.current <= cppBounds.volume.max
  )
  return outOfSpec ? 1 : 0
}

export function predictEquipmentFailure(eq: EqT) {
  // Simple weighted combination of RMS and temperature variance; alert spikes risk
  const rms = eq.vibrationRMS // typical small numbers (1-5 mm/s)
  // Normalize RMS to [0,1] using a reasonable scale: 0..6 mm/s
  const rmsN = clamp(rms / 6, 0, 1)
  const tvarN = clamp(eq.temperatureVar / 0.6, 0, 1) // rough scale
  const raw = 0.6 * rmsN + 0.3 * tvarN + (eq.vibrationAlert ? 0.2 : 0)
  const p = clamp(raw, 0, 1)
  const features: Features = {
    rms: rms,
    rms_norm: rmsN,
    temp_var: eq.temperatureVar,
    temp_var_norm: tvarN,
    alert_flag: eq.vibrationAlert ? 1 : 0,
  }
  const y = outcomeEquipment(eq)
  return { p, y, features }
}

export function outcomeEquipment(eq: EqT): 0 | 1 {
  return eq.vibrationAlert ? 1 : 0
}

export function clamp(x: number, lo: number, hi: number) {
  return Math.max(lo, Math.min(hi, x))
}

// ---------- Minimal on-device Logistic Regression ----------

type LRState = {
  // feature order; vector x aligns with keys in this array
  featureKeys: string[]
  weights: Float64Array // length = d
  bias: number
  mean: Float64Array // standardization mean
  std: Float64Array // standardization std (>= 1e-6)
  trainedAt: number
  n: number // samples used to train
}

const lrRegistry: Partial<Record<ModelId, LRState>> = {}

function sigmoid(z: number) {
  // clamp to avoid overflow
  if (z >= 0) {
    const ez = Math.exp(-z)
    return 1 / (1 + ez)
  } else {
    const ez = Math.exp(z)
    return ez / (1 + ez)
  }
}

function buildFeatureKeys(records: PredictionRecord[]): string[] {
  const set = new Set<string>()
  for (const r of records) {
    for (const k of Object.keys(r.features)) set.add(k)
  }
  return Array.from(set)
}

function vectorize(features: Features, keys: string[]): Float64Array {
  const x = new Float64Array(keys.length)
  for (let j = 0; j < keys.length; j++) x[j] = Number(features[keys[j]] ?? 0)
  return x
}

function standardizeFit(X: Float64Array[]): { mean: Float64Array; std: Float64Array } {
  const d = X[0].length
  const mean = new Float64Array(d)
  const std = new Float64Array(d)
  for (const x of X) {
    for (let j = 0; j < d; j++) mean[j] += x[j]
  }
  for (let j = 0; j < d; j++) mean[j] /= X.length
  for (const x of X) {
    for (let j = 0; j < d; j++) {
      const v = x[j] - mean[j]
      std[j] += v * v
    }
  }
  for (let j = 0; j < d; j++) std[j] = Math.sqrt(std[j] / Math.max(1, X.length - 1)) || 1
  // floor std to avoid divide-by-zero
  for (let j = 0; j < d; j++) if (std[j] < 1e-6) std[j] = 1
  return { mean, std }
}

function standardizeApply(x: Float64Array, mean: Float64Array, std: Float64Array): Float64Array {
  const d = x.length
  const z = new Float64Array(d)
  for (let j = 0; j < d; j++) z[j] = (x[j] - mean[j]) / std[j]
  return z
}

export type LRTrainOptions = {
  learningRate?: number
  epochs?: number
  l2?: number
  minSamples?: number
  requireBothClasses?: boolean
}

/**
 * Train a per-model logistic regression from monitor records. Stores the model in-memory.
 * Returns true if trained/updated; false if insufficient data.
 */
export function trainLogisticForModel(model: ModelId, opts?: LRTrainOptions): boolean {
  const lr = opts?.learningRate ?? 0.1
  const epochs = opts?.epochs ?? 200
  const l2 = opts?.l2 ?? 1e-3
  const minN = opts?.minSamples ?? 60
  const needBoth = opts?.requireBothClasses ?? true
  const rs = monitor.getRecords(model)
  if (rs.length < minN) return false
  const pos = rs.filter(r => r.y === 1).length
  const neg = rs.filter(r => r.y === 0).length
  if (needBoth && (pos === 0 || neg === 0)) return false

  const keys = buildFeatureKeys(rs)
  const Xraw: Float64Array[] = rs.map(r => vectorize(r.features, keys))
  const y = rs.map(r => r.y)
  const { mean, std } = standardizeFit(Xraw)
  const X = Xraw.map(x => standardizeApply(x, mean, std))

  const d = keys.length
  const w = new Float64Array(d)
  let b = 0

  // simple batch gradient descent on cross-entropy with L2
  for (let epoch = 0; epoch < epochs; epoch++) {
  const gradW = new Float64Array(d)
    let gradB = 0
    for (let i = 0; i < X.length; i++) {
      const xi = X[i]
      let z = b
      for (let j = 0; j < d; j++) z += w[j] * xi[j]
      const p = sigmoid(z)
      const err = p - y[i]
      for (let j = 0; j < d; j++) gradW[j] += err * xi[j]
      gradB += err
    }
    // average and add L2
    for (let j = 0; j < d; j++) gradW[j] = gradW[j] / X.length + l2 * w[j]
    gradB = gradB / X.length
    // update
    for (let j = 0; j < d; j++) w[j] -= lr * gradW[j]
    b -= lr * gradB
  }

  lrRegistry[model] = {
    featureKeys: keys,
    weights: w,
    bias: b,
    mean,
    std,
    trainedAt: Date.now(),
    n: rs.length,
  }
  return true
}

/** Predict probability using the learned logistic model if available; returns null if not present */
export function predictLogisticProb(model: ModelId, features: Features): number | null {
  const st = lrRegistry[model]
  if (!st) return null
  const x = vectorize(features, st.featureKeys)
  const z = standardizeApply(x, st.mean, st.std)
  let s = st.bias
  for (let j = 0; j < st.weights.length; j++) s += st.weights[j] * z[j]
  return clamp(sigmoid(s), 0, 1)
}

export function getLogisticState(model: ModelId): (LRState & { model: ModelId }) | null {
  const st = lrRegistry[model]
  return st ? { ...st, model } : null
}

// Convenience: produce a few fresh predictions and record them
export function sampleAndRecordPredictions() {
  const now = Date.now()
  // Record across all batches to include positives and negatives
  for (const b of batches) {
    const q = predictQuality(b)
    const qp = predictLogisticProb('quality_prediction', q.features) ?? q.p
    monitor.add({ id: b.id, model: 'quality_prediction', timestamp: now, p: qp, y: q.y, features: q.features })
    const d = predictDeviationRisk(b)
    const dp = predictLogisticProb('deviation_risk', d.features) ?? d.p
    monitor.add({ id: b.id, model: 'deviation_risk', timestamp: now, p: dp, y: d.y, features: d.features })
  }
  // Record for all equipment to mix alert/non-alert
  for (const eq of equipmentTelemetry) {
    const e = predictEquipmentFailure(eq)
    const ep = predictLogisticProb('equipment_failure', e.features) ?? e.p
    monitor.add({ id: eq.id, model: 'equipment_failure', timestamp: now, p: ep, y: e.y, features: e.features })
  }
}

// (deviationScore helper no longer used after broad sampling)
