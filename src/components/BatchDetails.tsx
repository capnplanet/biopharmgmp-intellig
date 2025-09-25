import React from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Progress } from '@/components/ui/progress'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { batches, equipmentCalibration, equipmentTelemetry, type BatchData } from '@/data/seed'
import { TestTube, Gauge, Drop, Thermometer, ArrowLeft } from '@phosphor-icons/react'

type Props = {
  batchId: string
  onBack: () => void
}

const fmt = (n: number, digits = 1) => n.toFixed(digits)

function ParameterCard({ label, current, target, unit, icon: Icon }: {
  label: string
  current: number
  target: number
  unit: string
  icon: React.ComponentType<{ className?: string }>
}) {
  const deviation = Math.abs(current - target)
  const maxDeviation = Math.max(Math.abs(target) * 0.1, 0.001)
  const status = deviation > maxDeviation ? 'warning' : 'normal'

  return (
    <Card>
      <CardContent className="p-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Icon className={`h-4 w-4 ${status === 'warning' ? 'text-warning' : 'text-muted-foreground'}`} />
            <span className="text-sm font-medium">{label}</span>
          </div>
        </div>
        <div className="mt-2">
          <div className="text-2xl font-mono font-bold">
            {fmt(current)}{unit}
          </div>
          <div className="text-sm text-muted-foreground">
            Target: {fmt(target)}{unit}
          </div>
        </div>
      </CardContent>
    </Card>
  )
}

function BatchTimeline({ timeline }: { timeline: BatchData['timeline'] }) {
  return (
    <div className="space-y-4">
      {timeline.map((item, index) => (
        <div key={`${item.stage}-${index}`} className="flex items-center gap-4">
          <div className="flex flex-col items-center">
            <div
              className={`w-3 h-3 rounded-full ${
                item.status === 'complete' ? 'bg-success' : item.status === 'active' ? 'bg-primary' : 'bg-muted'
              }`}
            />
            {index < timeline.length - 1 && <div className="w-px h-8 bg-border mt-2" />}
          </div>
          <div className="flex-1">
            <div className="font-medium">{item.stage}</div>
            <div className="text-sm text-muted-foreground">
              Started: {item.startTime.toLocaleString()}
              {item.endTime && <span> • Completed: {item.endTime.toLocaleString()}</span>}
            </div>
          </div>
          <Badge
            variant={item.status === 'complete' ? 'default' : item.status === 'active' ? 'secondary' : 'outline'}
          >
            {item.status}
          </Badge>
        </div>
      ))}
    </div>
  )
}

export function BatchDetails({ batchId, onBack }: Props) {
  const batch = batches.find((b) => b.id === batchId)

  if (!batch) {
    return (
      <div className="p-6 space-y-4">
        <div className="flex items-center gap-2">
          <Button variant="ghost" size="sm" onClick={onBack}>
            <ArrowLeft className="h-4 w-4 mr-1" /> Back
          </Button>
        </div>
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

  const calibById = Object.fromEntries(
    equipmentCalibration.map((e) => [e.id, e])
  )
  const telemById = Object.fromEntries(
    equipmentTelemetry.map((t) => [t.id, t])
  )

  return (
    <div className="p-6 space-y-6 overflow-auto h-full">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold flex items-center gap-3">
            <span className="font-mono">{batch.id}</span>
            <Badge variant={batch.productType === 'large-molecule' ? 'default' : 'secondary'}>
              {batch.productType === 'large-molecule' ? 'Biologic' : 'Small Mol'}
            </Badge>
          </h1>
          <p className="text-muted-foreground">{batch.product}</p>
        </div>
        <Button variant="ghost" onClick={onBack}>
          <ArrowLeft className="h-4 w-4 mr-2" /> Back to Batches
        </Button>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Batch Overview</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid gap-6 md:grid-cols-3 items-start">
            <div className="space-y-2">
              <div className="text-sm text-muted-foreground">Current Stage</div>
              <div className="text-lg font-medium">{batch.stage}</div>
              <div className="text-sm text-muted-foreground mt-2">Started</div>
              <div>{batch.startTime.toLocaleString()}</div>
            </div>
            <div>
              <div className="flex justify-between text-sm mb-2">
                <span>Progress</span>
                <span>{batch.progress.toFixed(2)}%</span>
              </div>
              <Progress value={batch.progress} className="h-2" />
            </div>
            <div className="space-y-1">
              <div className="text-sm text-muted-foreground">Equipment</div>
              <div className="flex flex-wrap gap-2">
                {batch.equipment.map((id) => (
                  <Badge key={id} variant="outline" className="font-mono">
                    {id}
                  </Badge>
                ))}
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      <Tabs defaultValue="parameters" className="w-full">
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="parameters">Parameters</TabsTrigger>
          <TabsTrigger value="timeline">Timeline</TabsTrigger>
          <TabsTrigger value="equipment">Equipment</TabsTrigger>
        </TabsList>

        <TabsContent value="parameters" className="mt-6">
          <div className="grid gap-4 md:grid-cols-2">
            <ParameterCard
              label="Temperature"
              current={batch.parameters.temperature.current}
              target={batch.parameters.temperature.target}
              unit={batch.parameters.temperature.unit}
              icon={Thermometer}
            />
            <ParameterCard
              label="Pressure"
              current={batch.parameters.pressure.current}
              target={batch.parameters.pressure.target}
              unit={batch.parameters.pressure.unit}
              icon={Gauge}
            />
            <ParameterCard
              label="pH Level"
              current={batch.parameters.pH.current}
              target={batch.parameters.pH.target}
              unit={batch.parameters.pH.unit}
              icon={Drop}
            />
            <ParameterCard
              label="Volume"
              current={batch.parameters.volume.current}
              target={batch.parameters.volume.target}
              unit={batch.parameters.volume.unit}
              icon={TestTube}
            />
          </div>
        </TabsContent>

        <TabsContent value="timeline" className="mt-6">
          <BatchTimeline timeline={batch.timeline} />
        </TabsContent>

        <TabsContent value="equipment" className="mt-6">
          <div className="space-y-3">
            {batch.equipment.map((equipId) => {
              const cal = calibById[equipId]
              const tel = telemById[equipId]
              return (
                <div key={equipId} className="p-3 border rounded-lg flex items-center justify-between">
                  <div>
                    <div className="font-medium">{equipId}</div>
                    <div className="text-sm text-muted-foreground">
                      {cal ? `Last Cal: ${new Date(cal.lastCalibration).toLocaleDateString()} • Next: ${new Date(cal.nextDue).toLocaleDateString()}` : 'Calibration: N/A'}
                    </div>
                  </div>
                  <div className="flex items-center gap-4 text-sm">
                    <div>Vibration: {tel ? fmt(tel.vibrationRMS) : '—'} mm/s</div>
                    <div>Temp Var: {tel ? fmt(tel.temperatureVar) : '—'} °C</div>
                    <Badge className={cal?.status === 'overdue' ? 'bg-destructive text-destructive-foreground' : cal?.status === 'due-soon' ? 'bg-warning text-warning-foreground' : 'bg-success text-success-foreground'}>
                      {cal?.status ?? 'unknown'}
                    </Badge>
                  </div>
                </div>
              )
            })}
          </div>
        </TabsContent>
      </Tabs>
    </div>
  )
}

export default BatchDetails
