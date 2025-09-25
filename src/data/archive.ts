import { batches, equipmentCalibration, equipmentTelemetry, type BatchData } from '@/data/seed'

export type InvestigationSource = {
  id: string // e.g., S1, S2
  title: string
  type: 'batch-record' | 'equipment-telemetry' | 'calibration-record' | 'gmp-guidance'
  content: string
  meta?: Record<string, unknown>
}

const getBatchById = (id: string): BatchData | undefined => batches.find(b => b.id === id)

const gmpExcerpt = `EU GMP Annex 1 (2022) excerpt: "Critical process parameters (CPPs) should be defined based on knowledge and risk assessment. Deviations from CPP ranges must be investigated and assessed for impact on product quality. Control systems should detect excursions and initiate corrective actions to maintain the state of control."`

export const buildInvestigationSources = (batchId?: string): InvestigationSource[] => {
  const sources: InvestigationSource[] = []
  if (batchId) {
    const batch = getBatchById(batchId)
    if (batch) {
      sources.push({
        id: 'S1',
        title: `Batch Record ${batch.id}`,
        type: 'batch-record',
        content: [
          `Product: ${batch.product}`,
          `Stage: ${batch.stage}`,
          `Parameters: T=${batch.parameters.temperature.current}${batch.parameters.temperature.unit} (target ${batch.parameters.temperature.target}),`,
          `P=${batch.parameters.pressure.current}${batch.parameters.pressure.unit} (target ${batch.parameters.pressure.target}),`,
          `pH=${batch.parameters.pH.current} (target ${batch.parameters.pH.target}),`,
          `V=${batch.parameters.volume.current}${batch.parameters.volume.unit} (target ${batch.parameters.volume.target})`,
        ].join(' '),
        meta: { cppBounds: batch.cppBounds, timeline: batch.timeline.map(t => ({ stage: t.stage, status: t.status })) }
      })

      const eqCal = batch.equipment.map(id => equipmentCalibration.find(c => c.id === id)).filter(Boolean)
      if (eqCal.length) {
        sources.push({
          id: 'S2',
          title: `Calibration Records (${eqCal.map(c => c!.id).join(', ')})`,
          type: 'calibration-record',
          content: eqCal.map(c => `${c!.id}: status=${c!.status}, last=${new Date(c!.lastCalibration).toLocaleDateString()}, next=${new Date(c!.nextDue).toLocaleDateString()}`).join(' | '),
        })
      }

      const tel = batch.equipment.map(id => equipmentTelemetry.find(t => t.id === id)).filter(Boolean)
      if (tel.length) {
        sources.push({
          id: 'S3',
          title: `Equipment Telemetry (${tel.map(t => t!.id).join(', ')})`,
          type: 'equipment-telemetry',
          content: tel.map(t => `${t!.id}: vibration=${t!.vibrationRMS} mm/s (alert=${t!.vibrationAlert ? 'yes' : 'no'}), tempVar=${t!.temperatureVar} °C, uptime=${t!.uptimeHours}h`).join(' | '),
        })
      }
    }
  }

  sources.push({ id: 'S4', title: 'GMP Guidance (Annex 1 excerpt)', type: 'gmp-guidance', content: gmpExcerpt })
  return sources
}

export const sourcesToString = (sources: InvestigationSource[]) =>
  sources.map(s => `[${s.id}] ${s.title}: ${s.content}`).join('\n')
