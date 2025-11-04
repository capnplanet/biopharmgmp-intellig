import { useEffect } from 'react'
import { useKV } from '@github/spark/hooks'
import { subscribeToTwin } from '@/lib/digitalTwin'
import { useAuditLogger } from '@/hooks/use-audit'
import type { Deviation } from '@/types/quality'

// Seeds deviations from digital twin OOS/OOT conditions into the shared KV store.
// Mount this once at app root to ensure consistent data across modules.
export function useSeedDeviationsFromTwin() {
  const [deviations, setDeviations] = useKV<Deviation[]>('deviations', [])
  const { log } = useAuditLogger()

  useEffect(() => {
    const unsub = subscribeToTwin((snapshot) => {
      const newDeviations: Deviation[] = []
      snapshot.batches.forEach(batch => {
        const params = batch.parameters
        const bounds = batch.cppBounds
        // OOS: outside bounds
        const oosParams = Object.keys(params).filter(key => {
          const k = key as keyof typeof params
          return params[k].current < bounds[k].min || params[k].current > bounds[k].max
        })
        if (oosParams.length > 0) {
          const alreadyLogged = (deviations || []).some(d => d.batchId === batch.id && d.status === 'open' && d.title.includes('OOS'))
          if (!alreadyLogged) {
            newDeviations.push({
              id: `OOS-${batch.id}-${Date.now()}`,
              title: `OOS detected in batch ${batch.id}`,
              description: `Out of spec: ${oosParams.join(', ')}. Current values: ${oosParams.map(k => `${k}: ${params[k as keyof typeof params].current.toFixed(2)}`).join(', ')}`,
              severity: 'critical',
              status: 'open',
              batchId: batch.id,
              reportedBy: 'Digital Twin',
              reportedDate: new Date(),
            })
          }
        }
        // OOT: trending toward bounds (within 10% of range but not OOS)
        const ootParams = Object.keys(params).filter(key => {
          const k = key as keyof typeof params
          const range = bounds[k].max - bounds[k].min
          return (
            params[k].current > bounds[k].max - 0.1 * range ||
            params[k].current < bounds[k].min + 0.1 * range
          ) && !(params[k].current < bounds[k].min || params[k].current > bounds[k].max)
        })
        if (ootParams.length > 0) {
          const alreadyLogged = (deviations || []).some(d => d.batchId === batch.id && d.status === 'open' && d.title.includes('OOT'))
          if (!alreadyLogged) {
            newDeviations.push({
              id: `OOT-${batch.id}-${Date.now()}`,
              title: `OOT detected in batch ${batch.id}`,
              description: `Out of trend: ${ootParams.join(', ')}. Current values: ${ootParams.map(k => `${k}: ${params[k as keyof typeof params].current.toFixed(2)}`).join(', ')}`,
              severity: 'high',
              status: 'open',
              batchId: batch.id,
              reportedBy: 'Digital Twin',
              reportedDate: new Date(),
            })
          }
        }
      })
      if (newDeviations.length > 0) {
        setDeviations((current = []) => {
          const next = [...newDeviations, ...current]
          try {
            newDeviations.forEach(dev => {
              const origin = dev.origin || 'digital-twin'
              log('Deviation Auto-Logged', 'deviation', `${dev.title} [origin=${origin}]`, { recordId: dev.id })
            })
          } catch {}
          return next
        })
      }
    })
  return () => { unsub() }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [setDeviations, deviations])
}
