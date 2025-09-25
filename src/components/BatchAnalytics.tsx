import React from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { batches, getCPPCompliance } from '@/data/seed'
import { ArrowLeft, ChartLine, Warning, CheckCircle } from '@phosphor-icons/react'

type Props = {
  batchId: string
  onBack: () => void
}

const fmtPct = (n: number) => `${(n * 100).toFixed(0)}%`
const fmt = (n: number, digits = 2) => n.toFixed(digits)

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
      <div className="font-medium">{label}</div>
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
            <CardTitle className="text-sm text-muted-foreground">CPP Compliance</CardTitle>
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
            <div className="text-2xl font-mono font-bold">{batch.progress}%</div>
            <div className="text-xs text-muted-foreground">Toward completion</div>
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
    </div>
  )
}

export default BatchAnalytics
