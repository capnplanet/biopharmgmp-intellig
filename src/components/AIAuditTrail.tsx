import React, { useMemo, useState } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { useKV } from '@github/spark/hooks'
import type { AuditEvent } from '@/hooks/use-audit'

import { Robot, DownloadSimple, ArrowLeft } from '@phosphor-icons/react'
import { monitor, decisionThreshold, type ModelId, getLogisticState } from '@/lib/modeling'

type Props = { onBack: () => void }

type AssistantMessage = {
  id: string
  role: 'user' | 'assistant'
  content: string
  createdAt: string
}

export function AIAuditTrail({ onBack }: Props) {
  const [events = []] = useKV<AuditEvent[]>('audit-events', [])
  const [chat = []] = useKV<AssistantMessage[]>('operations-assistant-history', [])

  const aiEvents = useMemo(() => (events || []).filter(e => e.module === 'ai'), [events])
  const modelIds: ModelId[] = ['quality_prediction', 'deviation_risk', 'equipment_failure']
  const modelMetrics = useMemo(() => modelIds.map(id => ({ id, metrics: monitor.metrics(id, { threshold: decisionThreshold[id], minN: 10, requireBothClasses: false }), lr: getLogisticState(id) })), [])

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
          <Button variant="outline" onClick={exportCsv} className="flex items-center gap-2"><DownloadSimple className="h-4 w-4" /> CSV</Button>
          <Button variant="default" onClick={exportJson} className="flex items-center gap-2"><DownloadSimple className="h-4 w-4" /> JSON</Button>
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
            </div>
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
                    <div className="text-xs text-muted-foreground mt-1">{new Date(ev.timestamp as unknown as string).toLocaleString()} • {ev.userId} ({ev.userRole})</div>
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
            {chat.length === 0 ? (
              <div className="text-sm text-muted-foreground">No messages yet.</div>
            ) : (
              <div className="space-y-2">
                {chat.map(m => (
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
