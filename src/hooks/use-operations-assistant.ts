import { useEffect, useMemo, useState } from 'react'
import { useKV } from '@github/spark/hooks'
import { useAlerts } from '@/hooks/use-alerts'
import { subscribeToTwin, type TwinSnapshot } from '@/lib/digitalTwin'
import { batches as seedBatches, equipmentTelemetry as seedEquipmentTelemetry } from '@/data/seed'
import { getCPPCompliance } from '@/data/seed'
import { decisionThreshold, monitor, predictDeviationRisk, predictEquipmentFailure, predictQuality, predictLogisticProb } from '@/lib/modeling'
import type { AutomationSuggestion } from '@/types/automation'
import type { CAPA, ChangeControl, Deviation } from '@/types/quality'

const MAX_LIST_ITEMS = 5

const EQUIPMENT_CATALOG: Record<string, { name: string }> = {
  'BIO-001': { name: 'Bioreactor 1' },
  'BIO-002': { name: 'Bioreactor 2' },
  'CHR-001': { name: 'Chromatography Skid A' },
  'CHR-002': { name: 'Chromatography Skid B' },
  'DRY-001': { name: 'Spray Dryer 1' },
  'DRY-002': { name: 'Spray Dryer 2' },
  'FIL-001': { name: 'Filter Train 1' },
  'FIL-002': { name: 'Filter Train 2' },
  'REA-001': { name: 'Reactor 1' },
  'CRY-001': { name: 'Crystallizer 1' },
}

export type OperationsDigest = {
  summary: string
  updatedAt: Date
  metrics: {
    batchYield: number
    firstPassRate: number
    deviationRate: number
    averageDeviationRisk: number
    equipmentOee: number
    averageCompliance: number
  }
  batches: {
    running: number
    warning: number
    complete: number
    total: number
    highRiskCount: number
    highRiskThreshold: number
    averageProgress: number
    details: Array<{ id: string; product: string; stage: string; status: string; progress: number; startTime: string; equipment: string[]; etaHours?: number }>
    progressLeaders: Array<{ id: string; product: string; stage: string; status: string; progress: number; etaHours?: number }>
    closestToCompletion: { id: string; product: string; stage: string; status: string; progress: number; etaHours?: number } | null
    topDeviationRisks: Array<{ id: string; product: string; stage: string; risk: number; cppCompliance: number; status: string; progress: number }>
  }
  equipment: {
    highestRisk?: { id: string; name: string; risk: number; vibrationRms: number; alert: boolean }
    topRisks: Array<{ id: string; name: string; risk: number; vibrationRms: number; alert: boolean }>
  }
  qualityRecords: {
    openDeviations: number
    criticalDeviations: number
    activeCapas: number
    openChangeControls: number
  }
  alerts: {
    total: number
    bySeverity: Record<'info' | 'success' | 'warning' | 'error', number>
  }
  automation: {
    pending: number
    accepted: number
  }
  modelPerformance: Array<{ id: string; label: string; samples: number; accuracy?: number; brier: number; ece: number; auroc: number; threshold: number }>
}

type SnapshotState = {
  snapshot: TwinSnapshot
  updatedAt: Date
}

const INITIAL_SNAPSHOT: TwinSnapshot = {
  timestamp: new Date(),
  batches: seedBatches,
  equipmentTelemetry: seedEquipmentTelemetry,
}

const formatNumber = (value: number, digits = 1) => Number(value.toFixed(digits))

const buildSummary = (digest: OperationsDigest) => {
  const progressLeader = digest.batches.closestToCompletion
  const progressLine = progressLeader
    ? `Progress: avg ${digest.batches.averageProgress}% | closest ${progressLeader.id} ${progressLeader.progress}% (${progressLeader.stage}, ${progressLeader.status})${progressLeader.etaHours != null ? ` (~${progressLeader.etaHours}h ETA)` : ''}.`
    : `Progress: avg ${digest.batches.averageProgress}% | no running batches with tracked progress.`
  const lines = [
    `Batches: ${digest.batches.running} running, ${digest.batches.warning} warning, ${digest.batches.complete} complete (total ${digest.batches.total}).`,
    progressLine,
    `Quality: yield ${digest.metrics.batchYield}% | first-pass ${digest.metrics.firstPassRate}% | avg deviation ${digest.metrics.averageDeviationRisk}%.`,
    `Equipment OEE ${digest.metrics.equipmentOee}% with top risk ${digest.equipment.highestRisk ? `${digest.equipment.highestRisk.name} ${digest.equipment.highestRisk.risk}%` : 'none highlighted'}.`,
    `Alerts: ${digest.alerts.total} active (warning ${digest.alerts.bySeverity.warning}, error ${digest.alerts.bySeverity.error}).`,
    `Records: ${digest.qualityRecords.openDeviations} deviations (${digest.qualityRecords.criticalDeviations} critical), ${digest.qualityRecords.activeCapas} CAPAs, ${digest.qualityRecords.openChangeControls} change controls in-flight.`,
    `Automation queue: ${digest.automation.pending} pending, ${digest.automation.accepted} accepted recommendations.`,
  ]
  return lines.join('\n')
}

const deriveDigest = (
  snapshotState: SnapshotState,
  deviations: Deviation[],
  capas: CAPA[],
  changeControls: ChangeControl[],
  automationQueue: AutomationSuggestion[],
  alerts: ReturnType<typeof useAlerts>['alerts']
): OperationsDigest => {
  const { snapshot } = snapshotState
  const batches = snapshot.batches
  const equipment = snapshot.equipmentTelemetry

  const formattedBatches = batches.map(batch => {
    const qualityBase = predictQuality(batch)
    const qualityProb = (predictLogisticProb('quality_prediction', qualityBase.features) ?? qualityBase.p) * 100
    const deviationBase = predictDeviationRisk(batch)
    const deviationProb = (predictLogisticProb('deviation_risk', deviationBase.features) ?? deviationBase.p) * 100
    const compliance = getCPPCompliance(batch) * 100
    const startTime = batch.startTime instanceof Date ? batch.startTime : new Date(batch.startTime)
    const progress = formatNumber(batch.progress)
    const elapsedHours = Math.max(0, (snapshotState.updatedAt.getTime() - startTime.getTime()) / (60 * 60 * 1000))
    const etaHours = progress > 0
      ? formatNumber(Math.max(0, (elapsedHours / (progress / 100)) - elapsedHours))
      : undefined
    return {
      id: batch.id,
      product: batch.product,
      stage: batch.stage,
      status: batch.status,
      progress,
      etaHours,
      qualityProbability: formatNumber(qualityProb),
      deviationProbability: formatNumber(deviationProb),
      compliance: formatNumber(compliance),
      startTime: startTime.toISOString(),
      equipment: batch.equipment.slice(),
    }
  })

  const running = formattedBatches.filter(batch => batch.status === 'running').length
  const warning = formattedBatches.filter(batch => batch.status === 'warning').length
  const complete = formattedBatches.filter(batch => batch.status === 'complete').length
  const total = formattedBatches.length

  const deviationThresholdPercent = decisionThreshold.deviation_risk * 100
  const highRiskCount = formattedBatches.filter(batch => batch.deviationProbability >= deviationThresholdPercent).length
  const topDeviationRisks = formattedBatches
    .slice()
    .sort((a, b) => b.deviationProbability - a.deviationProbability)
    .slice(0, MAX_LIST_ITEMS)
    .map(item => ({
      id: item.id,
      product: item.product,
      stage: item.stage,
      risk: item.deviationProbability,
      cppCompliance: item.compliance,
      status: item.status,
      progress: item.progress,
    }))

  const progressFactors = batches.map(batch => Math.max(0, Math.min(1, batch.progress / 100)))
  const qualityProbs = formattedBatches.map(item => item.qualityProbability / 100)
  const deviationProbs = formattedBatches.map(item => item.deviationProbability / 100)

  const batchYield = total
    ? formatNumber((formattedBatches.reduce((sum, _item, index) => sum + qualityProbs[index] * (progressFactors[index] ?? 1), 0) / total) * 100)
    : 0

  const firstPassRate = total
    ? formatNumber((qualityProbs.filter(p => p >= decisionThreshold.quality_prediction).length / total) * 100)
    : 0

  const deviationRate = total
    ? formatNumber((deviationProbs.filter(p => p >= decisionThreshold.deviation_risk).length / total) * 100)
    : 0

  const averageDeviationRisk = total ? formatNumber((deviationProbs.reduce((sum, p) => sum + p, 0) / total) * 100) : 0

  const equipmentPredictions = equipment.map(eq => {
    const base = predictEquipmentFailure(eq)
    return predictLogisticProb('equipment_failure', base.features) ?? base.p
  })

  const equipmentOee = equipmentPredictions.length
    ? formatNumber((equipmentPredictions.reduce((sum, p) => sum + (1 - p), 0) / equipmentPredictions.length) * 100)
    : 0

  const averageCompliance = formattedBatches.length
    ? formatNumber(formattedBatches.reduce((sum, item) => sum + item.compliance, 0) / formattedBatches.length)
    : 0

  const equipmentRiskRanking = equipment
    .map(item => {
      const prediction = predictEquipmentFailure(item)
      return {
        id: item.id,
        name: EQUIPMENT_CATALOG[item.id]?.name ?? item.id,
        risk: formatNumber((predictLogisticProb('equipment_failure', prediction.features) ?? prediction.p) * 100),
        vibrationRms: formatNumber(item.vibrationRMS, 2),
        alert: item.vibrationAlert,
      }
    })
    .sort((a, b) => b.risk - a.risk)

  const topEquipmentRisks = equipmentRiskRanking.slice(0, MAX_LIST_ITEMS)

  const alertsSummary = (alerts ?? []).reduce(
    (acc, alert) => {
      acc.total += 1
      acc.bySeverity[alert.severity] = (acc.bySeverity[alert.severity] ?? 0) + 1
      return acc
    },
    { total: 0, bySeverity: { info: 0, success: 0, warning: 0, error: 0 } as Record<'info' | 'success' | 'warning' | 'error', number> }
  )

  const qualityRecords = {
    openDeviations: deviations.filter(dev => dev.status === 'open' || dev.status === 'investigating').length,
    criticalDeviations: deviations.filter(dev => dev.severity === 'critical' && dev.status !== 'closed').length,
    activeCapas: capas.filter(capa => capa.status !== 'complete').length,
    openChangeControls: changeControls.filter(cc => cc.status !== 'closed').length,
  }

  const automation = {
    pending: automationQueue.filter(item => item.status === 'pending').length,
    accepted: automationQueue.filter(item => item.status === 'accepted').length,
  }

  const averageProgress = total ? formatNumber(formattedBatches.reduce((sum, item) => sum + item.progress, 0) / total) : 0
  const progressLeaderEntries = formattedBatches
    .filter(batch => batch.status !== 'complete')
    .sort((a, b) => b.progress - a.progress)
    .slice(0, MAX_LIST_ITEMS)
  const progressLeaders = progressLeaderEntries.map(({ id, product, stage, status, progress, etaHours }) => ({
    id,
    product,
    stage,
    status,
    progress,
    etaHours,
  }))
  const batchDetails = formattedBatches.map(({ id, product, stage, status, progress, startTime, equipment, etaHours }) => ({
    id,
    product,
    stage,
    status,
    progress,
    startTime,
    equipment,
    etaHours,
  }))

  const modelPerformance: OperationsDigest['modelPerformance'] = (['quality_prediction', 'equipment_failure', 'deviation_risk'] as const).map(modelId => {
    const metrics = monitor.metrics(modelId, { threshold: decisionThreshold[modelId], minN: 30, requireBothClasses: true })
    return {
      id: modelId,
      label: modelId === 'quality_prediction' ? 'Quality Prediction' : modelId === 'equipment_failure' ? 'Equipment Failure' : 'Deviation Risk',
      samples: metrics.n,
      accuracy: metrics.accuracy != null ? formatNumber(metrics.accuracy * 100) : undefined,
      brier: formatNumber(metrics.brier, 3),
      ece: formatNumber(metrics.ece, 3),
      auroc: formatNumber(metrics.auroc, 3),
      threshold: formatNumber(decisionThreshold[modelId] * 100),
    }
  })

  const digest: OperationsDigest = {
    summary: '',
    updatedAt: snapshotState.updatedAt,
    metrics: {
      batchYield,
      firstPassRate,
      deviationRate,
      averageDeviationRisk,
      equipmentOee,
      averageCompliance,
    },
    batches: {
      running,
      warning,
      complete,
      total,
      highRiskCount,
      highRiskThreshold: formatNumber(deviationThresholdPercent),
      averageProgress,
      details: batchDetails,
      progressLeaders,
      closestToCompletion: progressLeaders[0] ?? null,
      topDeviationRisks,
    },
    equipment: {
      highestRisk: topEquipmentRisks[0],
      topRisks: topEquipmentRisks,
    },
    qualityRecords,
    alerts: alertsSummary,
    automation,
    modelPerformance,
  }

  digest.summary = buildSummary(digest)
  return digest
}

export function useOperationsAssistant() {
  const { alerts = [] } = useAlerts()
  const [deviations = []] = useKV<Deviation[]>('deviations', [])
  const [capas = []] = useKV<CAPA[]>('capas', [])
  const [changeControls = []] = useKV<ChangeControl[]>('change-controls', [])
  const [automationQueue = []] = useKV<AutomationSuggestion[]>('automation-queue', [])

  const [snapshotState, setSnapshotState] = useState<SnapshotState>({
    snapshot: INITIAL_SNAPSHOT,
    updatedAt: new Date(),
  })

  useEffect(() => {
    const unsubscribe = subscribeToTwin((snapshot) => {
      setSnapshotState({ snapshot, updatedAt: new Date(snapshot.timestamp) })
    })
    return () => {
      unsubscribe()
    }
  }, [])

  const digest = useMemo(() => (
    deriveDigest(snapshotState, deviations, capas, changeControls, automationQueue, alerts)
  ), [snapshotState, deviations, capas, changeControls, automationQueue, alerts])

  return digest
}
