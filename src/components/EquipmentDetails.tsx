import React, { useEffect, useMemo, useState } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { ArrowLeft, Gauge, Thermometer, Activity, Wrench } from '@phosphor-icons/react'
import { ensureEquipmentFeed, subscribeToEquipmentFeed } from '@/lib/equipmentFeed'
import type { TwinSnapshot } from '@/lib/digitalTwin'
import { equipmentCalibration, type EquipmentTelemetry, batches as seedBatches } from '@/data/seed'
import { getEquipmentMeta } from '@/data/equipmentCatalog'
import { ChartContainer, ChartTooltip, ChartTooltipContent, type ChartConfig } from '@/components/ui/chart'
import { Area, AreaChart, CartesianGrid, Line, LineChart, XAxis, YAxis } from 'recharts'
import { useProductionBatches } from '@/hooks/use-production-batches'
import { useKV } from '@github/spark/hooks'
import type { CAPA, ChangeControl, Deviation } from '@/types/quality'

type Props = {
  id: string
  onBack: () => void
}

function Stat({ label, value, unit, icon: Icon }: { label: string; value: string | number; unit?: string; icon: React.ComponentType<{ className?: string }> }) {
  return (
    <Card>
      <CardContent className="p-4">
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <Icon className="h-4 w-4" /> {label}
        </div>
        <div className="mt-2 text-2xl font-mono font-bold">
          {value}{unit ?? ''}
        </div>
      </CardContent>
    </Card>
  )
}

export function EquipmentDetails({ id, onBack }: Props) {
  const [latest, setLatest] = useState<TwinSnapshot | null>(null)
  const [history, setHistory] = useState<Array<{ t: string; rms: number; tvar: number }>>([])
  const [deviations = []] = useKV<Deviation[]>('deviations', [])
  const [capas = []] = useKV<CAPA[]>('capas', [])
  const [changeControls = []] = useKV<ChangeControl[]>('change-controls', [])

  const batches = useProductionBatches()
  const batchSource = batches.length ? batches : seedBatches

  useEffect(() => {
    ensureEquipmentFeed()
    const unsub = subscribeToEquipmentFeed((snapshot) => {
      setLatest(snapshot)
      const point = snapshot.equipmentTelemetry.find(t => t.id === id)
      if (!point) return
      setHistory(prev => {
        const next = [...prev, { t: snapshot.timestamp.toISOString(), rms: Number(point.vibrationRMS.toFixed(3)), tvar: Number(point.temperatureVar.toFixed(3)) }]
        // keep last 60 points
        return next.slice(-60)
      })
    })
    return () => unsub()
  }, [])

  const telemetry = useMemo<EquipmentTelemetry | undefined>(() => {
    const list = latest?.equipmentTelemetry
    return list?.find((t) => t.id === id)
  }, [latest, id])

  const meta = useMemo(() => getEquipmentMeta(id), [id])
  const calibration = useMemo(() => equipmentCalibration.find((c) => c.id === id), [id])

  const relatedBatches = useMemo(() => {
    return batchSource.filter((b) => b.equipment.includes(id))
  }, [batchSource, id])

  const relatedDeviations = useMemo(() => {
    const batchIds = new Set(relatedBatches.map((b) => b.id))
    return deviations.filter((d) => batchIds.has(d.batchId))
  }, [deviations, relatedBatches])

  const relatedCAPA = useMemo(() => {
    const relatedDevIds = new Set(relatedDeviations.map(d => d.id))
    return capas.filter((c) => (c.relatedDeviations || []).some(devId => relatedDevIds.has(devId)))
  }, [capas, relatedDeviations])

  const relatedCC = useMemo(() => changeControls.filter((c) => c.impactedEquipment?.includes?.(id)), [changeControls, id])

  const statusBadge = (() => {
    if (!telemetry) return 'bg-muted text-muted-foreground'
    if (telemetry.vibrationAlert) return 'bg-warning text-warning-foreground'
    return 'bg-success text-success-foreground'
  })()

  const chartConfig: ChartConfig = {
    rms: { label: 'Vibration RMS', color: '#ef4444' },
    tvar: { label: 'Temp Variability', color: '#3b82f6' },
  }

  const goQuality = (path: string) => {
    window.location.hash = `#quality/${path}`
  }

  return (
    <div className="p-6 space-y-6 overflow-auto h-full">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold flex items-center gap-3">
            <span className="font-mono">{id}</span>
            <Badge className={statusBadge}>{telemetry?.vibrationAlert ? 'warning' : 'online'}</Badge>
          </h1>
          {meta && (
            <p className="text-muted-foreground">{meta.name} • {meta.classification} • {meta.processArea}</p>
          )}
        </div>
        <Button variant="ghost" onClick={onBack}>
          <ArrowLeft className="h-4 w-4 mr-2" /> Back to Dashboard
        </Button>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Live Telemetry</CardTitle>
        </CardHeader>
        <CardContent>
          {telemetry ? (
            <div className="grid gap-4 md:grid-cols-3">
              <Stat label="Vibration RMS" value={telemetry.vibrationRMS.toFixed(2)} unit=" mm/s" icon={Activity} />
              <Stat label="Temp Variability" value={telemetry.temperatureVar.toFixed(2)} unit=" °C" icon={Thermometer} />
              <Stat label="Uptime" value={telemetry.uptimeHours.toFixed(0)} unit=" h" icon={Gauge} />
              <div className="md:col-span-3">
                <div className="text-sm font-medium text-muted-foreground mb-2">Trends (last {history.length} ticks)</div>
                <ChartContainer className="h-52" config={chartConfig}>
                  <ComposedTrend data={history} />
                </ChartContainer>
              </div>
            </div>
          ) : (
            <div className="text-sm text-muted-foreground">No live snapshot yet. Waiting for digital twin…</div>
          )}
        </CardContent>
      </Card>

      <div className="grid gap-6 md:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Calibration & Interfaces</CardTitle>
          </CardHeader>
          <CardContent>
            {calibration ? (
              <div className="space-y-2">
                <div className="text-sm">Last Calibration: {new Date(calibration.lastCalibration).toLocaleDateString()}</div>
                <div className="text-sm">Next Due: {new Date(calibration.nextDue).toLocaleDateString()}</div>
                <Badge className={calibration.status === 'overdue' ? 'bg-destructive text-destructive-foreground' : calibration.status === 'due-soon' ? 'bg-warning text-warning-foreground' : 'bg-success text-success-foreground'}>
                  {calibration.status}
                </Badge>
            </div>
            ) : (
              <div className="text-sm text-muted-foreground">No calibration record in seed data</div>
            )}
            {meta && (
              <div className="mt-4 text-sm">
                <div className="font-medium flex items-center gap-2"><Wrench className="h-4 w-4" /> Supported Interfaces</div>
                <div className="mt-1 text-muted-foreground">{meta.supportedInterfaces.join(', ')}</div>
              </div>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Associated Batches</CardTitle>
          </CardHeader>
          <CardContent>
            {relatedBatches.length === 0 ? (
              <div className="text-sm text-muted-foreground">No batches currently linked to this equipment.</div>
            ) : (
              <div className="space-y-2">
                {relatedBatches.map((b) => (
                  <div key={b.id} className="flex items-center justify-between">
                    <div>
                      <div className="font-mono font-medium">{b.id}</div>
                      <div className="text-xs text-muted-foreground">{b.product} • {b.stage}</div>
                    </div>
                    <Badge>{b.status}</Badge>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Quality Records</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid gap-4 md:grid-cols-3">
            <div>
              <div className="text-sm font-medium mb-2">Deviations</div>
              {relatedDeviations.length === 0 ? (
                <div className="text-sm text-muted-foreground">None linked</div>
              ) : (
                <ul className="space-y-1 text-sm">
                  {relatedDeviations.map((d) => (
                    <li key={d.id}>
                      <Button variant="link" className="p-0 h-auto" onClick={() => goQuality(`deviation/${d.id}`)}>
                        {d.id} — {d.title}
                      </Button>
                    </li>
                  ))}
                </ul>
              )}
            </div>
            <div>
              <div className="text-sm font-medium mb-2">CAPAs</div>
              {relatedCAPA.length === 0 ? (
                <div className="text-sm text-muted-foreground">None linked</div>
              ) : (
                <ul className="space-y-1 text-sm">
                  {relatedCAPA.map((c) => (
                    <li key={c.id}>
                      <Button variant="link" className="p-0 h-auto" onClick={() => goQuality(`capa/${c.id}/review`)}>
                        {c.id} — {c.title}
                      </Button>
                    </li>
                  ))}
                </ul>
              )}
            </div>
            <div>
              <div className="text-sm font-medium mb-2">Change Controls</div>
              {relatedCC.length === 0 ? (
                <div className="text-sm text-muted-foreground">None linked</div>
              ) : (
                <ul className="space-y-1 text-sm">
                  {relatedCC.map((c) => (
                    <li key={c.id}>
                      <Button variant="link" className="p-0 h-auto" onClick={() => goQuality(`cc/${c.id}`)}>
                        {c.id} — {c.title}
                      </Button>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}

export default EquipmentDetails

function ComposedTrend({ data }: { data: Array<{ t: string; rms: number; tvar: number }> }) {
  const points = data.map(p => ({
    time: new Date(p.t).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
    rms: p.rms,
    tvar: p.tvar,
  }))
  return (
    <AreaChart data={points} margin={{ left: 8, right: 16, top: 8, bottom: 0 }}>
      <CartesianGrid strokeDasharray="3 3" vertical={false} />
      <XAxis dataKey="time" axisLine={false} tickLine={false} />
      <YAxis axisLine={false} tickLine={false} width={36} />
      <ChartTooltip content={<ChartTooltipContent />} />
      <Area type="monotone" dataKey="rms" stroke="var(--color-rms)" fill="var(--color-rms)" fillOpacity={0.2} />
      <Area type="monotone" dataKey="tvar" stroke="var(--color-tvar)" fill="var(--color-tvar)" fillOpacity={0.2} />
    </AreaChart>
  )
}
