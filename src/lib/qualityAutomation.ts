import { subscribeToTwin, type TwinSnapshot } from '@/lib/digitalTwin'
import type { Deviation } from '@/types/quality'
import type { AutomationSuggestion, AutomationTrigger } from '@/types/automation'

export type AutomationProposalDetail = {
  trigger: AutomationTrigger
  batchId: string
  parameter: 'temperature' | 'pressure' | 'pH' | 'volume'
  measurement: {
    value: number
    target: number
    min: number
    max: number
    deviation: number
    compliance: number
  }
  deviation: Deviation
  suggestion: AutomationSuggestion
}

const PARAMETER_LABELS: Record<string, string> = {
  temperature: 'Temperature',
  pressure: 'Pressure',
  pH: 'pH',
  volume: 'Volume',
}

const PARAMETER_UNITS: Record<string, string> = {
  temperature: '°C',
  pressure: 'bar',
  pH: 'pH',
  volume: 'L',
}

const activeTriggers = new Map<string, string>()
const trendState = new Map<string, { lastValue: number; counter: number }>()
const deviationLookup = new Map<string, string>()
let initialized = false

const createDeviationId = (batchId: string, trigger: AutomationTrigger, parameter: string) => {
  const ts = new Date().toISOString().replace(/[-:TZ.]/g, '').slice(0, 14)
  const suffix = Math.floor(Math.random() * 1000).toString().padStart(3, '0')
  return `DEV-${ts}-${batchId}-${parameter.toUpperCase()}-${trigger}-${suffix}`
}

const createSuggestionId = () => {
  const ts = new Date().toISOString().replace(/[-:TZ.]/g, '').slice(0, 14)
  const suffix = Math.floor(Math.random() * 1000).toString().padStart(3, '0')
  return `AUTO-${ts}-${suffix}`
}

const determineSeverity = (trigger: AutomationTrigger, deviationMagnitude: number, range: number) => {
  const ratio = range === 0 ? deviationMagnitude : Math.abs(deviationMagnitude) / range
  if (trigger === 'OOS') {
    if (ratio > 0.75) return 'critical'
    if (ratio > 0.5) return 'high'
    return 'medium'
  }
  // OOT events are cautionary unless trend is severe
  if (ratio > 0.6) return 'high'
  return 'medium'
}

const recommendedAssignee = (parameter: string) => {
  if (parameter === 'temperature' || parameter === 'pressure') return 'Engineering'
  if (parameter === 'pH') return 'Process Development'
  if (parameter === 'volume') return 'Manufacturing'
  return 'Quality Assurance'
}

const buildDeviation = (snapshot: TwinSnapshot, batchIndex: number, trigger: AutomationTrigger, parameter: string, measurement: { value: number; target: number; min: number; max: number; deviation: number; compliance: number }) => {
  const batch = snapshot.batches[batchIndex]
  const label = PARAMETER_LABELS[parameter] || parameter
  const severity = determineSeverity(trigger, measurement.deviation, measurement.max - measurement.min)
  const deviationId = createDeviationId(batch.id, trigger, parameter)

  const deviation: Deviation = {
    id: deviationId,
    title: `${label} ${trigger} detected in ${batch.id}`,
    description: `${label} measured ${measurement.value.toFixed(2)}${PARAMETER_UNITS[parameter] || ''} vs target ${measurement.target.toFixed(2)}. ${trigger === 'OOS' ? 'Value breached specification limits.' : 'Trend indicates risk of drifting out of spec.'}`,
    severity: severity as Deviation['severity'],
    status: 'open',
    batchId: batch.id,
    reportedBy: 'Digital Twin Monitor',
    reportedDate: snapshot.timestamp,
    assignedTo: recommendedAssignee(parameter),
    origin: 'digital-twin',
    metadata: {
      trigger,
      parameter,
      currentValue: measurement.value,
      target: measurement.target,
      bounds: {
        min: measurement.min,
        max: measurement.max,
      },
      compliance: measurement.compliance,
    },
  }

  return deviation
}

const buildSuggestion = (deviation: Deviation, parameter: string, measurement: { value: number; target: number; min: number; max: number; deviation: number; compliance: number }, trigger: AutomationTrigger): AutomationSuggestion => {
  const actions: string[] = []
  const metadata = deviation.metadata as Record<string, unknown> | undefined
  const parameterKey = typeof metadata?.parameter === 'string' ? (metadata?.parameter as string) : parameter
  const label = PARAMETER_LABELS[parameterKey] || parameterKey
  const bounds = deviation.metadata?.bounds as { min: number; max: number } | undefined

  if (trigger === 'OOS') {
    actions.push(`Isolate batch ${deviation.batchId} and perform product impact assessment.`)
    actions.push(`Execute containment for ${label.toLowerCase()} excursion and document remediation.`)
  } else {
    actions.push(`Increase monitoring frequency for ${label.toLowerCase()} and review historical trends.`)
    actions.push('Prepare contingency adjustments to prevent specification breach.')
  }
  actions.push('Document findings in investigation log and prepare CAPA linkage if required.')

  const suggestion: AutomationSuggestion = {
    id: createSuggestionId(),
    deviationId: deviation.id,
    trigger,
    parameter: parameter as AutomationSuggestion['parameter'],
    summary: `${label} ${trigger} detected for batch ${deviation.batchId}. Recommendation: initiate investigation and assign to ${deviation.assignedTo}.`,
    actions,
    assignee: deviation.assignedTo || 'Quality Assurance',
    status: 'pending',
    createdAt: new Date().toISOString(),
    aiConfidence: trigger === 'OOS' ? 'high' : 'medium',
    measurement: {
      currentValue: measurement.value,
      target: measurement.target,
      bounds,
    },
  }

  return suggestion
}

const emitProposal = (detail: AutomationProposalDetail) => {
  if (typeof window === 'undefined') return
  window.dispatchEvent(new CustomEvent<AutomationProposalDetail>('quality:automation-proposal', { detail }))
}

const processSnapshot = (snapshot: TwinSnapshot) => {
  snapshot.batches.forEach((batch, index) => {
    const parameters = batch.parameters
    const bounds = batch.cppBounds
    ;(['temperature', 'pressure', 'pH', 'volume'] as const).forEach((parameter) => {
      const key = `${batch.id}:${parameter}:oos`
      const trendKey = `${batch.id}:${parameter}:oot`
      const reading = parameters[parameter]
      const spec = bounds[parameter]
      if (!reading || !spec) return

      const deviation = Math.max(reading.current - spec.max, spec.min - reading.current)
      const outOfSpec = reading.current < spec.min || reading.current > spec.max
      const compliance = Math.min(1, Math.max(0, (spec.max - spec.min - Math.abs(reading.current - reading.target)) / (spec.max - spec.min)))

      if (outOfSpec) {
        if (!activeTriggers.has(key)) {
          const measurement = {
            value: reading.current,
            target: reading.target,
            min: spec.min,
            max: spec.max,
            deviation: deviation,
            compliance,
          }
          const deviationRecord = buildDeviation(snapshot, index, 'OOS', parameter, measurement)
          const suggestion = buildSuggestion(deviationRecord, parameter, measurement, 'OOS')
          activeTriggers.set(key, deviationRecord.id)
          deviationLookup.set(deviationRecord.id, key)
          emitProposal({
            trigger: 'OOS',
            batchId: batch.id,
            parameter,
            measurement,
            deviation: deviationRecord,
            suggestion,
          })
        }
        trendState.delete(trendKey)
      } else {
        // Remove OOS flag if value returned in range
        if (activeTriggers.has(key)) {
          activeTriggers.delete(key)
        }

        // Trend detection for OOT
        const state = trendState.get(trendKey) || { lastValue: reading.current, counter: 0 }
        const delta = reading.current - state.lastValue
        const deviationFromTarget = reading.current - reading.target
        const range = spec.max - spec.min
        const movingAway = Math.sign(delta) === Math.sign(deviationFromTarget) && Math.abs(delta) > range * 0.02
        const nearLimit = Math.abs(deviationFromTarget) > range * 0.4

        if (movingAway && nearLimit) {
          state.counter += 1
        } else {
          state.counter = Math.max(0, state.counter - 1)
        }
        state.lastValue = reading.current
        trendState.set(trendKey, state)

        if (state.counter >= 3 && !activeTriggers.has(trendKey)) {
          const measurement = {
            value: reading.current,
            target: reading.target,
            min: spec.min,
            max: spec.max,
            deviation: deviationFromTarget,
            compliance,
          }
          const deviationRecord = buildDeviation(snapshot, index, 'OOT', parameter, measurement)
          const suggestion = buildSuggestion(deviationRecord, parameter, measurement, 'OOT')
          activeTriggers.set(trendKey, deviationRecord.id)
          deviationLookup.set(deviationRecord.id, trendKey)
          emitProposal({
            trigger: 'OOT',
            batchId: batch.id,
            parameter,
            measurement,
            deviation: deviationRecord,
            suggestion,
          })
          state.counter = 0
          trendState.set(trendKey, state)
        }
      }
    })
  })
}

export function initializeQualityAutomation() {
  if (initialized) return
  initialized = true
  subscribeToTwin(processSnapshot)
}

export function notifyQualityEventResolved(deviationId: string) {
  const key = deviationLookup.get(deviationId)
  if (key) {
    activeTriggers.delete(key)
    deviationLookup.delete(deviationId)
  }
}
