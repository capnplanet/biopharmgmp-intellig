import React, { useEffect, useMemo, useState } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Badge } from '@/components/ui/badge'
import { Gauge, Wrench, Pulse, TrendUp, Warning, CheckCircle } from '@phosphor-icons/react'
import { batches, equipmentCalibration, equipmentTelemetry, getCPPCompliance } from '@/data/seed'
import { Tooltip, TooltipTrigger, TooltipContent } from '@/components/ui/tooltip'
import { startDigitalTwin, subscribeToTwin, type TwinSnapshot } from '@/lib/digitalTwin'
import { ChartContainer, ChartLegendInline, ChartTooltip, ChartTooltipContent, type ChartConfig } from '@/components/ui/chart'
import { Area, ComposedChart, Line, XAxis, YAxis, CartesianGrid } from 'recharts'
import { formatDistanceToNow } from 'date-fns'

type ProductionHistoryPoint = {
  timestamp: string
  compliance: number
  inSpec: number
  warnings: number
}

const HISTORY_LIMIT = 60

const fmtPct = (n: number) => `${(n * 100).toFixed(0)}%`
const fmt = (n: number, digits = 1) => n.toFixed(digits)

export function AdvancedAnalytics() {
  const [latestTwin, setLatestTwin] = useState<TwinSnapshot>({
    timestamp: new Date(),
    batches,
    equipmentTelemetry,
  })
  const [history, setHistory] = useState<ProductionHistoryPoint[]>([])

  useEffect(() => {
    const twin = startDigitalTwin()
    twin.start()
    const unsubscribe = subscribeToTwin(snapshot => {
      setLatestTwin(snapshot)
    })
    return () => {
      unsubscribe()
    }
  }, [])

  const productionMetrics = useMemo(() => {
    const complianceByBatch = latestTwin.batches.map(b => ({ id: b.id, compliance: getCPPCompliance(b) }))
    const avgCompliance = complianceByBatch.reduce((a, b) => a + b.compliance, 0) / (complianceByBatch.length || 1)
    const inSpecCount = complianceByBatch.filter(c => c.compliance === 1).length
    const warningCount = latestTwin.batches.filter(b => b.status === 'warning').length
    return { complianceByBatch, avgCompliance, inSpecCount, warningCount }
  }, [latestTwin])

  useEffect(() => {
    const point: ProductionHistoryPoint = {
      timestamp: latestTwin.timestamp.toISOString(),
      compliance: Number((productionMetrics.avgCompliance * 100).toFixed(1)),
      inSpec: productionMetrics.inSpecCount,
      warnings: productionMetrics.warningCount,
    }
    setHistory(prev => {
      if (prev.length && prev[prev.length - 1].timestamp === point.timestamp) return prev
      const next = [...prev, point]
      if (next.length > HISTORY_LIMIT) next.shift()
      return next
    })
  }, [latestTwin.timestamp, productionMetrics])

  const totalUptime = useMemo(
    () => latestTwin.equipmentTelemetry.reduce((a, t) => a + t.uptimeHours, 0),
    [latestTwin.equipmentTelemetry]
  )
  const vibAlerts = useMemo(
    () => latestTwin.equipmentTelemetry.filter(t => t.vibrationAlert),
    [latestTwin.equipmentTelemetry]
  )
  const overdueCal = equipmentCalibration.filter(c => c.status === 'overdue')
  const dueSoonCal = equipmentCalibration.filter(c => c.status === 'due-soon')

  const chartConfig: ChartConfig = useMemo(() => ({
    compliance: { label: 'Avg CPP Compliance', color: '#0ea5e9' },
    inSpec: { label: 'Batches In Spec', color: '#22c55e' },
    warnings: { label: 'Warnings', color: '#f97316' },
  }), [])

  const chartData = useMemo(
    () =>
      history.map(point => ({
        time: new Date(point.timestamp).toLocaleTimeString(),
        compliance: point.compliance,
        inSpec: point.inSpec,
        warnings: point.warnings,
      })),
    [history]
  )

  const lastUpdate = useMemo(
    () => formatDistanceToNow(new Date(latestTwin.timestamp), { addSuffix: true }),
    [latestTwin.timestamp]
  )

  return (
    <div className="p-6 space-y-6 overflow-auto h-full">
      <div>
        <h1 className="text-3xl font-bold">Production & Equipment Analytics</h1>
        <p className="text-muted-foreground">CPP compliance, calibration health, vibration monitoring, and process insights</p>
      </div>

      <Tabs defaultValue="production" className="w-full">
        <TabsList className="grid w-full grid-cols-2">
          <TabsTrigger value="production">Production Analytics</TabsTrigger>
          <TabsTrigger value="equipment">Equipment Analytics</TabsTrigger>
        </TabsList>

        <TabsContent value="production" className="space-y-6">
          <div className="grid gap-4 md:grid-cols-3">
            <Card>
              <CardHeader className="flex items-center justify-between">
                <Tooltip>
                  <TooltipTrigger asChild>
                    <CardTitle className="text-sm text-muted-foreground cursor-help">Average CPP Compliance</CardTitle>
                  </TooltipTrigger>
                  <TooltipContent>
                    Mean of per-batch CPP compliance across active batches. For each batch, compliance = (# CPPs within bounds) / (total CPPs: temperature, pressure, pH, volume).
                  </TooltipContent>
                </Tooltip>
                <CheckCircle className="h-4 w-4 text-success" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold font-mono">{fmtPct(productionMetrics.avgCompliance)}</div>
                <div className="text-xs text-muted-foreground">Across active batches • Updated {lastUpdate}</div>
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="flex items-center justify-between">
                <Tooltip>
                  <TooltipTrigger asChild>
                    <CardTitle className="text-sm text-muted-foreground cursor-help">Batches In Spec</CardTitle>
                  </TooltipTrigger>
                  <TooltipContent>
                    Count of batches where compliance = 1.0 (all monitored CPPs within min–max bounds) over total batches displayed.
                  </TooltipContent>
                </Tooltip>
                <TrendUp className="h-4 w-4 text-primary" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold font-mono">{productionMetrics.inSpecCount}/{latestTwin.batches.length}</div>
                <div className="text-xs text-muted-foreground">All CPPs within bounds</div>
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="flex items-center justify-between">
                <Tooltip>
                  <TooltipTrigger asChild>
                    <CardTitle className="text-sm text-muted-foreground cursor-help">Open Process Warnings</CardTitle>
                  </TooltipTrigger>
                  <TooltipContent>
                    Number of batches currently marked as "warning" status, indicating a potential CPP excursion or abnormal drift.
                  </TooltipContent>
                </Tooltip>
                <Warning className="h-4 w-4 text-warning" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold font-mono">{productionMetrics.warningCount}</div>
                <div className="text-xs text-muted-foreground">Potential CPP deviations</div>
              </CardContent>
            </Card>
          </div>

          <Card>
            <CardHeader>
              <CardTitle>Production Momentum</CardTitle>
            </CardHeader>
            <CardContent>
              {chartData.length > 1 ? (
                <>
                  <ChartContainer className="h-48" config={chartConfig}>
                    <ComposedChart data={chartData} margin={{ left: 8, right: 16, top: 8, bottom: 0 }}>
                      <CartesianGrid strokeDasharray="3 3" vertical={false} />
                      <XAxis dataKey="time" axisLine={false} tickLine={false} minTickGap={24} />
                      <YAxis yAxisId="percent" domain={[0, 100]} axisLine={false} tickLine={false} tickFormatter={(value) => `${value}%`} width={44} />
                      <YAxis yAxisId="count" orientation="right" axisLine={false} tickLine={false} width={36} />
                      <ChartTooltip
                        content={
                          <ChartTooltipContent
                            formatter={(value, name) => (
                              <span>{name === 'compliance' ? `${Number(value).toFixed(1)}%` : value}</span>
                            )}
                          />
                        }
                      />
                      <Area yAxisId="percent" type="monotone" dataKey="compliance" fill="var(--color-compliance)" stroke="var(--color-compliance)" fillOpacity={0.12} strokeWidth={2} />
                      <Line yAxisId="count" type="monotone" dataKey="inSpec" stroke="var(--color-inSpec)" strokeWidth={2} dot={false} />
                      <Line yAxisId="count" type="monotone" dataKey="warnings" stroke="var(--color-warnings)" strokeWidth={2} dot={false} strokeDasharray="6 4" />
                    </ComposedChart>
                  </ChartContainer>
                  <ChartLegendInline
                    align="left"
                    className="mt-3"
                    items={[
                      { key: 'compliance', label: 'Avg CPP Compliance', color: '#0ea5e9' },
                      { key: 'inSpec', label: 'Batches In Spec', color: '#22c55e' },
                      { key: 'warnings', label: 'Warnings', color: '#f97316', dashed: true },
                    ]}
                  />
                </>
              ) : (
                <div className="h-48 border rounded-lg bg-muted/40 flex items-center justify-center text-sm text-muted-foreground">
                  Collecting data… production trends will appear shortly.
                </div>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Batch CPP Overview</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {latestTwin.batches.map(b => (
                  <div key={b.id} className="p-3 border rounded-lg">
                    <div className="flex items-center justify-between">
                      <div>
                        <div className="font-mono font-medium">{b.id}</div>
                        <div className="text-sm text-muted-foreground">{b.product}</div>
                      </div>
                      <Badge className={getCPPCompliance(b) === 1 ? 'bg-success text-success-foreground' : 'bg-warning text-warning-foreground'}>
                        CPP: {fmtPct(getCPPCompliance(b))}
                      </Badge>
                    </div>
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-2 mt-2 text-sm">
                      <div>Temp: {fmt(b.parameters.temperature.current)}{b.parameters.temperature.unit} (Target {fmt(b.parameters.temperature.target)})</div>
                      <div>Press: {fmt(b.parameters.pressure.current)} {b.parameters.pressure.unit} (Target {fmt(b.parameters.pressure.target)})</div>
                      <div>pH: {fmt(b.parameters.pH.current)} (Target {fmt(b.parameters.pH.target)})</div>
                      <div>Vol: {fmt(b.parameters.volume.current)}{b.parameters.volume.unit} (Target {fmt(b.parameters.volume.target)})</div>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="equipment" className="space-y-6">
          <div className="grid gap-4 md:grid-cols-3">
            <Card>
              <CardHeader className="flex items-center justify-between">
                <Tooltip>
                  <TooltipTrigger asChild>
                    <CardTitle className="text-sm text-muted-foreground cursor-help">Total Uptime</CardTitle>
                  </TooltipTrigger>
                  <TooltipContent>
                    Sum of uptimeHours across all monitored equipment. Updated continuously by the digital twin simulation.
                  </TooltipContent>
                </Tooltip>
                <Gauge className="h-4 w-4 text-primary" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold font-mono">{fmt(totalUptime, 0)} h</div>
                <div className="text-xs text-muted-foreground">Across monitored equipment</div>
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="flex items-center justify-between">
                <Tooltip>
                  <TooltipTrigger asChild>
                    <CardTitle className="text-sm text-muted-foreground cursor-help">Vibration Alerts</CardTitle>
                  </TooltipTrigger>
                  <TooltipContent>
                    Count of equipment where vibrationAlert is true (elevated RMS or transient spike beyond threshold).
                  </TooltipContent>
                </Tooltip>
                <Pulse className="h-4 w-4 text-warning" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold font-mono">{vibAlerts.length}</div>
                <div className="text-xs text-muted-foreground">Threshold exceeded (RMS)</div>
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="flex items-center justify-between">
                <Tooltip>
                  <TooltipTrigger asChild>
                    <CardTitle className="text-sm text-muted-foreground cursor-help">Calibration Status</CardTitle>
                  </TooltipTrigger>
                  <TooltipContent>
                    Counts from equipmentCalibration: "overdue" where status === 'overdue'; "due soon" where status === 'due-soon'.
                  </TooltipContent>
                </Tooltip>
                <Wrench className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-sm">Overdue: <span className="font-mono font-medium">{overdueCal.length}</span></div>
                <div className="text-sm">Due soon: <span className="font-mono font-medium">{dueSoonCal.length}</span></div>
              </CardContent>
            </Card>
          </div>

          <Card>
            <CardHeader>
              <CardTitle>Equipment Telemetry</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {latestTwin.equipmentTelemetry.map(t => (
                  <div key={t.id} className="p-3 border rounded-lg flex items-center justify-between">
                    <div>
                      <div className="font-medium">{t.id}</div>
                      <div className="text-sm text-muted-foreground">Uptime: {fmt(t.uptimeHours, 0)} h</div>
                    </div>
                    <div className="grid grid-cols-3 gap-4 text-sm">
                      <div>Vibration: {fmt(t.vibrationRMS)} mm/s</div>
                      <div>Temp Var: {fmt(t.temperatureVar)} °C</div>
                      <div>
                        <Badge className={t.vibrationAlert ? 'bg-warning text-warning-foreground' : 'bg-success text-success-foreground'}>
                          {t.vibrationAlert ? 'Alert' : 'Normal'}
                        </Badge>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Calibration Schedule</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-2 text-sm">
                {equipmentCalibration.map(c => (
                  <div key={c.id} className="p-2 border rounded-md flex items-center justify-between">
                    <div>
                      <div className="font-medium">{c.name} ({c.id})</div>
                      <div className="text-muted-foreground">Last: {new Date(c.lastCalibration).toLocaleDateString()} • Next: {new Date(c.nextDue).toLocaleDateString()}</div>
                    </div>
                    <Badge className={
                      c.status === 'calibrated' ? 'bg-success text-success-foreground' :
                      c.status === 'due-soon' ? 'bg-warning text-warning-foreground' : 'bg-destructive text-destructive-foreground'
                    }>
                      {c.status}
                    </Badge>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  )
}

export default AdvancedAnalytics
