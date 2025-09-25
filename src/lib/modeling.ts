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

  metrics(model: ModelId) {
    const rs = this.getRecords(model)
    const n = rs.length
    if (!n) return { n: 0, accuracy: 0, brier: 0, ece: 0, auroc: 0 }
    const accuracy = rs.filter(r => (r.p >= 0.5 ? 1 : 0) === r.y).length / n
    const brier = rs.reduce((s, r) => s + (r.p - r.y) * (r.p - r.y), 0) / n
    const ece = expectedCalibrationError(rs, 5)
    const auroc = computeAUROC(rs)
    return { n, accuracy, brier, ece, auroc }
  }
}

export const monitor = new ModelMonitor()

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

// Convenience: produce a few fresh predictions and record them
export function sampleAndRecordPredictions() {
  const now = Date.now()
  const pickBatchForQuality = batches.reduce((a, b) => (getCPPCompliance(a) < getCPPCompliance(b) ? a : b))
  const pickBatchForDeviation = batches.reduce((a, b) => (deviationScore(a) > deviationScore(b) ? a : b))
  const pickEq = equipmentTelemetry.reduce((a, b) => (a.vibrationRMS + (a.vibrationAlert ? 2 : 0)) > (b.vibrationRMS + (b.vibrationAlert ? 2 : 0)) ? a : b)

  const q = predictQuality(pickBatchForQuality)
  monitor.add({ id: pickBatchForQuality.id, model: 'quality_prediction', timestamp: now, p: q.p, y: q.y, features: q.features })
  const d = predictDeviationRisk(pickBatchForDeviation)
  monitor.add({ id: pickBatchForDeviation.id, model: 'deviation_risk', timestamp: now, p: d.p, y: d.y, features: d.features })
  const e = predictEquipmentFailure(pickEq)
  monitor.add({ id: pickEq.id, model: 'equipment_failure', timestamp: now, p: e.p, y: e.y, features: e.features })
}

function deviationScore(batch: BatchData) {
  const { cppBounds: s, parameters: p } = batch
  const dist = (
    Math.abs(p.temperature.current - (s.temperature.min + s.temperature.max) / 2) / ((s.temperature.max - s.temperature.min) / 2) +
    Math.abs(p.pressure.current - (s.pressure.min + s.pressure.max) / 2) / ((s.pressure.max - s.pressure.min) / 2) +
    Math.abs(p.pH.current - (s.pH.min + s.pH.max) / 2) / ((s.pH.max - s.pH.min) / 2)
  ) / 3
  return dist
}
