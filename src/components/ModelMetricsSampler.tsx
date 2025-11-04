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
    // Helper: compute metrics snapshot for all models
    const snapshot = (): MetricsPoint[] => {
      const t = Date.now()
      return MODEL_IDS.map((id) => {
        const m = monitor.metrics(id, { threshold: decisionThreshold[id], minN: 10, requireBothClasses: false })
        return { t, id, n: m.n, auroc: m.auroc, brier: m.brier, ece: m.ece, threshold: m.threshold }
      })
    }

    // Helper: forward metrics to backend (best-effort)
    const postPoints = (points: MetricsPoint[]) => {
      try {
        const auth = import.meta.env.VITE_BACKEND_AUTH_TOKEN
        const role = import.meta.env.VITE_RBAC_ROLE
        const headers: Record<string, string> = { 'Content-Type': 'application/json' }
        if (auth) headers['Authorization'] = `Bearer ${auth}`
        if (role) headers['X-User-Role'] = role
        for (const p of points) {
          fetch('/api/metrics', { method: 'POST', headers, body: JSON.stringify(p), keepalive: true }).catch(() => {})
        }
      } catch {
        // ignore forwarding errors
      }
    }

    // Kickstart: generate records and push initial snapshot
    try {
      sampleAndRecordPredictions()
      const initial = snapshot()
      setHistory((curr = []) => {
        const next = [...curr, ...initial]
        return next.length > MAX_POINTS ? next.slice(next.length - MAX_POINTS) : next
      })
      postPoints(initial)
    } catch {
      // ignore initial sampling errors
    }

    const timer = window.setInterval(() => {
      try {
        sampleAndRecordPredictions()
        const pts = snapshot()
        setHistory((curr = []) => {
          const next = [...curr, ...pts]
          return next.length > MAX_POINTS ? next.slice(next.length - MAX_POINTS) : next
        })
        postPoints(pts)
      } catch {
        // ignore interval sampling errors
      }
    }, SAMPLE_INTERVAL_MS)

    return () => window.clearInterval(timer)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  return null
}

export default ModelMetricsSampler
