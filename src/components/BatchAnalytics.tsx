import React from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Tooltip, TooltipTrigger, TooltipContent } from '@/components/ui/tooltip'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { batches, getCPPCompliance, equipmentTelemetry, equipmentCalibration } from '@/data/seed'
import { ArrowLeft, ChartLine, Warning, CheckCircle } from '@phosphor-icons/react'
import {
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
  ChartLegend,
  ChartLegendContent,
  ChartLegendInline,
} from '@/components/ui/chart'
import {
  AreaChart,
  Area,
  Line,
  CartesianGrid,
  XAxis,
  YAxis,
  ReferenceLine,
  BarChart,
  Bar,
  Cell,
} from 'recharts'

type Props = {
  batchId: string
  onBack: () => void
}

const fmtPct = (n: number) => `${(n * 100).toFixed(0)}%`
const fmt = (n: number, digits = 2) => n.toFixed(digits)

type SeriesPoint = { t: number; label: string; value: number }

// Deterministic, lightweight series generator for demo visuals.
function genSeries(key: string, current: number, target: number, min: number, max: number, points = 24): SeriesPoint[] {
  const out: SeriesPoint[] = []
  const span = max - min || Math.max(Math.abs(target), 1)
  const driftSteps = Math.max(6, Math.floor(points / 4))
  const basePhase = key.split('').reduce((acc, ch, i) => acc + ch.charCodeAt(0) * (i + 1), 0) % 360
  for (let i = 0; i < points; i++) {
    // Smooth approach from target to current toward the end of the series
    const blend = Math.max(0, (i - (points - driftSteps)) / driftSteps)
    const center = target * (1 - blend) + current * blend
    // Small bounded oscillation using sin/cos, phase-shifted by key
    const rad = (basePhase + i * 12) * (Math.PI / 180)
    const noise = Math.sin(rad) * 0.015 * span + Math.cos(rad * 0.7) * 0.01 * span
    const v = center + noise
    out.push({ t: i, label: `${i - (points - 1)}h`, value: v })
  }
  return out
}

function ParamRow({ label, current, min, max, target, unit }: {
  label: string
  current: number
  min: number
  max: number
  target: number
  unit: string
}) {
  const inSpec = current >= min && current <= max
  const dist = Math.abs(current - target)
  return (
    <div className={`grid grid-cols-5 gap-2 items-center p-2 rounded-md border ${inSpec ? 'border-border' : 'border-warning/60 bg-warning/5'}`}>
      <Tooltip>
        <TooltipTrigger asChild>
          <div className="font-medium cursor-help">{label}</div>
        </TooltipTrigger>
        <TooltipContent>
          In-spec if {min.toFixed(2)}–{max.toFixed(2)}{unit}. Δ = |current - target| = {dist.toFixed(2)}{unit}.
        </TooltipContent>
      </Tooltip>
      <div className="font-mono">{fmt(current)}{unit}</div>
      <div className="text-muted-foreground text-sm">Target: {fmt(target)}{unit}</div>
      <div className="text-muted-foreground text-sm">Spec: {fmt(min)}-{fmt(max)}{unit}</div>
      <div className="flex justify-end">
        <Badge className={inSpec ? 'bg-success text-success-foreground' : 'bg-warning text-warning-foreground'}>
          {inSpec ? 'In Spec' : `Δ ${fmt(dist)}`}
        </Badge>
      </div>
    </div>
  )
}

export function BatchAnalytics({ batchId, onBack }: Props) {
  const batch = batches.find(b => b.id === batchId)
  const [, setNow] = React.useState(new Date())
  React.useEffect(() => {
    const id = window.setInterval(() => setNow(new Date()), 20000)
    return () => window.clearInterval(id)
  }, [])

  if (!batch) {
    return (
      <div className="p-6 space-y-4">
        <Button variant="ghost" size="sm" onClick={onBack}>
          <ArrowLeft className="h-4 w-4 mr-1" /> Back
        </Button>
        <Card>
          <CardHeader>
            <CardTitle>Batch not found</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-muted-foreground">No batch exists with id {batchId}.</p>
          </CardContent>
        </Card>
      </div>
    )
  }

  const cpp = getCPPCompliance(batch)
  const { parameters: p, cppBounds: s } = batch
  const tempSeries = genSeries(`${batch.id}-temp`, p.temperature.current, p.temperature.target, s.temperature.min, s.temperature.max)
  const pressSeries = genSeries(`${batch.id}-press`, p.pressure.current, p.pressure.target, s.pressure.min, s.pressure.max)
  const phSeries = genSeries(`${batch.id}-ph`, p.pH.current, p.pH.target, s.pH.min, s.pH.max)
  const asOf = new Date()

  const eqData = batch.equipment
    .map((id) => {
      const t = equipmentTelemetry.find((e) => e.id === id)
      const c = equipmentCalibration.find((e) => e.id === id)
      return t ? { id, vibration: t.vibrationRMS, alert: t.vibrationAlert, calib: c } : null
    })
    .filter(Boolean) as { id: string; vibration: number; alert: boolean; calib?: (typeof equipmentCalibration)[number] }[]

  return (
    <div className="p-6 space-y-6 overflow-auto h-full">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold flex items-center gap-2">
            <ChartLine className="h-7 w-7 text-primary" />
            Analytics • <span className="font-mono">{batch.id}</span>
          </h1>
          <p className="text-muted-foreground">{batch.product}</p>
        </div>
        <Button variant="ghost" onClick={onBack}>
          <ArrowLeft className="h-4 w-4 mr-2" /> Back to Batches
        </Button>
      </div>

      <div className="grid gap-4 md:grid-cols-3">
        <Card>
          <CardHeader className="flex items-center justify-between">
            <Tooltip>
              <TooltipTrigger asChild>
                <CardTitle className="text-sm text-muted-foreground cursor-help">CPP Compliance</CardTitle>
              </TooltipTrigger>
              <TooltipContent>
                Per-batch CPP compliance = (# parameters within bounds) / 4. Shows current batch compliance percentage.
              </TooltipContent>
            </Tooltip>
            {cpp === 1 ? (
              <CheckCircle className="h-4 w-4 text-success" />
            ) : (
              <Warning className="h-4 w-4 text-warning" />
            )}
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold font-mono">{fmtPct(cpp)}</div>
            <div className="text-xs text-muted-foreground">Parameters within spec bounds</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle className="text-sm text-muted-foreground">Stage</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-lg font-medium">{batch.stage}</div>
            <div className="text-xs text-muted-foreground">Started {batch.startTime.toLocaleString()}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle className="text-sm text-muted-foreground">Progress</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-mono font-bold">{batch.progress.toFixed(2)}%</div>
            <div className="text-xs text-muted-foreground">Toward completion</div>
          </CardContent>
        </Card>
      </div>

      {/* Quick Equipment Panel */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle>Equipment Summary</CardTitle>
            <div className="text-xs text-muted-foreground">As of {asOf.toLocaleTimeString()}</div>
          </div>
        </CardHeader>
        <CardContent>
          <div className="flex flex-wrap gap-2 mb-3">
            {batch.equipment.map((id) => (
              <Badge key={id} variant="outline" className="font-mono">{id}</Badge>
            ))}
          </div>
          {eqData.length ? (
            <div className="grid gap-3 md:grid-cols-3">
              {eqData.map((e) => (
                <div key={e.id} className="p-3 border rounded-lg flex items-center justify-between">
                  <div>
                    <div className="font-medium">{e.id}</div>
                    {e.calib && (
                      <div className="text-xs text-muted-foreground">Last Cal: {new Date(e.calib.lastCalibration).toLocaleDateString()} • Next: {new Date(e.calib.nextDue).toLocaleDateString()}</div>
                    )}
                  </div>
                  <div className="flex items-center gap-4 text-sm">
                    <div>Vibration: {fmt(e.vibration)} mm/s</div>
                    {e.calib && (
                      <Badge className={
                        e.calib.status === 'overdue'
                          ? 'bg-destructive text-destructive-foreground'
                          : e.calib.status === 'due-soon'
                          ? 'bg-warning text-warning-foreground'
                          : 'bg-success text-success-foreground'
                      }>
                        {e.calib.status}
                      </Badge>
                    )}
                    <Badge className={e.alert ? 'bg-warning text-warning-foreground' : 'bg-success text-success-foreground'}>
                      {e.alert ? 'Alert' : 'OK'}
                    </Badge>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="text-sm text-muted-foreground">No equipment telemetry available.</div>
          )}
        </CardContent>
      </Card>

      {/* Trends */}
      <div className="grid gap-4 md:grid-cols-3">
        <Card>
          <CardHeader>
            <Tooltip>
              <TooltipTrigger asChild>
                <CardTitle className="cursor-help">Temperature Trend</CardTitle>
              </TooltipTrigger>
              <TooltipContent>
                Area + line of temperature over recent hours. Dashed orange lines are spec limits (min/max) from batch CPP bounds.
              </TooltipContent>
            </Tooltip>
          </CardHeader>
          <CardContent>
            <ChartContainer
              className="h-40"
              config={{ temperature: { color: '#3b82f6', label: 'Temperature' } }}
            >
              <AreaChart data={tempSeries} margin={{ left: 8, right: 8, top: 8, bottom: 0 }}>
                <CartesianGrid vertical={false} strokeDasharray="3 3" />
                <XAxis dataKey="t" hide tickLine={false} axisLine={false} />
                <YAxis width={36} tickLine={false} axisLine={false} domain={[s.temperature.min - 0.5, s.temperature.max + 0.5]} label={{ value: '°C', angle: -90, position: 'insideLeft', offset: 10 }} />
                <ReferenceLine y={s.temperature.min} stroke="#f59e0b" strokeDasharray="4 4" />
                <ReferenceLine y={s.temperature.max} stroke="#f59e0b" strokeDasharray="4 4" />
                <ChartTooltip content={<ChartTooltipContent nameKey="temperature" formatter={(value) => (<span>{Number(value).toFixed(2)}°C</span>)} />} />
                <ChartLegend content={<ChartLegendContent />} />
                <Area type="monotone" dataKey="value" name="Temperature" stroke="var(--color-temperature)" fill="var(--color-temperature)" fillOpacity={0.15} strokeWidth={2} />
                <Line type="monotone" dataKey="value" name="Temperature" stroke="var(--color-temperature)" dot={false} strokeWidth={2} />
              </AreaChart>
            </ChartContainer>
            <ChartLegendInline
              className="mt-2"
              align="left"
              items={[
                { key: 'temp', label: 'Temperature', color: '#3b82f6' },
                { key: 'spec', label: 'Spec Limit', color: '#f59e0b', dashed: true },
              ]}
            />
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <Tooltip>
              <TooltipTrigger asChild>
                <CardTitle className="cursor-help">Pressure Trend</CardTitle>
              </TooltipTrigger>
              <TooltipContent>
                Area + line of pressure over recent hours. Dashed orange lines show allowed pressure bounds for this batch.
              </TooltipContent>
            </Tooltip>
          </CardHeader>
          <CardContent>
            <ChartContainer
              className="h-40"
              config={{ pressure: { color: '#10b981', label: 'Pressure' } }}
            >
              <AreaChart data={pressSeries} margin={{ left: 8, right: 8, top: 8, bottom: 0 }}>
                <CartesianGrid vertical={false} strokeDasharray="3 3" />
                <XAxis dataKey="t" hide tickLine={false} axisLine={false} />
                <YAxis width={36} tickLine={false} axisLine={false} domain={[s.pressure.min - 0.1, s.pressure.max + 0.1]} label={{ value: 'bar', angle: -90, position: 'insideLeft', offset: 10 }} />
                <ReferenceLine y={s.pressure.min} stroke="#f59e0b" strokeDasharray="4 4" />
                <ReferenceLine y={s.pressure.max} stroke="#f59e0b" strokeDasharray="4 4" />
                <ChartTooltip content={<ChartTooltipContent nameKey="pressure" formatter={(value) => (<span>{Number(value).toFixed(2)} bar</span>)} />} />
                <ChartLegend content={<ChartLegendContent />} />
                <Area type="monotone" dataKey="value" name="Pressure" stroke="var(--color-pressure)" fill="var(--color-pressure)" fillOpacity={0.15} strokeWidth={2} />
                <Line type="monotone" dataKey="value" name="Pressure" stroke="var(--color-pressure)" dot={false} strokeWidth={2} />
              </AreaChart>
            </ChartContainer>
            <ChartLegendInline
              className="mt-2"
              align="left"
              items={[
                { key: 'press', label: 'Pressure', color: '#10b981' },
                { key: 'spec', label: 'Spec Limit', color: '#f59e0b', dashed: true },
              ]}
            />
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <Tooltip>
              <TooltipTrigger asChild>
                <CardTitle className="cursor-help">pH Trend</CardTitle>
              </TooltipTrigger>
              <TooltipContent>
                Area + line of pH over recent hours. Dashed orange lines indicate spec limits (min/max) for pH.
              </TooltipContent>
            </Tooltip>
          </CardHeader>
          <CardContent>
            <ChartContainer
              className="h-40"
              config={{ pH: { color: '#8b5cf6', label: 'pH' } }}
            >
              <AreaChart data={phSeries} margin={{ left: 8, right: 8, top: 8, bottom: 0 }}>
                <CartesianGrid vertical={false} strokeDasharray="3 3" />
                <XAxis dataKey="t" hide tickLine={false} axisLine={false} />
                <YAxis width={36} tickLine={false} axisLine={false} domain={[s.pH.min - 0.1, s.pH.max + 0.1]} label={{ value: 'pH', angle: -90, position: 'insideLeft', offset: 10 }} />
                <ReferenceLine y={s.pH.min} stroke="#f59e0b" strokeDasharray="4 4" />
                <ReferenceLine y={s.pH.max} stroke="#f59e0b" strokeDasharray="4 4" />
                <ChartTooltip content={<ChartTooltipContent nameKey="pH" formatter={(value) => (<span>{Number(value).toFixed(2)} pH</span>)} />} />
                <ChartLegend content={<ChartLegendContent />} />
                <Area type="monotone" dataKey="value" name="pH" stroke="var(--color-pH)" fill="var(--color-pH)" fillOpacity={0.15} strokeWidth={2} />
                <Line type="monotone" dataKey="value" name="pH" stroke="var(--color-pH)" dot={false} strokeWidth={2} />
              </AreaChart>
            </ChartContainer>
            <ChartLegendInline
              className="mt-2"
              align="left"
              items={[
                { key: 'ph', label: 'pH', color: '#8b5cf6' },
                { key: 'spec', label: 'Spec Limit', color: '#f59e0b', dashed: true },
              ]}
            />
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Critical Process Parameters</CardTitle>
        </CardHeader>
        <CardContent className="space-y-2">
          <ParamRow label="Temperature" current={p.temperature.current} min={s.temperature.min} max={s.temperature.max} target={p.temperature.target} unit={p.temperature.unit} />
          <ParamRow label="Pressure" current={p.pressure.current} min={s.pressure.min} max={s.pressure.max} target={p.pressure.target} unit={p.pressure.unit} />
          <ParamRow label="pH" current={p.pH.current} min={s.pH.min} max={s.pH.max} target={p.pH.target} unit={p.pH.unit} />
          <ParamRow label="Volume" current={p.volume.current} min={s.volume.min} max={s.volume.max} target={p.volume.target} unit={p.volume.unit} />
        </CardContent>
      </Card>

      {/* Equipment health */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <Tooltip>
              <TooltipTrigger asChild>
                <CardTitle className="cursor-help">Equipment Vibration (mm/s)</CardTitle>
              </TooltipTrigger>
              <TooltipContent>
                Current RMS vibration per equipment. Alerts indicate transient or sustained elevation relative to baseline.
              </TooltipContent>
            </Tooltip>
            <div className="text-xs text-muted-foreground">As of {asOf.toLocaleTimeString()}</div>
          </div>
        </CardHeader>
        <CardContent>
          {eqData.length === 0 ? (
            <div className="text-muted-foreground text-sm">No equipment telemetry available.</div>
          ) : (
            <ChartContainer
              className="h-48"
              config={{ ok: { color: '#10b981' }, warn: { color: '#f59e0b' } }}
            >
              <BarChart data={eqData} margin={{ left: 8, right: 8, top: 8, bottom: 0 }}>
                <CartesianGrid vertical={false} strokeDasharray="3 3" />
                <XAxis dataKey="id" axisLine={false} tickLine={false} />
                <YAxis width={28} tickLine={false} axisLine={false} />
                <ChartTooltip content={<ChartTooltipContent />} />
                <Bar dataKey="vibration" name="Vibration (mm/s)">
                  {eqData.map((d) => (
                    <Cell key={d.id} fill={d.alert ? 'var(--color-warn)' : 'var(--color-ok)'} />
                  ))}
                </Bar>
              </BarChart>
            </ChartContainer>
          )}
          {eqData.length > 0 && (
            <ChartLegendInline
              className="mt-2"
              align="left"
              items={[
                { key: 'ok', label: 'OK', color: '#10b981' },
                { key: 'warn', label: 'Alert', color: '#f59e0b' },
              ]}
            />
          )}
        </CardContent>
      </Card>
    </div>
  )
}

export default BatchAnalytics
