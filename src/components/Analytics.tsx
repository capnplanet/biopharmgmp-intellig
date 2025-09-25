import { useState, useEffect } from 'react'
import * as React from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog'
import { 
  TrendUp, 
  TrendDown,
  ChartLine, 
  Warning,
  CheckCircle,
  Clock,
  Robot,
  Target,
  BookOpen,
  Info
} from '@phosphor-icons/react'
import { equipmentTelemetry } from '@/data/seed'

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
  }[]
}

interface QualityMetrics {
  batchYield: { current: number; trend: 'up' | 'down' | 'stable'; historical: number[] }
  firstPassRate: { current: number; trend: 'up' | 'down' | 'stable'; historical: number[] }
  deviationRate: { current: number; trend: 'up' | 'down' | 'stable'; historical: number[] }
  equipmentOEE: { current: number; trend: 'up' | 'down' | 'stable'; historical: number[] }
}

const mockModels: PredictiveModel[] = [
  {
    id: 'model-001',
    name: 'Batch Quality Predictor',
    type: 'quality_prediction',
    accuracy: 94.2,
    lastTrained: new Date('2024-01-10T00:00:00Z'),
    status: 'active',
    predictions: [
      {
        value: 97.8,
        confidence: 0.92,
        timestamp: new Date(),
        explanation: 'Based on current process parameters, temperature stability, and raw material quality indicators, this batch is predicted to meet all quality specifications with high confidence.'
      }
    ]
  },
  {
    id: 'model-002', 
    name: 'Bioreactor Failure Predictor',
    type: 'equipment_failure',
    accuracy: 89.5,
    lastTrained: new Date('2024-01-08T00:00:00Z'),
    status: 'active',
    predictions: [
      {
        value: 15.3,
        confidence: 0.87,
        timestamp: new Date(),
        explanation: '' // populated at runtime using telemetry
      }
    ]
  },
  {
    id: 'model-003',
    name: 'Deviation Risk Analyzer',
    type: 'deviation_risk',
    accuracy: 91.8,
    lastTrained: new Date('2024-01-12T00:00:00Z'),
    status: 'active',
    predictions: [
      {
        value: 23.7,
        confidence: 0.78,
        timestamp: new Date(),
        explanation: 'Historical patterns indicate elevated risk of pH deviations during current phase of BTH-2024-002. Enhanced monitoring of pH control systems recommended.'
      }
    ]
  }
]

const mockMetrics: QualityMetrics = {
  batchYield: { 
    current: 94.3, 
    trend: 'up', 
    historical: [91.2, 92.1, 93.4, 94.1, 94.3] 
  },
  firstPassRate: { 
    current: 89.7, 
    trend: 'stable', 
    historical: [88.9, 89.2, 89.5, 89.8, 89.7] 
  },
  deviationRate: { 
    current: 2.1, 
    trend: 'down', 
    historical: [3.2, 2.8, 2.4, 2.3, 2.1] 
  },
  equipmentOEE: { 
    current: 87.4, 
    trend: 'up', 
    historical: [84.1, 85.3, 86.2, 86.8, 87.4] 
  }
}

function MetricCard({ 
  title, 
  value, 
  unit = '%', 
  trend, 
  historical, 
  icon: Icon 
}: {
  title: string
  value: number
  unit?: string
  trend: 'up' | 'down' | 'stable'
  historical: number[]
  icon: React.ComponentType<{ className?: string }>
}) {
  const trendIcon = trend === 'up' ? TrendUp : trend === 'down' ? TrendDown : null
  const trendColor = trend === 'up' ? 'text-success' : trend === 'down' ? 'text-destructive' : 'text-muted-foreground'
  const change = historical.length >= 2 ? value - historical[historical.length - 2] : 0

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
        <CardTitle className="text-sm font-medium text-muted-foreground">
          {title}
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
            <div>
              <div className="text-2xl font-bold font-mono">
                {prediction.value.toFixed(1)}{model.type === 'quality_prediction' ? '%' : model.type === 'equipment_failure' ? '% risk' : '% risk'}
              </div>
              <div className="text-sm text-muted-foreground">
                Confidence: {(prediction.confidence * 100).toFixed(0)}%
              </div>
            </div>
            <div className="text-right">
              <div className={`text-sm font-medium ${riskColor}`}>
                {riskLevel.toUpperCase()} RISK
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
                    This prediction is based on analysis of 10,000+ historical data points including 
                    process parameters, equipment performance metrics, environmental conditions, and 
                    quality outcomes. The model avoids confirmation bias through cross-validation 
                    and continuous retraining on new data.
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
  const [models] = useState<PredictiveModel[]>(mockModels)
  const [metrics] = useState<QualityMetrics>(mockMetrics)
  const [, setCurrentTime] = useState(new Date())
  // Determine highest-risk equipment: prefer alert=true, else highest vibrationRMS
  const topEq = React.useMemo(() => {
    const list = equipmentTelemetry.slice()
    const alertFirst = list.filter(e => e.vibrationAlert)
    if (alertFirst.length) {
      return alertFirst.sort((a,b) => b.vibrationRMS - a.vibrationRMS)[0].id
    }
    return list.sort((a,b) => b.vibrationRMS - a.vibrationRMS)[0]?.id || 'BIO-002'
  }, [])

  useEffect(() => {
    const timer = setInterval(() => setCurrentTime(new Date()), 60000)
    return () => clearInterval(timer)
  }, [])

  // Populate dynamic explanation text for equipment failure model
  const modelsWithDynamic = React.useMemo(() => {
    return models.map(m => {
      if (m.type !== 'equipment_failure') return m
      const clone = { ...m }
      if (clone.predictions[0]) {
        clone.predictions = [{
          ...clone.predictions[0],
          explanation: `Vibration patterns and temperature fluctuations in ${topEq} suggest potential bearing issues. (Demo mode) This risk score is simulated using heuristic rules on RMS vibration, rising trend, and temperature variance. In production, we would use features such as RMS, kurtosis, crest factor, and spectral bands against ISO 20816 guidance with a calibrated classifier; thresholds and uncertainty are continuously monitored.`
        }]
      }
      return clone
    })
  }, [models, topEq])

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
              <h4 className="font-medium mb-1">Limitations</h4>
              <p className="text-muted-foreground">
                This demo does not train or execute real ML models; values are illustrative. In production, all models would undergo GxP validation (e.g., GAMP 5), with versioning, approvals, and continuous oversight.
              </p>
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
          <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
            {modelsWithDynamic.map((model) => (
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
            <CardContent>
              <div className="space-y-4">
                <div className="p-4 bg-red-50 border border-red-200 rounded-lg">
                  <div className="flex items-center gap-2 mb-2">
                    <Warning className="h-4 w-4 text-red-600" />
                    <span className="font-medium text-red-900">High Risk Alert</span>
                  </div>
                  <p className="text-sm text-red-800">
                    Equipment failure prediction indicates potential issues with Bioreactor {topEq}. 
                    Immediate inspection recommended to prevent production disruption.
                  </p>
                </div>
                
                <div className="p-4 bg-yellow-50 border border-yellow-200 rounded-lg">
                  <div className="flex items-center gap-2 mb-2">
                    <Clock className="h-4 w-4 text-yellow-600" />
                    <span className="font-medium text-yellow-900">Medium Risk - Monitoring Required</span>
                  </div>
                  <p className="text-sm text-yellow-800">
                    Deviation risk analyzer indicates elevated probability of pH control issues. 
                    Enhanced monitoring protocols activated for current batches.
                  </p>
                </div>

                <div className="p-4 bg-green-50 border border-green-200 rounded-lg">
                  <div className="flex items-center gap-2 mb-2">
                    <CheckCircle className="h-4 w-4 text-green-600" />
                    <span className="font-medium text-green-900">Low Risk - Optimal Performance</span>
                  </div>
                  <p className="text-sm text-green-800">
                    Batch quality predictions show excellent performance indicators. 
                    All current batches are on track to meet quality specifications.
                  </p>
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
            />
            <MetricCard
              title="First Pass Rate"
              value={metrics.firstPassRate.current}
              trend={metrics.firstPassRate.trend}
              historical={metrics.firstPassRate.historical}
              icon={CheckCircle}
            />
            <MetricCard
              title="Deviation Rate"
              value={metrics.deviationRate.current}
              trend={metrics.deviationRate.trend}
              historical={metrics.deviationRate.historical}
              icon={Warning}
            />
            <MetricCard
              title="Equipment OEE"
              value={metrics.equipmentOEE.current}
              trend={metrics.equipmentOEE.trend}
              historical={metrics.equipmentOEE.historical}
              icon={ChartLine}
            />
          </div>

          <Card>
            <CardHeader>
              <CardTitle>Key Performance Indicators</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-6">
                <div className="grid gap-4 md:grid-cols-3">
                  <div className="p-4 border rounded-lg">
                    <div className="text-sm text-muted-foreground mb-2">Manufacturing Efficiency</div>
                    <div className="text-2xl font-bold text-green-600">92.3%</div>
                    <div className="text-xs text-muted-foreground">+2.1% vs target</div>
                  </div>
                  <div className="p-4 border rounded-lg">
                    <div className="text-sm text-muted-foreground mb-2">Regulatory Compliance</div>
                    <div className="text-2xl font-bold text-green-600">99.8%</div>
                    <div className="text-xs text-muted-foreground">Within specification</div>
                  </div>
                  <div className="p-4 border rounded-lg">
                    <div className="text-sm text-muted-foreground mb-2">Cost per Batch</div>
                    <div className="text-2xl font-bold text-blue-600">$47.2K</div>
                    <div className="text-xs text-muted-foreground">-5.3% vs budget</div>
                  </div>
                </div>

                <div className="p-4 bg-blue-50 rounded-lg">
                  <h4 className="font-medium mb-2">Performance Insights:</h4>
                  <ul className="text-sm space-y-1">
                    <li>• Batch yield improvements driven by optimized temperature control</li>
                    <li>• Deviation rate reduction attributed to enhanced operator training</li>
                    <li>• Equipment OEE gains from predictive maintenance implementation</li>
                    <li>• First pass rate maintained through improved raw material quality</li>
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
            </CardHeader>
            <CardContent>
              <div className="space-y-6">
                <div className="p-4 border rounded-lg">
                  <h4 className="font-medium mb-4">30-Day Performance Trends</h4>
                  <div className="space-y-4">
                    <div className="flex items-center justify-between">
                      <span className="text-sm">Quality Score Trend</span>
                      <div className="flex items-center gap-2">
                        <TrendUp className="h-4 w-4 text-green-600" />
                        <span className="text-sm font-mono text-green-600">+3.2%</span>
                      </div>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-sm">Production Volume</span>
                      <div className="flex items-center gap-2">
                        <TrendUp className="h-4 w-4 text-green-600" />
                        <span className="text-sm font-mono text-green-600">+7.8%</span>
                      </div>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-sm">Equipment Downtime</span>
                      <div className="flex items-center gap-2">
                        <TrendDown className="h-4 w-4 text-green-600" />
                        <span className="text-sm font-mono text-green-600">-12.4%</span>
                      </div>
                    </div>
                  </div>
                </div>

                <div className="p-4 bg-amber-50 rounded-lg">
                  <h4 className="font-medium mb-2">Trend Analysis Summary:</h4>
                  <p className="text-sm text-amber-800">
                    Manufacturing performance shows consistent improvement across all key metrics. 
                    The implementation of AI-driven predictive analytics has contributed to a 15% 
                    reduction in unplanned downtime and 8% improvement in overall quality scores 
                    over the past quarter.
                  </p>
                </div>
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
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <Badge className={model.status === 'active' ? 'bg-success text-success-foreground' : 'bg-muted text-muted-foreground'}>
                        {model.status}
                      </Badge>
                      <Button variant="outline" size="sm">
                        Retrain
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
              
              <div className="mt-6 p-4 bg-blue-50 rounded-lg">
                <h4 className="font-medium mb-2">Model Validation & Bias Prevention:</h4>
                <p className="text-sm text-blue-800">
                  All models undergo rigorous validation using cross-validation techniques and 
                  out-of-sample testing. Bias detection algorithms continuously monitor for 
                  data drift and model degradation. Models are retrained monthly using the 
                  latest production data to maintain accuracy and prevent confirmation bias.
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