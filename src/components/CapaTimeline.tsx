import React, { useEffect } from 'react'
import { useKV } from '@github/spark/hooks'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Clock, ArrowLeft } from '@phosphor-icons/react'
import { useAuditLogger } from '@/hooks/use-audit'

type CAPA = {
  id: string
  title: string
  description: string
  type: 'corrective' | 'preventive'
  priority: 'low' | 'medium' | 'high'
  status: 'draft' | 'approved' | 'implementing' | 'complete'
  dueDate: Date
  assignedTo: string
  relatedDeviations: string[]
  actions: {
    id: string
    description: string
    responsible: string
    dueDate: Date
    status: 'pending' | 'complete'
  }[]
  effectivenessCheck?: { dueDate: Date; status: 'pending' | 'complete'; result?: string }
}

export function CapaTimeline({ id, onBack }: { id: string, onBack: () => void }) {
  const [capas] = useKV<CAPA[]>('capas')
  const [, setRoute] = useKV<string>('route', '')
  const capa = (capas || []).find(c => c.id === id)
  const { log } = useAuditLogger()

  useEffect(() => {
    if (capa) log('View CAPA Timeline', 'capa', `Viewed timeline for ${capa.id}`, { recordId: capa.id })
  }, [capa, log])

  if (!capa) {
    return (
      <div className="p-6 space-y-4">
        <Button variant="ghost" size="sm" onClick={onBack}><ArrowLeft className="h-4 w-4 mr-1"/>Back</Button>
        <Card><CardHeader><CardTitle>CAPA not found</CardTitle></CardHeader><CardContent>No CAPA with id {id}</CardContent></Card>
      </div>
    )
  }

  const actionsSorted = [...capa.actions].sort((a, b) => new Date(a.dueDate).getTime() - new Date(b.dueDate).getTime())

  return (
    <div className="p-6 space-y-6 overflow-auto h-full">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold"><span className="font-mono">{capa.id}</span> Timeline</h1>
          <p className="text-muted-foreground">{capa.title}</p>
        </div>
        <Button variant="ghost" onClick={onBack}><ArrowLeft className="h-4 w-4 mr-2"/>Back</Button>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2"><Clock className="h-4 w-4"/>Action Schedule</CardTitle>
        </CardHeader>
        <CardContent>
          {capa.effectivenessCheck && (
            <div className="mb-4 text-sm text-muted-foreground">
              Effectiveness check due {new Date(capa.effectivenessCheck.dueDate).toLocaleDateString()} — {capa.effectivenessCheck.status}
            </div>
          )}
          <div className="space-y-4">
            {actionsSorted.map((a, idx) => (
              <div key={a.id} className="flex items-center gap-4">
                <div className="flex flex-col items-center">
                  <div className={`w-3 h-3 rounded-full ${a.status === 'complete' ? 'bg-success' : 'bg-primary'}`} />
                  {idx < actionsSorted.length - 1 && <div className="w-px h-8 bg-border mt-2" />}
                </div>
                <div className="flex-1">
                  <div className="font-medium">{a.description}</div>
                  <div className="text-sm text-muted-foreground">Responsible: {a.responsible} • Due: {new Date(a.dueDate).toLocaleDateString()}</div>
                </div>
                <Badge className={a.status === 'complete' ? 'bg-success text-success-foreground' : 'bg-warning text-warning-foreground'}>{a.status}</Badge>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
      {capa.relatedDeviations.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Related Deviations</CardTitle>
          </CardHeader>
          <CardContent>
            {capa.relatedDeviations.map((devId, idx) => (
              <Button key={devId} variant="link" className="px-1" onClick={() => setRoute(`deviation/${devId}`)}>
                {devId}{idx < capa.relatedDeviations.length - 1 ? ',' : ''}
              </Button>
            ))}
          </CardContent>
        </Card>
      )}
    </div>
  )
}

export default CapaTimeline
