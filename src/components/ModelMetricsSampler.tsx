import { useEffect } from 'react'
import { useKV } from '@github/spark/hooks'
import { monitor, decisionThreshold, type ModelId, sampleAndRecordPredictions } from '@/lib/modeling'

type MetricsPoint = {
  t: number
  id: ModelId
  n: number
  auroc: number
  brier: number
  ece: number
  threshold: number
}

const MODEL_IDS: ModelId[] = ['quality_prediction', 'deviation_risk', 'equipment_failure']
const SAMPLE_INTERVAL_MS = 30_000 // real-time sampling cadence
const MAX_POINTS = 500 // retention across all models combined

export function ModelMetricsSampler() {
  const [, setHistory] = useKV<MetricsPoint[]>('model-metrics-history', [])

  useEffect(() => {
    // Kickstart: generate prediction records immediately, then record first metrics sample
    try {
      sampleAndRecordPredictions()
      const t0 = Date.now()
      const initial: MetricsPoint[] = MODEL_IDS.map(id => {
        const m = monitor.metrics(id, { threshold: decisionThreshold[id], minN: 10, requireBothClasses: false })
        return { t: t0, id, n: m.n, auroc: m.auroc, brier: m.brier, ece: m.ece, threshold: m.threshold }
      })
      setHistory((curr = []) => {
        const next = [...curr, ...initial]
        return next.length > MAX_POINTS ? next.slice(next.length - MAX_POINTS) : next
      })
      // Best-effort forward metrics summary to backend
      try {
        for (const p of initial) {
          fetch('/api/metrics', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(p), keepalive: true }).catch(() => {})
        }
      } catch {}
    } catch {}

    const timer = window.setInterval(() => {
      try {
        const t = Date.now()
        const pts: MetricsPoint[] = MODEL_IDS.map(id => {
          const m = monitor.metrics(id, { threshold: decisionThreshold[id], minN: 10, requireBothClasses: false })
          return { t, id, n: m.n, auroc: m.auroc, brier: m.brier, ece: m.ece, threshold: m.threshold }
        })
        setHistory((curr = []) => {
          const next = [...curr, ...pts]
          // Retain only the last MAX_POINTS
          return next.length > MAX_POINTS ? next.slice(next.length - MAX_POINTS) : next
        })
        // Best-effort forward metrics summary to backend
        try {
          for (const p of pts) {
            fetch('/api/metrics', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(p), keepalive: true }).catch(() => {})
          }
        } catch {}
      } catch {
        // ignore sampling errors
      }
    }, SAMPLE_INTERVAL_MS)
    return () => window.clearInterval(timer)
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  return null
}

export default ModelMetricsSampler
