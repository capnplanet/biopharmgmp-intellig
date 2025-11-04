import React, { useMemo, useState } from 'react'
import { Card, CardHeader, CardContent, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { useKV } from '@github/spark/hooks'
import type { AuditEvent } from '@/hooks/use-audit'
import type { ModelId } from '@/lib/modeling'
import { monitor, decisionThreshold, getLogisticState } from '@/lib/modeling'
import JSZip from 'jszip'
import { buildAuditEventsCSVString, buildAuditEventsJSONString } from '@/utils/auditExport'
import { toast } from 'sonner'
import { ArrowLeft, Package, LinkSimpleHorizontal } from '@phosphor-icons/react'

// Types aligned with AIAuditTrail
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

export function EvidenceExportHelper({ onBack }: { onBack: () => void }) {
  const [events = [], setEvents] = useKV<AuditEvent[]>('audit-events', [])
  const [chat = []] = useKV<AssistantMessage[]>('operations-assistant-history', [])
  const [metricsHistory = []] = useKV<MetricsPoint[]>('model-metrics-history', [])
  const [from, setFrom] = useState<string>('')
  const [to, setTo] = useState<string>('')

  const modelIds: ModelId[] = ['quality_prediction', 'deviation_risk', 'equipment_failure']
  const modelMetrics = useMemo(() => modelIds.map(id => ({ id, metrics: monitor.metrics(id, { threshold: decisionThreshold[id], minN: 10, requireBothClasses: false }), lr: getLogisticState(id) })), [modelIds])

  const fromTs = useMemo(() => from ? Date.parse(from) : undefined, [from])
  const toTs = useMemo(() => to ? Date.parse(to) : undefined, [to])

  const inRange = (ts: number) => {
    if (fromTs && ts < fromTs) return false
    if (toTs && ts > toTs) return false
    return true
  }

  const aiEvents = useMemo(() => (events || []).filter(e => e.module === 'ai' && inRange(new Date(e.timestamp as unknown as string).getTime())), [events, inRange])
  const filteredAudit = useMemo(() => (events || []).filter(e => inRange(new Date(e.timestamp as unknown as string).getTime())), [events, inRange])
  const filteredMetrics = useMemo(() => (metricsHistory || []).filter(p => inRange(p.t)), [metricsHistory, inRange])
  const filteredChat = useMemo(() => (chat || []).filter(m => inRange(new Date(m.createdAt).getTime() )), [chat, inRange])

  const buildZip = async () => {
    try {
      if (!filteredAudit.length) {
        toast.warning('No audit events in selected window; bundling with available AI evidence')
      }
      const zip = new JSZip()
      // Root manifest
      const createdAt = new Date().toISOString()
      const manifest = {
        createdAt,
        window: { from: fromTs ? new Date(fromTs).toISOString() : null, to: toTs ? new Date(toTs).toISOString() : null },
        files: [
          'evidence/README.md',
          'evidence/MANIFEST.json',
          'evidence/ai/ai-audit.json',
          'evidence/ai/ai-audit.csv',
          'evidence/audit/audit-trail.json',
          'evidence/audit/audit-trail.csv',
          'evidence/metrics/model-metrics-history.json',
          'evidence/metrics/current-metrics-summary.json',
        ],
        deepLink: '#audit/evidence',
      }
      zip.file('evidence/MANIFEST.json', JSON.stringify(manifest, null, 2))
      const readme = `# Evidence Bundle\n\nGenerated at: ${createdAt}\n\nScope: ${fromTs ? new Date(fromTs).toISOString() : 'beginning'} to ${toTs ? new Date(toTs).toISOString() : 'now'}\n\nIncludes:\n- AI audit (JSON/CSV)\n- Full audit trail (JSON/CSV)\n- Model metrics history (JSON) and current summary\n\nDeep link back to helper: ${manifest.deepLink}\n\nNote: Add sign-offs and additional artifacts using the templates in docs/evidence/ within the repo.`
      zip.file('evidence/README.md', readme)

      // AI audit: JSON and CSV based on AIAuditTrail structure
      const aiJson = {
        exportedAt: createdAt,
        aiEvents,
        chat: filteredChat,
        modelMetrics: modelMetrics.map(m => ({ id: m.id, metrics: m.metrics, trainedAt: m.lr?.trainedAt ?? null, n: m.lr?.n ?? 0, featureKeys: m.lr?.featureKeys ?? [] }))
      }
      zip.file('evidence/ai/ai-audit.json', JSON.stringify(aiJson, null, 2))
      // Build a simple CSV combining AI audit events and chat summary and metrics summary
      const lines: string[] = []
      lines.push('type,timestamp,user,role,action,details,recordId,outcome')
      aiEvents.forEach(ev => {
        const action = (ev.action || '').replace(/,/g, ' ')
        const details = (ev.details || '').replace(/\n/g, ' ').replace(/,/g, ' ')
        const ts = ev.timestamp instanceof Date ? ev.timestamp.toISOString() : new Date(ev.timestamp as unknown as string).toISOString()
        lines.push(`audit,${ts},${ev.userId},${ev.userRole},${action},${details},${ev.recordId ?? ''},${ev.outcome}`)
      })
      lines.push('')
      lines.push('model,id,samples,auroc,brier,ece,threshold,trainedAt,features,n')
      modelMetrics.forEach(m => {
        lines.push(`metrics,${m.id},${m.metrics.n},${m.metrics.auroc.toFixed(4)},${m.metrics.brier.toFixed(4)},${m.metrics.ece.toFixed(4)},${m.metrics.threshold},${m.lr?.trainedAt ? new Date(m.lr.trainedAt).toISOString() : ''},${m.lr?.featureKeys.length ?? 0},${m.lr?.n ?? 0}`)
      })
      lines.push('type,createdAt,role,content')
      filteredChat.forEach(m => {
        const content = (m.content || '').replace(/\n/g, ' ').replace(/,/g, ' ')
        lines.push(`chat,${m.createdAt},${m.role},${content}`)
      })
      zip.file('evidence/ai/ai-audit.csv', lines.join('\n'))

      // Full audit trail
      const auditCsv = filteredAudit.length ? buildAuditEventsCSVString(filteredAudit) : 'No audit events in selected window'
      const auditJson = filteredAudit.length ? buildAuditEventsJSONString(filteredAudit) : JSON.stringify([], null, 2)
      zip.file('evidence/audit/audit-trail.csv', auditCsv)
      zip.file('evidence/audit/audit-trail.json', auditJson)

      // Metrics history
      zip.file('evidence/metrics/model-metrics-history.json', JSON.stringify(filteredMetrics, null, 2))
      const currentSummary = {
        exportedAt: createdAt,
        models: modelMetrics.map(m => ({ id: m.id, n: m.metrics.n, auroc: m.metrics.auroc, brier: m.metrics.brier, ece: m.metrics.ece, threshold: m.metrics.threshold }))
      }
      zip.file('evidence/metrics/current-metrics-summary.json', JSON.stringify(currentSummary, null, 2))

      const blob = await zip.generateAsync({ type: 'blob' })
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      const tsSlug = createdAt.replace(/[:.]/g, '-')
      a.download = `biopharm-gmp-evidence-${tsSlug}.zip`
      document.body.appendChild(a)
      a.click()
      document.body.removeChild(a)
      URL.revokeObjectURL(url)
      toast.success('Evidence bundle generated')
      // Noises: optionally log an audit event
      try {
        const ev: AuditEvent = {
          id: `AUD-${Date.now()}-EVIDENCE`,
          timestamp: new Date(),
          userId: 'system@local',
          userRole: 'System',
          action: 'Evidence Bundle Export',
          module: 'ai',
          details: `Evidence bundle exported for window from=${from || 'beginning'} to=${to || 'now'}`,
          ipAddress: '127.0.0.1',
          sessionId: 'sess-local',
          outcome: 'success',
        }
        setEvents((curr = []) => [ev, ...curr])
      } catch {}
    } catch (err) {
      console.error(err)
      toast.error('Failed to generate evidence bundle')
    }
  }

  return (
    <div className="p-6 space-y-6 overflow-auto h-full">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold flex items-center gap-3"><Package className="h-7 w-7 text-primary" /> Evidence Export Helper</h1>
          <p className="text-muted-foreground">Bundle AI audit, full audit trail, and metrics history into a single zip for auditors.</p>
          <div className="text-xs text-muted-foreground mt-1 flex items-center gap-2"><LinkSimpleHorizontal className="h-3.5 w-3.5" /> Deep link: <code>#audit/evidence</code></div>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="ghost" onClick={onBack}><ArrowLeft className="h-4 w-4 mr-2" /> Back</Button>
        </div>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Scope and Time Window</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 items-end">
            <div>
              <div className="text-xs text-muted-foreground mb-1">From (ISO datetime)</div>
              <input className="w-full rounded-md border px-3 py-2 text-sm bg-background" placeholder="2025-10-01T00:00:00Z" value={from} onChange={e => setFrom(e.target.value)} />
            </div>
            <div>
              <div className="text-xs text-muted-foreground mb-1">To (ISO datetime)</div>
              <input className="w-full rounded-md border px-3 py-2 text-sm bg-background" placeholder="2025-10-31T23:59:59Z" value={to} onChange={e => setTo(e.target.value)} />
            </div>
            <div>
              <Button onClick={buildZip} className="w-full">Generate Evidence Bundle</Button>
            </div>
          </div>
          <div className="text-xs text-muted-foreground mt-3">Leave times empty to include all available data.</div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Included Now (preview)</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm">
            <div>
              <div className="font-medium">AI Audit</div>
              <div className="text-muted-foreground text-xs">Events: {aiEvents.length}</div>
              <div className="text-muted-foreground text-xs">Chat messages: {filteredChat.length}</div>
              <div className="text-muted-foreground text-xs">Models: {modelIds.length}</div>
            </div>
            <div>
              <div className="font-medium">Audit Trail</div>
              <div className="text-muted-foreground text-xs">Events: {filteredAudit.length}</div>
            </div>
            <div>
              <div className="font-medium">Metrics</div>
              <div className="text-muted-foreground text-xs">History points: {filteredMetrics.length}</div>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}

export default EvidenceExportHelper
