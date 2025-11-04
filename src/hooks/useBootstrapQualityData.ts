import { useEffect } from 'react'
import { useKV } from '@github/spark/hooks'
import type { CAPA, ChangeControl, Deviation, Investigation } from '@/types/quality'
import { mockDeviations, mockCAPAs, mockInvestigations } from '@/components/QualityManagement'
import { useAuditLogger } from '@/hooks/use-audit'

// Initialize quality KV stores with defaults if empty so Dashboard and eQMS are in sync on first load.
export function useBootstrapQualityData() {
  const [deviations, setDeviations] = useKV<Deviation[]>('deviations')
  const [capas, setCAPAs] = useKV<CAPA[]>('capas')
  const [investigations, setInvestigations] = useKV<Investigation[]>('investigations')
  const [changeControls, setChangeControls] = useKV<ChangeControl[]>('change-controls')
  const { log } = useAuditLogger()

  useEffect(() => {
    // Seed deviations and investigations only if entirely empty
    let seeded = false
    if (!deviations || deviations.length === 0) {
      setDeviations((current = []) => {
        if (current.length > 0) return current
        seeded = true
        return mockDeviations
      })
    }
    if (!investigations || investigations.length === 0) {
      setInvestigations((current = []) => (current.length > 0 ? current : mockInvestigations))
    }
    if (!capas || capas.length === 0) {
      setCAPAs((current = []) => (current.length > 0 ? current : mockCAPAs))
    }
    // Leave change-controls as-is unless needed in the future; currently defined in component with defaults
    if (!changeControls) {
      setChangeControls((current = []) => current)
    }
    try {
      if (seeded) {
        log('Quality Bootstrap Seed', 'quality', `Seeded initial deviations (${mockDeviations.length}), CAPAs (${mockCAPAs.length}), investigations (${mockInvestigations.length}).`)
      }
    } catch {}
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])
}
