import React, { useEffect, useMemo, useState } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { useKV } from '@github/spark/hooks'
import type { AuditEvent } from '@/hooks/use-audit'

import { Robot, DownloadSimple, ArrowLeft, ArrowClockwise, Package } from '@phosphor-icons/react'
import { monitor, decisionThreshold, type ModelId, getLogisticState, sampleAndRecordPredictions } from '@/lib/modeling'
import { toast } from 'sonner'
import { ChartContainer, ChartLegendInline, ChartTooltip, ChartTooltipContent, type ChartConfig } from '@/components/ui/chart'
import { LineChart, Line, XAxis, YAxis, CartesianGrid, ResponsiveContainer } from 'recharts'

type Props = { onBack: () => void }

type AssistantMessage = {
  id: string
  role: 'user' | 'assistant'
  content: string
  createdAt: string
}

type MetricsPoint = {
  t: number
  id: ModelId
  n: number
  auroc: number
  brier: number
  ece: number
  threshold: number
}

export function AIAuditTrail({ onBack }: Props) {
  const [events = [], setEvents] = useKV<AuditEvent[]>('audit-events', [])
  const [chat = []] = useKV<AssistantMessage[]>('operations-assistant-history', [])
  const [metricsHistory = [], setMetricsHistory] = useKV<MetricsPoint[]>('model-metrics-history', [])
  const [refreshTick, setRefreshTick] = useState(0)
  const [metric, setMetric] = useState<'auroc' | 'brier' | 'ece'>('auroc')

  const aiEvents = useMemo(() => (events || []).filter(e => e.module === 'ai'), [events])
  const modelIds: ModelId[] = ['quality_prediction', 'deviation_risk', 'equipment_failure']
  const modelMetrics = useMemo(() => modelIds.map(id => ({ id, metrics: monitor.metrics(id, { threshold: decisionThreshold[id], minN: 10, requireBothClasses: false }), lr: getLogisticState(id) })), [modelIds])
  // Fallback: reconstruct conversation from AI audit events if KV chat is empty
  const chatFromAudit: AssistantMessage[] = useMemo(() => {
    if ((chat || []).length > 0) return []
    const items = (events || []).filter(e => e.module === 'ai' && (e.action === 'AI Assistant Prompt' || e.action === 'AI Assistant Response'))
      .sort((a, b) => new Date(a.timestamp as unknown as string).getTime() - new Date(b.timestamp as unknown as string).getTime())
    return items.map<AssistantMessage>((e, idx) => ({
      id: `${new Date(e.timestamp as unknown as string).getTime()}-${idx}`,
      role: e.action === 'AI Assistant Prompt' ? 'user' : 'assistant',
      content: e.details || '',
      createdAt: (e.timestamp instanceof Date ? e.timestamp : new Date(e.timestamp as unknown as string)).toISOString(),
    }))
  }, [chat, events, refreshTick])
  const usingAuditReconstruction = (!chat || chat.length === 0) && (chatFromAudit.length > 0)
  const chatEffective = (chat && chat.length > 0) ? chat : chatFromAudit

  // Prepare timeseries data: one record per timestamp, fields per model id
  const chartData = useMemo(() => {
    const pts = (metricsHistory || []) as MetricsPoint[]
    if (!pts.length) return [] as Array<Record<string, number | string>>
    // bucket by timestamp
    const byT = new Map<number, MetricsPoint[]>()
    for (const p of pts) {
      const arr = byT.get(p.t) || []
      arr.push(p)
      byT.set(p.t, arr)
    }
    const times = Array.from(byT.keys()).sort((a, b) => a - b)
    const last = times.slice(-120) // cap points for readability
    return last.map(t => {
      const row: Record<string, number | string> = { t, time: new Date(t).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) }
      const points = byT.get(t) || []
      for (const p of points) {
        row[p.id] = p[metric]
        row[`n_${p.id}`] = p.n
      }
      return row
    })
  }, [metricsHistory, metric])

  const chartConfig: ChartConfig = {
    quality_prediction: { label: 'Quality', color: '#2563EB' },
    deviation_risk: { label: 'Deviation Risk', color: '#16A34A' },
    equipment_failure: { label: 'Equipment Failure', color: '#DC2626' },
  }

  const exportJson = () => {
    const payload = { exportedAt: new Date().toISOString(), aiEvents, chat, modelMetrics: modelMetrics.map(m => ({ id: m.id, metrics: m.metrics, trainedAt: m.lr?.trainedAt ?? null, n: m.lr?.n ?? 0, featureKeys: m.lr?.featureKeys ?? [] })) }
    const blob = new Blob([JSON.stringify(payload, null, 2)], { type: 'application/json' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `ai-audit-${new Date().toISOString()}.json`
    document.body.appendChild(a)
    a.click()
    document.body.removeChild(a)
    URL.revokeObjectURL(url)
  }

  const sampleNow = () => {
    try {
      // Generate fresh prediction records
      sampleAndRecordPredictions()
      const t = Date.now()
      const pts: MetricsPoint[] = modelIds.map(id => {
        const m = monitor.metrics(id, { threshold: decisionThreshold[id], minN: 10, requireBothClasses: false })
        return { t, id, n: m.n, auroc: m.auroc, brier: m.brier, ece: m.ece, threshold: m.threshold }
      })
      setMetricsHistory((curr = []) => {
        const next = [...curr, ...pts]
        return next.length > 500 ? next.slice(next.length - 500) : next
      })
      // Log an AI audit heartbeat for visibility
      const ev: AuditEvent = {
        id: `AUD-${Date.now()}`,
        timestamp: new Date(),
        userId: 'system@local',
        userRole: 'System',
        action: 'AI Metrics Sample',
        module: 'ai',
        details: 'Manual sample triggered from AI Audit Trail',
        ipAddress: '127.0.0.1',
        sessionId: 'sess-local',
        outcome: 'success',
      }
      setEvents((curr = []) => [ev, ...curr])
    } catch {
      // ignore
    }
  }

  // Auto-sample on enter (throttled to avoid rapid repeats)
  useEffect(() => {
    const latest = metricsHistory.length ? metricsHistory[metricsHistory.length - 1].t : 0
    if (!latest || Date.now() - latest > 15_000) {
      sampleNow()
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const exportCsv = () => {
    const lines: string[] = []
    lines.push('type,timestamp,user,role,action,details,recordId,outcome')
    aiEvents.forEach(ev => {
      const action = (ev.action || '').replace(/,/g, ' ')
      const details = (ev.details || '').replace(/\n/g, ' ').replace(/,/g, ' ')
      lines.push(`audit,${ev.timestamp instanceof Date ? ev.timestamp.toISOString() : new Date(ev.timestamp).toISOString()},${ev.userId},${ev.userRole},${action},${details},${ev.recordId ?? ''},${ev.outcome}`)
    })
    lines.push('')
    lines.push('model,id,samples,auroc,brier,ece,threshold,trainedAt,features,n')
    modelMetrics.forEach(m => {
      lines.push(`metrics,${m.id},${m.metrics.n},${m.metrics.auroc.toFixed(4)},${m.metrics.brier.toFixed(4)},${m.metrics.ece.toFixed(4)},${m.metrics.threshold},${m.lr?.trainedAt ? new Date(m.lr.trainedAt).toISOString() : ''},${m.lr?.featureKeys.length ?? 0},${m.lr?.n ?? 0}`)
    })
    lines.push('type,createdAt,role,content')
    chat.forEach(m => {
      const content = (m.content || '').replace(/\n/g, ' ').replace(/,/g, ' ')
      lines.push(`chat,${m.createdAt},${m.role},${content}`)
    })
    const blob = new Blob([lines.join('\n')], { type: 'text/csv' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `ai-audit-${new Date().toISOString()}.csv`
    document.body.appendChild(a)
    a.click()
    document.body.removeChild(a)
    URL.revokeObjectURL(url)
  }

  const handleRefresh = () => {
    setRefreshTick(Date.now())
    // Add a small navigation audit event for traceability
    try {
      const ev: AuditEvent = {
        id: `AUD-${Date.now()}-REFRESH`,
        timestamp: new Date(),
        userId: 'system@local',
        userRole: 'System',
        action: 'AI Audit Refresh',
        module: 'navigation',
        details: 'Manual refresh triggered on AI Audit page',
        ipAddress: '127.0.0.1',
        sessionId: 'sess-local',
        outcome: 'success',
      }
      setEvents((curr = []) => [ev, ...curr])
    } catch {}
    toast.success(`Refreshed • source: ${usingAuditReconstruction ? 'audit reconstruction' : 'chat store'}`)
  }

  // Also refresh when the page becomes visible or hash changes back to this view
  useEffect(() => {
    const onVisibility = () => {
      if (document.visibilityState === 'visible' && window.location.hash.startsWith('#audit')) {
        setRefreshTick(Date.now())
      }
    }
    const onHash = () => {
      if (window.location.hash === '#audit/ai') setRefreshTick(Date.now())
    }
    document.addEventListener('visibilitychange', onVisibility)
    window.addEventListener('hashchange', onHash)
    return () => {
      document.removeEventListener('visibilitychange', onVisibility)
      window.removeEventListener('hashchange', onHash)
    }
  }, [])

  return (
    <div className="p-6 space-y-6 overflow-auto h-full">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold flex items-center gap-3">
            <Robot className="h-7 w-7 text-primary" /> AI Audit Trail
          </h1>
          <p className="text-muted-foreground">Transparency for AI prompts, responses, and related audit events. Export for review and compliance.</p>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" onClick={handleRefresh} className="flex items-center gap-2"><ArrowClockwise className="h-4 w-4" /> Refresh</Button>
          <Button variant="outline" onClick={exportCsv} className="flex items-center gap-2"><DownloadSimple className="h-4 w-4" /> CSV</Button>
          <Button variant="default" onClick={exportJson} className="flex items-center gap-2"><DownloadSimple className="h-4 w-4" /> JSON</Button>
          <Button variant="secondary" onClick={() => { window.location.hash = '#audit/evidence' }} className="flex items-center gap-2"><Package className="h-4 w-4" /> Bundle Evidence</Button>
          <Button variant="secondary" onClick={sampleNow} className="flex items-center gap-2">Sample now</Button>
          <Button variant="ghost" onClick={onBack}><ArrowLeft className="h-4 w-4 mr-2" /> Back</Button>
        </div>
      </div>

      <div className="grid gap-6 md:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Model Drift & Calibration</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3 text-sm">
              {modelMetrics.map(({ id, metrics, lr }) => (
                <div key={id} className="p-3 rounded-md border">
                  <div className="font-medium">{id.replace(/_/g,' ')}</div>
                  <div className="text-xs text-muted-foreground mb-1">samples {metrics.n} • auroc {metrics.auroc.toFixed(3)} • brier {metrics.brier.toFixed(3)} • ece {metrics.ece.toFixed(3)} • thr {metrics.threshold}</div>
                  <div className="text-xs text-muted-foreground">trained {lr?.trainedAt ? new Date(lr.trainedAt).toLocaleString() : '—'} • features {lr?.featureKeys.length ?? 0} • n {lr?.n ?? 0}</div>
                </div>
              ))}
              <div className="text-xs text-muted-foreground">history points persisted: {metricsHistory.length}</div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <div className="flex items-center justify-between gap-2">
              <CardTitle>Drift Trendlines</CardTitle>
              <div className="inline-flex items-center rounded-md border p-0.5">
                {(['auroc','brier','ece'] as const).map(m => (
                  <Button key={m} size="sm" variant={metric === m ? 'default' : 'ghost'} onClick={() => setMetric(m)} className="h-7 text-xs">
                    {m.toUpperCase()}
                  </Button>
                ))}
              </div>
            </div>
            <p className="text-muted-foreground text-xs">Live metrics sampled every 30s from the digital twin monitor. Values reflect recent predictions; AUROC/ECE in [0,1], lower Brier/ECE is better.</p>
          </CardHeader>
          <CardContent>
            {chartData.length === 0 ? (
              <div className="text-sm text-muted-foreground">No history captured yet. The sampler records metrics periodically while the app is open.</div>
            ) : (
              <ChartContainer className="h-64" config={chartConfig}>
                <ResponsiveContainer>
                  <LineChart data={chartData} margin={{ left: 12, right: 12, top: 8, bottom: 0 }}>
                    <CartesianGrid vertical={false} strokeDasharray="3 3" />
                    <XAxis
                      dataKey="t"
                      type="number"
                      domain={['dataMin', 'dataMax']}
                      tickFormatter={(v) => new Date(v as number).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                      tickLine={false}
                      axisLine={false}
                    />
                    <YAxis domain={[0, 1]} allowDecimals tickLine={false} axisLine={false} width={28} />
                    <ChartTooltip content={<ChartTooltipContent />} labelFormatter={(value) => new Date(value as number).toLocaleString()} />
                    <Line type="monotone" dataKey="quality_prediction" stroke="var(--color-quality_prediction)" dot={false} strokeWidth={2} connectNulls name="Quality" />
                    <Line type="monotone" dataKey="deviation_risk" stroke="var(--color-deviation_risk)" dot={false} strokeWidth={2} connectNulls name="Deviation Risk" />
                    <Line type="monotone" dataKey="equipment_failure" stroke="var(--color-equipment_failure)" dot={false} strokeWidth={2} connectNulls name="Equipment Failure" />
                  </LineChart>
                </ResponsiveContainer>
              </ChartContainer>
            )}
            <ChartLegendInline className="mt-3" align="left" items={[
              { key: 'quality', label: 'Quality', color: '#2563EB' },
              { key: 'deviation', label: 'Deviation Risk', color: '#16A34A' },
              { key: 'equipment', label: 'Equipment Failure', color: '#DC2626' },
            ]} />
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>AI Audit Events</CardTitle>
          </CardHeader>
          <CardContent>
            {aiEvents.length === 0 ? (
              <div className="text-sm text-muted-foreground">No AI-related audit events recorded yet.</div>
            ) : (
              <div className="space-y-3">
                {aiEvents.map(ev => (
                  <div key={ev.id} className="p-3 rounded-md border">
                    <div className="flex items-center justify-between">
                      <div className="font-medium text-sm">{ev.action}</div>
                      <Badge variant="outline" className="text-[10px] uppercase">{ev.outcome}</Badge>
                    </div>
                    <div className="text-xs text-muted-foreground mt-1">{(ev.timestamp instanceof Date ? ev.timestamp : new Date(ev.timestamp as unknown as string)).toLocaleString()} • {ev.userId} ({ev.userRole})</div>
                    {ev.recordId && <div className="text-xs text-muted-foreground">Record: {ev.recordId}</div>}
                    {ev.details && <div className="mt-2 text-sm whitespace-pre-wrap">{ev.details}</div>}
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Operations Copilot Conversation Archive</CardTitle>
          </CardHeader>
          <CardContent>
            {usingAuditReconstruction && (
              <div className="mb-3 text-[11px] text-muted-foreground">Showing conversation reconstructed from audit events.</div>
            )}
            {chatEffective.length === 0 ? (
              <div className="text-sm text-muted-foreground">
                No messages yet. Open the Operations Copilot to start a conversation.
                <div className="mt-2">
                  <Button variant="outline" size="sm" onClick={() => { window.location.hash = '#assistant' }}>Open Assistant</Button>
                </div>
              </div>
            ) : (
              <div className="space-y-2">
                {chatEffective.map(m => (
                  <div key={m.id} className="rounded-md border p-3">
                    <div className="text-[10px] uppercase text-muted-foreground mb-1">{m.role} • {new Date(m.createdAt).toLocaleString()}</div>
                    <div className="text-sm whitespace-pre-wrap">{m.content}</div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  )
}

export default AIAuditTrail
