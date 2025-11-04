import { useState, useEffect, useMemo } from 'react'
import * as React from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Progress } from '@/components/ui/progress'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog'
import { 
  TrendUp, 
  TrendDown,
  ChartLine, 
  Warning,
  CheckCircle,
  Robot,
  Target,
  BookOpen,
  Info
} from '@phosphor-icons/react'
import { equipmentTelemetry, batches, equipmentCalibration, getCPPCompliance } from '@/data/seed'
import { monitor, sampleAndRecordPredictions, predictQuality, predictDeviationRisk, predictEquipmentFailure, decisionThreshold, trainLogisticForModel, predictLogisticProb, getLogisticState, type ModelId, aggregateBatchProbability, aggregateEquipmentFailureProbability } from '@/lib/modeling'
import { useAlerts } from '@/hooks/use-alerts'
import { useKV } from '@github/spark/hooks'
import { ensureEquipmentFeed, subscribeToEquipmentFeed } from '@/lib/equipmentFeed'
import type { TwinSnapshot } from '@/lib/digitalTwin'
import type { AutomationSuggestion } from '@/types/automation'
import type { Deviation } from '@/types/quality'
import { ChartContainer, ChartLegendInline, ChartTooltip, ChartTooltipContent, type ChartConfig } from '@/components/ui/chart'
import { Tooltip, TooltipTrigger, TooltipContent } from '@/components/ui/tooltip'
import { Area, ComposedChart, Line, XAxis, YAxis, CartesianGrid } from 'recharts'
import { formatDistanceToNow } from 'date-fns'

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
    source: 'heuristic' | 'logistic'
    summary: string
  }[]
}

interface QualityMetrics {
  batchYield: { current: number; trend: 'up' | 'down' | 'stable'; historical: number[] }
  firstPassRate: { current: number; trend: 'up' | 'down' | 'stable'; historical: number[] }
  deviationRate: { current: number; trend: 'up' | 'down' | 'stable'; historical: number[] }
  equipmentOEE: { current: number; trend: 'up' | 'down' | 'stable'; historical: number[] }
}

type BatchQualityRow = {
  id: string
  product: string
  stage: string
  status: string
  progress: number
  qualityProbability: number
  deviationProbability: number
  compliance: number
}

type QualitySnapshot = {
  batchYield: number
  firstPassRate: number
  deviationRate: number
  averageDeviationRisk: number
  equipmentOEE: number
  averageCompliance: number
  perBatch: BatchQualityRow[]
}

type QualityHistoryPoint = {
  timestamp: string
  batchYield: number
  firstPassRate: number
  deviationRate: number
  averageDeviationRisk: number
  equipmentOEE: number
  averageCompliance: number
}

const METRIC_HISTORY_LIMIT = 36
const METRIC_TREND_EPSILON = 0.25

function createEmptyMetrics(): QualityMetrics {
  return {
    batchYield: { current: 0, trend: 'stable', historical: [] },
    firstPassRate: { current: 0, trend: 'stable', historical: [] },
    deviationRate: { current: 0, trend: 'stable', historical: [] },
    equipmentOEE: { current: 0, trend: 'stable', historical: [] },
  }
}

function updateMetricSummary(prev: QualityMetrics[keyof QualityMetrics], value: number): QualityMetrics[keyof QualityMetrics] {
  const nextValue = Number(value.toFixed(1))
  const prevValue = prev?.current ?? nextValue
  const delta = nextValue - prevValue
  const trend: 'up' | 'down' | 'stable' = delta > METRIC_TREND_EPSILON ? 'up' : delta < -METRIC_TREND_EPSILON ? 'down' : 'stable'
  const historical = [...(prev?.historical ?? []), nextValue].slice(-METRIC_HISTORY_LIMIT)
  return { current: nextValue, trend, historical }
}

function computeQualitySnapshot(snapshot: TwinSnapshot): QualitySnapshot {
  const formattedBatches: BatchQualityRow[] = snapshot.batches.map(batch => {
    const qualityBase = predictQuality(batch)
    const qualityProb = (predictLogisticProb('quality_prediction', qualityBase.features) ?? qualityBase.p) * 100
    const deviationBase = predictDeviationRisk(batch)
    const deviationProb = (predictLogisticProb('deviation_risk', deviationBase.features) ?? deviationBase.p) * 100
    const compliance = getCPPCompliance(batch) * 100
    return {
      id: batch.id,
      product: batch.product,
      stage: batch.stage,
      status: batch.status,
      progress: batch.progress,
      qualityProbability: Number(qualityProb.toFixed(1)),
      deviationProbability: Number(deviationProb.toFixed(1)),
      compliance: Number(compliance.toFixed(1)),
    }
  })

  const totalBatches = formattedBatches.length || 1
  const qualityProbs = formattedBatches.map(item => item.qualityProbability / 100)
  const deviationProbs = formattedBatches.map(item => item.deviationProbability / 100)
  const progressFactors = snapshot.batches.map(batch => Math.max(0, Math.min(1, batch.progress / 100)))

  const batchYield = Number((
    formattedBatches.reduce((sum, _item, index) => sum + qualityProbs[index] * (progressFactors[index] ?? 1), 0) /
    totalBatches *
    100
  ).toFixed(1))

  const firstPassRate = Number((
    (qualityProbs.filter(p => p >= decisionThreshold.quality_prediction).length / totalBatches) * 100
  ).toFixed(1))

  const deviationRate = Number((
    (deviationProbs.filter(p => p >= decisionThreshold.deviation_risk).length / totalBatches) * 100
  ).toFixed(1))

  const averageDeviationRisk = Number((
    aggregateBatchProbability('deviation_risk', snapshot.batches) * 100
  ).toFixed(1))

  const equipmentPredictions = snapshot.equipmentTelemetry.map(eq => {
    const equipmentBase = predictEquipmentFailure(eq)
    return predictLogisticProb('equipment_failure', equipmentBase.features) ?? equipmentBase.p
  })

  const equipmentOEE = Number(((1 - aggregateEquipmentFailureProbability(snapshot.equipmentTelemetry)) * 100).toFixed(1))

  const averageCompliance = formattedBatches.length
    ? Number((formattedBatches.reduce((sum, item) => sum + item.compliance, 0) / formattedBatches.length).toFixed(1))
    : 0

  return {
    batchYield,
    firstPassRate,
    deviationRate,
    averageDeviationRisk,
    equipmentOEE,
    averageCompliance,
    perBatch: formattedBatches,
  }
}

type RiskHistoryPoint = {
  timestamp: string
  equipmentRisk: number
  deviationRisk: number
  qualityConfidence: number
  alertCount: number
}

const equipmentCatalog = equipmentCalibration.reduce<Record<string, string>>((acc, item) => {
  acc[item.id] = item.name
  return acc
}, {})

const classifyRiskLevel = (value: number) => {
  if (value >= 70) return { label: 'High', badge: 'bg-destructive text-destructive-foreground' as const }
  if (value >= 40) return { label: 'Medium', badge: 'bg-warning text-warning-foreground' as const }
  return { label: 'Low', badge: 'bg-success text-success-foreground' as const }
}

const classifyConfidenceLevel = (value: number) => {
  if (value >= 90) return { label: 'Excellent', badge: 'bg-success text-success-foreground' as const }
  if (value >= 75) return { label: 'Good', badge: 'bg-primary text-primary-foreground' as const }
  if (value >= 60) return { label: 'Watch', badge: 'bg-warning text-warning-foreground' as const }
  return { label: 'At Risk', badge: 'bg-destructive text-destructive-foreground' as const }
}

// Build functional models from current data using LR if available; fallback to lightweight predictors

function buildRuntimeModels(snapshot: TwinSnapshot): PredictiveModel[] {
  const snapBatches = snapshot.batches
  const snapEq = snapshot.equipmentTelemetry
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
  // Aggregate probabilities across all current items to align with iterative summaries
  const qP = aggregateBatchProbability('quality_prediction', snapBatches)
  const dP = aggregateBatchProbability('deviation_risk', snapBatches)
  const eP = aggregateEquipmentFailureProbability(snapEq)
  const qSource: 'heuristic' | 'logistic' = predictLogisticProb('quality_prediction', qH.features) != null ? 'logistic' : 'heuristic'
  const dSource: 'heuristic' | 'logistic' = predictLogisticProb('deviation_risk', dH.features) != null ? 'logistic' : 'heuristic'
  const eSource: 'heuristic' | 'logistic' = predictLogisticProb('equipment_failure', eH.features) != null ? 'logistic' : 'heuristic'
  const qSummary = qSource === 'logistic'
    ? 'Local logistic regression on engineered CPP features; calibrated to produce probability.'
    : 'Rule-based mapping of CPP compliance and parameter deltas to a probability-like quality score.'
  const dSummary = dSource === 'logistic'
    ? 'Logistic regression on normalized deviation signatures (temperature, pressure, pH).'
    : 'Heuristic risk takes the max normalized deviation across CPPs and scales it for alerting.'
  const eSummary = eSource === 'logistic'
    ? 'Logistic regression blending vibration RMS, thermal variance, and alert flags for failure risk.'
    : 'Heuristic weighs vibration RMS, temperature variance, and active alerts to estimate failure probability.'

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
          : `Heuristic: p = clamp(0.05 + 0.9*CPP, 0, 1). Inputs include |ΔT|=${qH.features.temp_delta.toFixed(2)}, |ΔP|=${qH.features.pressure_delta.toFixed(2)}, |ΔpH|=${qH.features.ph_delta.toFixed(2)}.`,
        source: qSource,
        summary: qSummary,
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
          : `Heuristic: risk p = max(normDevs)/2, with temp=${dH.features.temp_norm_dev.toFixed(2)}, pressure=${dH.features.pressure_norm_dev.toFixed(2)}, pH=${dH.features.ph_norm_dev.toFixed(2)}.`,
        source: dSource,
        summary: dSummary,
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
          : `Heuristic: p = 0.6*rms_norm + 0.3*temp_var_norm + 0.2*alert. For ${topEq.id}, rms_norm=${eH.features.rms_norm.toFixed(2)}, temp_var_norm=${eH.features.temp_var_norm.toFixed(2)}, alert=${eH.features.alert_flag}.`,
        source: eSource,
        summary: eSummary,
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
  icon: Icon,
  tooltip,
}: {
  title: string
  value: number
  unit?: string
  trend: 'up' | 'down' | 'stable'
  historical: number[]
  icon: React.ComponentType<{ className?: string }>
  tooltip?: string
}) {
  const trendIcon = trend === 'up' ? TrendUp : trend === 'down' ? TrendDown : null
  const trendColor = trend === 'up' ? 'text-success' : trend === 'down' ? 'text-destructive' : 'text-muted-foreground'
  const change = historical.length >= 2 ? value - historical[historical.length - 2] : 0

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
        <CardTitle className="text-sm font-medium text-muted-foreground">
          <span className="flex items-center gap-2">
            {title}
            {tooltip ? (
              <Tooltip>
                <TooltipTrigger asChild>
                  <span className="inline-flex h-4 w-4 items-center justify-center rounded-full bg-muted text-muted-foreground cursor-help">
                    <Info className="h-3 w-3" />
                    <span className="sr-only">{tooltip}</span>
                  </span>
                </TooltipTrigger>
                <TooltipContent side="top" align="start" className="max-w-xs text-left">
                  {tooltip}
                </TooltipContent>
              </Tooltip>
            ) : null}
          </span>
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
  const valueDescriptions: Record<PredictiveModel['type'], string> = {
    quality_prediction: 'Represents the predicted probability that the batch will meet all release criteria given current CPP signals and thresholds.',
    equipment_failure: 'Shows the estimated likelihood that the monitored equipment will experience a failure alarm in the upcoming monitoring window.',
    deviation_risk: 'Indicates the probability that the process will register a quality deviation if current conditions persist.',
    batch_optimization: 'Relative performance score for the optimization scenario compared to the current baseline.',
  }
  const riskLevelDescriptions: Record<PredictiveModel['type'], string> = {
    quality_prediction: 'Risk tier compares predicted quality to the 95% release target. High risk means probability has fallen below that bar.',
    equipment_failure: 'Risk tier maps the failure probability to action thresholds (low <10%, medium 10-30%, high >30%).',
    deviation_risk: 'Risk tier maps deviation probability to watch (20-50%) and escalation (>50%) thresholds.',
    batch_optimization: 'Risk tier compares optimization score to acceptable tolerance ranges for production readiness.',
  }
  const confidenceDescription = 'Confidence increases as the model output moves further away from its decision boundary; higher percentages indicate a clearer signal from the model.'
  
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
            <div className="space-y-2">
              <div className="flex items-center gap-2">
                <div className="text-2xl font-bold font-mono">
                  {prediction.value.toFixed(1)}{model.type === 'quality_prediction' ? '%' : model.type === 'equipment_failure' ? '% risk' : '% risk'}
                </div>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <span className="inline-flex h-5 w-5 items-center justify-center rounded-full bg-muted text-muted-foreground cursor-help">
                      <Info className="h-3 w-3" />
                      <span className="sr-only">Predicted value context</span>
                    </span>
                  </TooltipTrigger>
                  <TooltipContent side="top" align="start" className="max-w-xs text-left">
                    {valueDescriptions[model.type]}
                  </TooltipContent>
                </Tooltip>
                <Badge variant="outline" className="text-[10px] uppercase tracking-wide">
                  {prediction.source === 'logistic' ? 'Logistic' : 'Heuristic'}
                </Badge>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <span className="inline-flex h-5 w-5 items-center justify-center rounded-full bg-muted text-muted-foreground cursor-help">
                      <Info className="h-3 w-3" />
                      <span className="sr-only">Model computation details</span>
                    </span>
                  </TooltipTrigger>
                  <TooltipContent side="top" align="end" className="max-w-xs text-left">
                    {prediction.summary}
                  </TooltipContent>
                </Tooltip>
              </div>
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <span>Confidence: {(prediction.confidence * 100).toFixed(0)}%</span>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <span className="inline-flex h-4 w-4 items-center justify-center rounded-full bg-muted text-muted-foreground cursor-help">
                      <Info className="h-3 w-3" />
                      <span className="sr-only">Confidence definition</span>
                    </span>
                  </TooltipTrigger>
                  <TooltipContent side="top" align="start" className="max-w-xs text-left">
                    {confidenceDescription}
                  </TooltipContent>
                </Tooltip>
              </div>
            </div>
            <div className="text-right">
              <div className={`text-sm font-medium ${riskColor} flex items-center justify-end gap-2`}>
                <span>{riskLevel.toUpperCase()} RISK</span>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <span className="inline-flex h-4 w-4 items-center justify-center rounded-full bg-muted/70 text-muted-foreground cursor-help">
                      <Info className="h-3 w-3" />
                      <span className="sr-only">Risk tier explanation</span>
                    </span>
                  </TooltipTrigger>
                  <TooltipContent side="top" align="end" className="max-w-xs text-left">
                    {riskLevelDescriptions[model.type]}
                  </TooltipContent>
                </Tooltip>
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
  const [latestTwin, setLatestTwin] = useState<TwinSnapshot>({
    timestamp: new Date(),
    batches,
    equipmentTelemetry,
  })
  const [models, setModels] = useState<PredictiveModel[]>(buildRuntimeModels(latestTwin))
  const [metrics, setMetrics] = useState<QualityMetrics>(() => createEmptyMetrics())
  const [qualitySnapshot, setQualitySnapshot] = useState<QualitySnapshot>(() =>
    computeQualitySnapshot({ timestamp: new Date(), batches, equipmentTelemetry })
  )
  const [qualityHistory, setQualityHistory] = useState<QualityHistoryPoint[]>([])
  const [, setCurrentTime] = useState(new Date())
  const { alerts = [] } = useAlerts()
  const [deviations = []] = useKV<Deviation[]>('deviations', [])
  const [automationQueue = []] = useKV<AutomationSuggestion[]>('automation-queue', [])
  const [riskHistory, setRiskHistory] = useState<RiskHistoryPoint[]>([])
  
  useEffect(() => {
    const timer = setInterval(() => setCurrentTime(new Date()), 60000)
    return () => clearInterval(timer)
  }, [])

  useEffect(() => {
    ensureEquipmentFeed()
    const unsubscribe = subscribeToEquipmentFeed(snapshot => {
      setLatestTwin(snapshot)
    })
    return () => {
      unsubscribe()
    }
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
    const refresh = () => setModels(buildRuntimeModels(latestTwin))
    refresh()
    const id = setInterval(refresh, 30000)
    return () => clearInterval(id)
  }, [latestTwin])

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

  useEffect(() => {
    const snapshot = computeQualitySnapshot(latestTwin)
    setQualitySnapshot(snapshot)
    setMetrics(prev => ({
      batchYield: updateMetricSummary(prev.batchYield, snapshot.batchYield),
      firstPassRate: updateMetricSummary(prev.firstPassRate, snapshot.firstPassRate),
      deviationRate: updateMetricSummary(prev.deviationRate, snapshot.deviationRate),
      equipmentOEE: updateMetricSummary(prev.equipmentOEE, snapshot.equipmentOEE),
    }))
    setQualityHistory(prev => {
      const timestamp = latestTwin.timestamp.toISOString()
      if (prev.length && prev[prev.length - 1].timestamp === timestamp) return prev
      const nextPoint: QualityHistoryPoint = {
        timestamp,
        batchYield: snapshot.batchYield,
        firstPassRate: snapshot.firstPassRate,
        deviationRate: snapshot.deviationRate,
        averageDeviationRisk: snapshot.averageDeviationRisk,
        equipmentOEE: snapshot.equipmentOEE,
        averageCompliance: snapshot.averageCompliance,
      }
      const nextHistory = [...prev, nextPoint]
      return nextHistory.slice(-METRIC_HISTORY_LIMIT)
    })
  }, [latestTwin])

  useEffect(() => {
    // Align risk trend history with iterative summaries; compute averages from current snapshot
    const snapshotBatches = latestTwin?.batches ?? batches
    const avgQual = snapshotBatches.length
      ? (snapshotBatches.reduce((sum, b) => sum + predictQuality(b).p, 0) / snapshotBatches.length) * 100
      : 0
    const now = new Date()
    const entry: RiskHistoryPoint = {
      timestamp: now.toISOString(),
      equipmentRisk: Number((100 - (qualitySnapshot.equipmentOEE || 0)).toFixed(2)),
      deviationRisk: Number((qualitySnapshot.averageDeviationRisk || 0).toFixed(2)),
      qualityConfidence: Number(avgQual.toFixed(2)),
      alertCount: alerts.length,
    }
    setRiskHistory(prev => {
      const limit = 72
      if (prev.length > 0) {
        const last = prev[prev.length - 1]
        const lastTs = new Date(last.timestamp).getTime()
        if (now.getTime() - lastTs < 5000) {
          const clone = [...prev]
          clone[clone.length - 1] = entry
          return clone
        }
      }
      const next = [...prev, entry]
      if (next.length > limit) next.shift()
      return next
    })
  }, [qualitySnapshot, alerts.length, latestTwin])

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

  const equipmentRiskRanking = useMemo(() => {
    const snapshot = latestTwin?.equipmentTelemetry ?? equipmentTelemetry
    return snapshot
      .map(item => {
        const prediction = predictEquipmentFailure(item)
        return {
          id: item.id,
          name: equipmentCatalog[item.id] ?? item.id,
          risk: Number((prediction.p * 100).toFixed(1)),
          vibrationRMS: Number(item.vibrationRMS.toFixed(2)),
          alert: item.vibrationAlert,
        }
      })
      .sort((a, b) => b.risk - a.risk)
  }, [latestTwin])

  const deviationRiskRanking = useMemo(() => {
    const snapshot = latestTwin?.batches ?? batches
    return snapshot
      .map(batch => {
        const prediction = predictDeviationRisk(batch)
        return {
          id: batch.id,
          product: batch.product,
          stage: batch.stage,
          risk: Number((prediction.p * 100).toFixed(1)),
          cppCompliance: Number((getCPPCompliance(batch) * 100).toFixed(1)),
          status: batch.status,
        }
      })
      .sort((a, b) => b.risk - a.risk)
  }, [latestTwin])

  const averageQualityConfidence = useMemo(() => {
    const snapshot = latestTwin?.batches ?? batches
    if (snapshot.length === 0) return 0
    const total = snapshot.reduce((sum, batch) => sum + predictQuality(batch).p, 0)
    return Number(((total / snapshot.length) * 100).toFixed(1))
  }, [latestTwin])

  const cppOutOfSpecCount = useMemo(() => {
    const snapshot = latestTwin?.batches ?? batches
    return snapshot.filter(batch => getCPPCompliance(batch) < 0.95).length
  }, [latestTwin])

  const alertSeveritySummary = useMemo(() => {
    return alerts.reduce(
      (acc, alert) => {
        acc.total += 1
        acc.bySeverity[alert.severity] = (acc.bySeverity[alert.severity] ?? 0) + 1
        return acc
      },
      { total: 0, bySeverity: { info: 0, success: 0, warning: 0, error: 0 } as Record<'info' | 'success' | 'warning' | 'error', number> }
    )
  }, [alerts])

  const openDeviationCount = useMemo(
    () => deviations.filter(dev => dev.status === 'open' || dev.status === 'investigating').length,
    [deviations]
  )

  const automationPendingCount = useMemo(
    () => automationQueue.filter(item => item.status === 'pending').length,
    [automationQueue]
  )

  const riskChartConfig: ChartConfig = useMemo(() => ({
    equipment: { label: 'Equipment Risk %', color: '#ef4444' },
    deviation: { label: 'Deviation Risk %', color: '#f97316' },
    quality: { label: 'Quality Confidence %', color: '#22c55e' },
  }), [])

  const riskTrendSeries = useMemo(
    () =>
      riskHistory.map(point => ({
        time: new Date(point.timestamp).toLocaleTimeString(),
        equipment: Number(point.equipmentRisk.toFixed(1)),
        deviation: Number(point.deviationRisk.toFixed(1)),
        quality: Number(point.qualityConfidence.toFixed(1)),
      })),
    [riskHistory]
  )

  const qualityChartConfig: ChartConfig = useMemo(() => ({
    yield: { label: 'Batch Yield %', color: '#38bdf8' },
    firstPass: { label: 'First Pass Rate %', color: '#22c55e' },
    deviation: { label: 'Deviation Risk %', color: '#f97316' },
    oee: { label: 'Equipment OEE %', color: '#a855f7' },
  }), [])

  const qualityTrendSeries = useMemo(
    () =>
      qualityHistory.map(point => ({
        time: new Date(point.timestamp).toLocaleTimeString(),
        yield: Number(point.batchYield.toFixed(1)),
        firstPass: Number(point.firstPassRate.toFixed(1)),
        deviation: Number(point.averageDeviationRisk.toFixed(1)),
        oee: Number(point.equipmentOEE.toFixed(1)),
      })),
    [qualityHistory]
  )

  const qualityTrendSummary = useMemo(() => {
    if (qualityHistory.length < 2) return null
    const first = qualityHistory[0]
    const last = qualityHistory[qualityHistory.length - 1]
    const delta = (curr: number, prev: number) => Number((curr - prev).toFixed(1))
    return {
      yieldDelta: delta(last.batchYield, first.batchYield),
      firstPassDelta: delta(last.firstPassRate, first.firstPassRate),
      deviationDelta: delta(last.averageDeviationRisk, first.averageDeviationRisk),
      oeeDelta: delta(last.equipmentOEE, first.equipmentOEE),
    }
  }, [qualityHistory])

  const batchQualityRows = useMemo(() => {
    return [...qualitySnapshot.perBatch].sort((a, b) => b.deviationProbability - a.deviationProbability)
  }, [qualitySnapshot])

  const deviationThresholdPercent = decisionThreshold.deviation_risk * 100

  const highRiskBatchCount = useMemo(() => {
    return qualitySnapshot.perBatch.filter(row => row.deviationProbability >= deviationThresholdPercent).length
  }, [qualitySnapshot, deviationThresholdPercent])

  const completedBatchCount = useMemo(
    () => qualitySnapshot.perBatch.filter(row => row.status === 'complete').length,
    [qualitySnapshot]
  )

  const totalBatchCount = qualitySnapshot.perBatch.length
  const activeBatchCount = Math.max(0, totalBatchCount - completedBatchCount)
  const averageDeviationRisk = qualitySnapshot.averageDeviationRisk

  const formatDelta = (delta: number | undefined, { invert = false }: { invert?: boolean } = {}) => {
    if (delta == null || Number.isNaN(delta) || Math.abs(delta) < 0.1) return 'holding steady'
    const sign = delta > 0 ? '+' : ''
    const favorable = invert ? delta < 0 : delta > 0
    const descriptor = favorable ? 'improved' : 'softened'
    return `${descriptor} ${sign}${delta.toFixed(1)} pts`
  }

  const renderTrendLabel = (trend: 'up' | 'down' | 'stable') => (
    trend === 'up' ? 'Improving' : trend === 'down' ? 'Declining' : 'Stable'
  )

  const lastTwinUpdate = useMemo(
    () => formatDistanceToNow(new Date(latestTwin.timestamp), { addSuffix: true }),
    [latestTwin.timestamp]
  )

  const topEquipmentRisk = equipmentRiskRanking[0]
  const topDeviationRisk = deviationRiskRanking[0]
  const topEquipmentList = equipmentRiskRanking.slice(0, 3)
  const topDeviationList = deviationRiskRanking.slice(0, 3)
  const equipmentRiskLevel = classifyRiskLevel(topEquipmentRisk?.risk ?? 0)
  const deviationRiskLevel = classifyRiskLevel(topDeviationRisk?.risk ?? 0)
  const qualityConfidenceLevel = classifyConfidenceLevel(averageQualityConfidence)
  const riskSummaryTooltips = {
    equipment: 'Represents the highest predicted equipment failure probability right now, derived from the failure model for the most at-risk asset.',
    deviation: 'Shows the top predicted process deviation probability among active batches based on current CPP compliance and deviation risk models.',
    quality: 'Displays the average predicted probability that active batches will meet quality specifications; higher values indicate stronger overall quality confidence.',
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
            <CardContent className="space-y-6">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div className="text-sm text-muted-foreground">Synced {lastTwinUpdate}</div>
                <Badge variant="outline" className="flex items-center gap-1">
                  <Warning className="h-3 w-3 text-warning" />
                  {alertSeveritySummary.total} Alerts in last window
                </Badge>
              </div>

              <div className="grid gap-4 md:grid-cols-3">
                <div className="p-4 border rounded-lg bg-destructive/5">
                  <div className="flex items-center justify-between text-xs uppercase text-muted-foreground">
                    <span className="flex items-center gap-1">
                      Equipment Failure Risk
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <span className="inline-flex h-4 w-4 items-center justify-center rounded-full bg-muted text-muted-foreground cursor-help">
                            <Info className="h-3 w-3" />
                            <span className="sr-only">Equipment risk definition</span>
                          </span>
                        </TooltipTrigger>
                        <TooltipContent side="top" align="start" className="max-w-xs text-left">
                          {riskSummaryTooltips.equipment}
                        </TooltipContent>
                      </Tooltip>
                    </span>
                    <Badge className={equipmentRiskLevel.badge}>{equipmentRiskLevel.label}</Badge>
                  </div>
                  <div className="mt-2 text-2xl font-semibold font-mono">
                    {(topEquipmentRisk?.risk ?? 0).toFixed(1)}%
                  </div>
                  <p className="text-xs text-muted-foreground mt-1">
                    Highest: {topEquipmentRisk?.name ?? '—'} · {topEquipmentRisk ? `${topEquipmentRisk.vibrationRMS} mm/s` : '—'}
                  </p>
                </div>
                <div className="p-4 border rounded-lg bg-warning/5">
                  <div className="flex items-center justify-between text-xs uppercase text-muted-foreground">
                    <span className="flex items-center gap-1">
                      Deviation Risk
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <span className="inline-flex h-4 w-4 items-center justify-center rounded-full bg-muted text-muted-foreground cursor-help">
                            <Info className="h-3 w-3" />
                            <span className="sr-only">Deviation risk definition</span>
                          </span>
                        </TooltipTrigger>
                        <TooltipContent side="top" align="start" className="max-w-xs text-left">
                          {riskSummaryTooltips.deviation}
                        </TooltipContent>
                      </Tooltip>
                    </span>
                    <Badge className={deviationRiskLevel.badge}>{deviationRiskLevel.label}</Badge>
                  </div>
                  <div className="mt-2 text-2xl font-semibold font-mono">
                    {(topDeviationRisk?.risk ?? 0).toFixed(1)}%
                  </div>
                  <p className="text-xs text-muted-foreground mt-1">
                    Most exposed batch: {topDeviationRisk?.id ?? '—'} · CPP {topDeviationRisk ? `${topDeviationRisk.cppCompliance.toFixed(1)}%` : '—'}
                  </p>
                </div>
                <div className="p-4 border rounded-lg bg-success/5">
                  <div className="flex items-center justify-between text-xs uppercase text-muted-foreground">
                    <span className="flex items-center gap-1">
                      Quality Confidence
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <span className="inline-flex h-4 w-4 items-center justify-center rounded-full bg-muted text-muted-foreground cursor-help">
                            <Info className="h-3 w-3" />
                            <span className="sr-only">Quality confidence definition</span>
                          </span>
                        </TooltipTrigger>
                        <TooltipContent side="top" align="start" className="max-w-xs text-left">
                          {riskSummaryTooltips.quality}
                        </TooltipContent>
                      </Tooltip>
                    </span>
                    <Badge className={qualityConfidenceLevel.badge}>{qualityConfidenceLevel.label}</Badge>
                  </div>
                  <div className="mt-2 text-2xl font-semibold font-mono">
                    {averageQualityConfidence.toFixed(1)}%
                  </div>
                  <p className="text-xs text-muted-foreground mt-1">
                    CPP out-of-spec lots: {cppOutOfSpecCount}
                  </p>
                </div>
              </div>

              <div className="grid gap-4 lg:grid-cols-3">
                <div className="lg:col-span-2 space-y-3">
                  {riskTrendSeries.length > 1 ? (
                    <>
                      <ChartContainer className="h-56" config={riskChartConfig}>
                        <ComposedChart data={riskTrendSeries} margin={{ left: 8, right: 16, top: 8, bottom: 0 }}>
                          <CartesianGrid strokeDasharray="3 3" vertical={false} />
                          <XAxis dataKey="time" axisLine={false} tickLine={false} minTickGap={28} />
                          <YAxis domain={[0, 100]} axisLine={false} tickLine={false} width={42} />
                          <ChartTooltip
                            content={
                              <ChartTooltipContent
                                formatter={(value) => (
                                  <span>{Number(value).toFixed(1)}%</span>
                                )}
                              />
                            }
                          />
                          <Area type="monotone" dataKey="equipment" fill="var(--color-equipment)" stroke="var(--color-equipment)" fillOpacity={0.12} strokeWidth={2} />
                          <Area type="monotone" dataKey="deviation" fill="var(--color-deviation)" stroke="var(--color-deviation)" fillOpacity={0.18} strokeWidth={2} strokeDasharray="4 3" />
                          <Line type="monotone" dataKey="quality" stroke="var(--color-quality)" strokeWidth={2} dot={false} />
                        </ComposedChart>
                      </ChartContainer>
                      <ChartLegendInline
                        align="left"
                        items={[
                          { key: 'equipment', label: 'Equipment Risk', color: '#ef4444' },
                          { key: 'deviation', label: 'Deviation Risk', color: '#f97316', dashed: true },
                          { key: 'quality', label: 'Quality Confidence', color: '#22c55e' },
                        ]}
                      />
                    </>
                  ) : (
                    <div className="h-56 border rounded-lg bg-muted/40 flex items-center justify-center text-sm text-muted-foreground">
                      Collecting data… risk trends will appear shortly.
                    </div>
                  )}
                </div>
                <div className="space-y-3 p-4 border rounded-lg bg-muted/40">
                  <h4 className="text-sm font-medium">Operations Pulse</h4>
                  <div className="space-y-2 text-sm">
                    <div className="flex items-center justify-between">
                      <span className="text-muted-foreground">Open or investigating deviations</span>
                      <span className="font-mono">{openDeviationCount}</span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-muted-foreground">Pending automation decisions</span>
                      <span className="font-mono">{automationPendingCount}</span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-muted-foreground">Alerts (last sample)</span>
                      <span className="font-mono">{alertSeveritySummary.total}</span>
                    </div>
                  </div>
                  <div className="text-xs text-muted-foreground border-t pt-2">
                    Logistic models updating {formatDistanceToNow(models[0]?.lastTrained ?? new Date(), { addSuffix: true })}
                  </div>
                </div>
              </div>

              <div className="grid gap-4 md:grid-cols-2">
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <h4 className="text-sm font-medium">Top Equipment Watchlist</h4>
                    <Badge variant="outline" className="text-[10px]">Live</Badge>
                  </div>
                  <div className="space-y-3">
                    {topEquipmentList.map(item => (
                      <div key={item.id} className="p-3 border rounded-lg bg-background">
                        <div className="flex items-center justify-between text-sm font-medium">
                          <span>{item.name}</span>
                          <span className="font-mono">{item.risk.toFixed(1)}%</span>
                        </div>
                        <Progress value={item.risk} className="h-2 mt-2" />
                        <div className="mt-1 flex items-center justify-between text-xs text-muted-foreground">
                          <span>Vibration {item.vibrationRMS} mm/s</span>
                          <span>{item.alert ? 'Alert active' : 'Nominal'}</span>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <h4 className="text-sm font-medium">Highest Deviation Risk Batches</h4>
                    <Badge variant="outline" className="text-[10px]">AI Watch</Badge>
                  </div>
                  <div className="space-y-3">
                    {topDeviationList.map(item => (
                      <div key={item.id} className="p-3 border rounded-lg bg-background">
                        <div className="flex items-center justify-between text-sm font-medium">
                          <span>{item.id}</span>
                          <span className="font-mono">{item.risk.toFixed(1)}%</span>
                        </div>
                        <Progress value={item.risk} className="h-2 mt-2" />
                        <div className="mt-1 flex items-center justify-between text-xs text-muted-foreground">
                          <span>{item.product} · {item.stage}</span>
                          <span>CPP {item.cppCompliance.toFixed(1)}%</span>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>

              <div className="grid gap-4 md:grid-cols-2">
                <div className="p-4 border rounded-lg bg-muted/40">
                  <h4 className="text-sm font-medium mb-3">Alert Composition</h4>
                  <div className="space-y-2 text-sm">
                    {(['error','warning','success','info'] as const).map(sev => (
                      <div key={sev} className="flex items-center justify-between">
                        <span className="capitalize text-muted-foreground">{sev}</span>
                        <span className="font-mono">{alertSeveritySummary.bySeverity[sev]}</span>
                      </div>
                    ))}
                  </div>
                  <div className="text-xs text-muted-foreground mt-3">
                    Alerts reflect automation, quality, and equipment events recorded across the platform.
                  </div>
                </div>
                <div className="p-4 border rounded-lg bg-muted/20">
                  <h4 className="text-sm font-medium mb-3">Recommended Actions</h4>
                  <ul className="space-y-2 text-sm text-muted-foreground list-disc list-inside">
                    <li>Dispatch maintenance to {topEquipmentRisk?.name ?? 'high-risk equipment'} to investigate telemetry anomalies.</li>
                    <li>Review SOP adherence for batches {topDeviationList.map(item => item.id).join(', ') || '—'} with elevated deviation probabilities.</li>
                    <li>Continue monitoring CPP compliance; {cppOutOfSpecCount} batch(es) require parameter tuning.</li>
                  </ul>
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
              tooltip="Weighted probability that current batches will meet quality acceptance at completion, blending logistic probabilities and heuristic CPP compliance."
            />
            <MetricCard
              title="First Pass Rate"
              value={metrics.firstPassRate.current}
              trend={metrics.firstPassRate.trend}
              historical={metrics.firstPassRate.historical}
              icon={CheckCircle}
              tooltip="Share of active batches predicted to clear release acceptance without rework, based on the quality decision threshold."
            />
            <MetricCard
              title="Deviation Rate"
              value={metrics.deviationRate.current}
              trend={metrics.deviationRate.trend}
              historical={metrics.deviationRate.historical}
              icon={Warning}
              tooltip="Percentage of batches exceeding the deviation risk threshold from heuristic/logistic predictors, signalling likely nonconformances."
            />
            <MetricCard
              title="Equipment OEE"
              value={metrics.equipmentOEE.current}
              trend={metrics.equipmentOEE.trend}
              historical={metrics.equipmentOEE.historical}
              icon={ChartLine}
              tooltip="Overall equipment effectiveness proxy derived from the inverse of failure probabilities across monitored assets."
            />
          </div>

          <Card>
            <CardHeader>
              <CardTitle>Key Performance Indicators</CardTitle>
              <p className="text-sm text-muted-foreground">Live roll-up across all monitored batches and equipment snapshots.</p>
            </CardHeader>
            <CardContent>
              <div className="space-y-6">
                <div className="grid gap-4 md:grid-cols-3">
                  <div className="p-4 border rounded-lg">
                    <div className="text-sm text-muted-foreground mb-2 flex items-center gap-2">
                      <span>Active Batches</span>
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <span className="inline-flex h-4 w-4 items-center justify-center rounded-full bg-muted text-muted-foreground cursor-help">
                            <Info className="h-3 w-3" />
                            <span className="sr-only">How active batches are counted</span>
                          </span>
                        </TooltipTrigger>
                        <TooltipContent side="top" align="start" className="max-w-xs text-left">
                          Includes batches in running or warning statuses streamed from the digital twin at the latest tick.
                        </TooltipContent>
                      </Tooltip>
                    </div>
                    <div className="text-2xl font-bold">{activeBatchCount}</div>
                    <div className="text-xs text-muted-foreground">{totalBatchCount} total • {completedBatchCount} complete</div>
                  </div>
                  <div className="p-4 border rounded-lg">
                    <div className="text-sm text-muted-foreground mb-2 flex items-center gap-2">
                      <span>Average CPP Compliance</span>
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <span className="inline-flex h-4 w-4 items-center justify-center rounded-full bg-muted text-muted-foreground cursor-help">
                            <Info className="h-3 w-3" />
                            <span className="sr-only">How CPP compliance is derived</span>
                          </span>
                        </TooltipTrigger>
                        <TooltipContent side="top" align="start" className="max-w-xs text-left">
                          Mean of critical process parameter compliance across batches (temperature, pressure, pH, volume) compared to specification bounds.
                        </TooltipContent>
                      </Tooltip>
                    </div>
                    <div className="text-2xl font-bold text-primary">{qualitySnapshot.averageCompliance.toFixed(1)}%</div>
                    <div className="text-xs text-muted-foreground">Updated {lastTwinUpdate}</div>
                  </div>
                  <div className="p-4 border rounded-lg">
                    <div className="text-sm text-muted-foreground mb-2 flex items-center gap-2">
                      <span>High-Risk Batches</span>
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <span className="inline-flex h-4 w-4 items-center justify-center rounded-full bg-muted text-muted-foreground cursor-help">
                            <Info className="h-3 w-3" />
                            <span className="sr-only">When a batch is marked high risk</span>
                          </span>
                        </TooltipTrigger>
                        <TooltipContent side="top" align="start" className="max-w-xs text-left">
                          Count of batches whose deviation probability meets or exceeds the configured decision threshold ({(decisionThreshold.deviation_risk * 100).toFixed(0)}%).
                        </TooltipContent>
                      </Tooltip>
                    </div>
                    <div className="text-2xl font-bold text-destructive">{highRiskBatchCount}</div>
                    <div className="text-xs text-muted-foreground">Deviation ≥ {(decisionThreshold.deviation_risk * 100).toFixed(0)}%</div>
                  </div>
                </div>

                <div className="grid gap-4 md:grid-cols-3">
                  <div className="p-4 border rounded-lg">
                    <div className="text-sm text-muted-foreground mb-2 flex items-center gap-2">
                      <span>Average Deviation Probability</span>
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <span className="inline-flex h-4 w-4 items-center justify-center rounded-full bg-muted text-muted-foreground cursor-help">
                            <Info className="h-3 w-3" />
                            <span className="sr-only">How deviation probability is calculated</span>
                          </span>
                        </TooltipTrigger>
                        <TooltipContent side="top" align="start" className="max-w-xs text-left">
                          Mean of predicted deviation risk across batches using the logistic/heuristic model outputs.
                        </TooltipContent>
                      </Tooltip>
                    </div>
                    <div className="text-2xl font-bold text-amber-600">{averageDeviationRisk.toFixed(1)}%</div>
                    <div className="text-xs text-muted-foreground">Lower is better</div>
                  </div>
                  <div className="p-4 border rounded-lg">
                    <div className="text-sm text-muted-foreground mb-2 flex items-center gap-2">
                      <span>Weighted Batch Yield</span>
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <span className="inline-flex h-4 w-4 items-center justify-center rounded-full bg-muted text-muted-foreground cursor-help">
                            <Info className="h-3 w-3" />
                            <span className="sr-only">How weighted yield is determined</span>
                          </span>
                        </TooltipTrigger>
                        <TooltipContent side="top" align="start" className="max-w-xs text-left">
                          Probability-weighted quality yield that accounts for each batch’s progress and predicted pass likelihood.
                        </TooltipContent>
                      </Tooltip>
                    </div>
                    <div className="text-2xl font-bold text-green-600">{metrics.batchYield.current.toFixed(1)}%</div>
                    <div className="text-xs text-muted-foreground">Trend: {renderTrendLabel(metrics.batchYield.trend)}</div>
                  </div>
                  <div className="p-4 border rounded-lg">
                    <div className="text-sm text-muted-foreground mb-2 flex items-center gap-2">
                      <span>Equipment OEE</span>
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <span className="inline-flex h-4 w-4 items-center justify-center rounded-full bg-muted text-muted-foreground cursor-help">
                            <Info className="h-3 w-3" />
                            <span className="sr-only">How OEE is approximated</span>
                          </span>
                        </TooltipTrigger>
                        <TooltipContent side="top" align="start" className="max-w-xs text-left">
                          Heuristic overall equipment effectiveness derived from the complement of predicted failure probabilities.
                        </TooltipContent>
                      </Tooltip>
                    </div>
                    <div className="text-2xl font-bold text-violet-600">{metrics.equipmentOEE.current.toFixed(1)}%</div>
                    <div className="text-xs text-muted-foreground">Includes logistic-enhanced predictions</div>
                  </div>
                </div>

                <div className="p-4 bg-blue-50 rounded-lg">
                  <h4 className="font-medium mb-2">Performance Insights</h4>
                  <ul className="text-sm space-y-1">
                    <li>• Batch yield {qualityTrendSummary ? formatDelta(qualityTrendSummary.yieldDelta) : 'monitoring baseline'} (current {metrics.batchYield.current.toFixed(1)}%).</li>
                    <li>• First pass rate {qualityTrendSummary ? formatDelta(qualityTrendSummary.firstPassDelta) : 'monitoring baseline'} (current {metrics.firstPassRate.current.toFixed(1)}%).</li>
                    <li>• Deviation exposure {qualityTrendSummary ? formatDelta(qualityTrendSummary.deviationDelta, { invert: true }) : 'monitoring baseline'} (avg {averageDeviationRisk.toFixed(1)}%).</li>
                    <li>• Equipment OEE {qualityTrendSummary ? formatDelta(qualityTrendSummary.oeeDelta) : 'monitoring baseline'} (current {metrics.equipmentOEE.current.toFixed(1)}%).</li>
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
              <p className="text-sm text-muted-foreground">Real-time traces derived from the same predictions driving the live dashboards.</p>
            </CardHeader>
            <CardContent>
              <div className="grid gap-4 lg:grid-cols-3">
                <div className="lg:col-span-2 space-y-3">
                  {qualityTrendSeries.length > 1 ? (
                    <>
                      <ChartContainer className="h-56" config={qualityChartConfig}>
                        <ComposedChart data={qualityTrendSeries} margin={{ left: 8, right: 16, top: 8, bottom: 0 }}>
                          <CartesianGrid strokeDasharray="3 3" vertical={false} />
                          <XAxis dataKey="time" axisLine={false} tickLine={false} minTickGap={28} />
                          <YAxis domain={[0, 100]} axisLine={false} tickLine={false} width={42} />
                          <ChartTooltip
                            content={
                              <ChartTooltipContent
                                formatter={(value) => (
                                  <span>{Number(value).toFixed(1)}%</span>
                                )}
                              />
                            }
                          />
                          <Area type="monotone" dataKey="yield" fill="var(--color-yield)" stroke="var(--color-yield)" fillOpacity={0.12} strokeWidth={2} />
                          <Line type="monotone" dataKey="firstPass" stroke="var(--color-firstPass)" strokeWidth={2} dot={false} />
                          <Line type="monotone" dataKey="oee" stroke="var(--color-oee)" strokeWidth={2} dot={false} strokeDasharray="4 3" />
                          <Line type="monotone" dataKey="deviation" stroke="var(--color-deviation)" strokeWidth={2} dot={false} strokeDasharray="6 4" />
                        </ComposedChart>
                      </ChartContainer>
                      <ChartLegendInline
                        align="left"
                        items={[
                          { key: 'yield', label: 'Batch Yield', color: '#38bdf8' },
                          { key: 'firstPass', label: 'First Pass Rate', color: '#22c55e' },
                          { key: 'oee', label: 'Equipment OEE', color: '#a855f7', dashed: true },
                          { key: 'deviation', label: 'Avg Deviation Risk', color: '#f97316', dashed: true },
                        ]}
                      />
                    </>
                  ) : (
                    <div className="h-56 border rounded-lg bg-muted/40 flex items-center justify-center text-sm text-muted-foreground">
                      Collecting data… quality trends will appear shortly.
                    </div>
                  )}
                </div>
                <div className="space-y-3 p-4 border rounded-lg bg-muted/40">
                  <h4 className="text-sm font-medium">Trend Summary</h4>
                  <ul className="space-y-2 text-sm text-muted-foreground">
                    <li>
                      <span className="font-medium text-foreground">Yield:</span> {metrics.batchYield.current.toFixed(1)}% • {qualityTrendSummary ? formatDelta(qualityTrendSummary.yieldDelta) : 'baseline sample'}
                    </li>
                    <li>
                      <span className="font-medium text-foreground">First Pass:</span> {metrics.firstPassRate.current.toFixed(1)}% • {qualityTrendSummary ? formatDelta(qualityTrendSummary.firstPassDelta) : 'baseline sample'}
                    </li>
                    <li>
                      <span className="font-medium text-foreground">Deviation Risk:</span> {averageDeviationRisk.toFixed(1)}% • {qualityTrendSummary ? formatDelta(qualityTrendSummary.deviationDelta, { invert: true }) : 'baseline sample'}
                    </li>
                    <li>
                      <span className="font-medium text-foreground">Equipment OEE:</span> {metrics.equipmentOEE.current.toFixed(1)}% • {qualityTrendSummary ? formatDelta(qualityTrendSummary.oeeDelta) : 'baseline sample'}
                    </li>
                  </ul>
                  <p className="text-xs text-muted-foreground">
                    Updates are driven by every digital-twin tick (~60 simulated seconds). Predictions and trend statistics refresh in lockstep with the operations dashboard.
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Batch Quality Snapshot</CardTitle>
              <p className="text-sm text-muted-foreground">Per-batch probabilities from the latest digital-twin sample ({new Date(latestTwin.timestamp).toLocaleTimeString()}).</p>
            </CardHeader>
            <CardContent>
              <div className="overflow-x-auto">
                <table className="min-w-full text-sm">
                  <thead className="text-xs uppercase tracking-wide text-muted-foreground">
                    <tr>
                      <th className="px-3 py-2 text-left">Batch</th>
                      <th className="px-3 py-2 text-left">Stage</th>
                      <th className="px-3 py-2 text-left">Status</th>
                      <th className="px-3 py-2 text-right">Progress</th>
                      <th className="px-3 py-2 text-right">Quality %</th>
                      <th className="px-3 py-2 text-right">Deviation %</th>
                      <th className="px-3 py-2 text-right">CPP %</th>
                    </tr>
                  </thead>
                  <tbody>
                    {batchQualityRows.map(row => (
                      <tr key={row.id} className="border-t">
                        <td className="px-3 py-2 font-medium text-foreground">{row.id}</td>
                        <td className="px-3 py-2 text-muted-foreground">{row.stage}</td>
                        <td className="px-3 py-2 text-muted-foreground capitalize">{row.status}</td>
                        <td className="px-3 py-2 text-right font-mono">{row.progress.toFixed(0)}%</td>
                        <td className="px-3 py-2 text-right font-mono">{row.qualityProbability.toFixed(1)}%</td>
                        <td className={`px-3 py-2 text-right font-mono ${row.deviationProbability >= deviationThresholdPercent ? 'text-destructive' : 'text-foreground'}`}>
                          {row.deviationProbability.toFixed(1)}%
                        </td>
                        <td className="px-3 py-2 text-right font-mono">{row.compliance.toFixed(1)}%</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
                {batchQualityRows.length === 0 && (
                  <div className="py-6 text-center text-sm text-muted-foreground">No batches are currently monitored.</div>
                )}
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