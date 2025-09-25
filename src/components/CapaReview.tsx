import React, { useEffect } from 'react'
import { useKV } from '@github/spark/hooks'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { CheckCircle, ArrowLeft } from '@phosphor-icons/react'
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

export function CapaReview({ id, onBack }: { id: string, onBack: () => void }) {
  const [capas] = useKV<CAPA[]>('capas')
  const [, setRoute] = useKV<string>('route', '')
  const capa = (capas || []).find(c => c.id === id)
  const { log } = useAuditLogger()

  useEffect(() => {
    if (capa) {
      log('View CAPA', 'capa', `Viewed ${capa.id}`, { recordId: capa.id })
    }
  }, [capa, log])

  if (!capa) {
    return (
      <div className="p-6 space-y-4">
        <Button variant="ghost" size="sm" onClick={onBack}><ArrowLeft className="h-4 w-4 mr-1"/>Back</Button>
        <Card><CardHeader><CardTitle>CAPA not found</CardTitle></CardHeader><CardContent>No CAPA with id {id}</CardContent></Card>
      </div>
    )
  }

  return (
    <div className="p-6 space-y-6 overflow-auto h-full">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold"><span className="font-mono">{capa.id}</span> Review</h1>
          <p className="text-muted-foreground">{capa.title}</p>
        </div>
        <Button variant="ghost" onClick={onBack}><ArrowLeft className="h-4 w-4 mr-2"/>Back</Button>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Overview</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex flex-wrap gap-2 mb-2">
            <Badge variant={capa.type === 'corrective' ? 'default' : 'secondary'}>{capa.type}</Badge>
            <Badge variant="outline">{capa.priority} priority</Badge>
            <Badge>{capa.status}</Badge>
          </div>
          <div className="text-sm text-muted-foreground">Due: {new Date(capa.dueDate).toLocaleDateString()} • Assigned: {capa.assignedTo}</div>
          <p className="mt-3">{capa.description}</p>
          {capa.effectivenessCheck && (
            <div className="mt-3 text-sm">
              Effectiveness check due {new Date(capa.effectivenessCheck.dueDate).toLocaleDateString()} — {capa.effectivenessCheck.status}
            </div>
          )}
          {capa.relatedDeviations.length > 0 && (
            <div className="mt-3 text-sm">
              Related deviations: {capa.relatedDeviations.map((devId, idx) => (
                <Button key={devId} variant="link" className="px-1" onClick={() => setRoute(`deviation/${devId}`)}>
                  {devId}{idx < capa.relatedDeviations.length - 1 ? ',' : ''}
                </Button>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2"><CheckCircle className="h-4 w-4"/>Actions</CardTitle>
        </CardHeader>
        <CardContent className="space-y-2">
          {capa.actions.map(a => (
            <div key={a.id} className="p-3 border rounded-md flex items-center justify-between">
              <div>
                <div className="font-medium">{a.description}</div>
                <div className="text-sm text-muted-foreground">Responsible: {a.responsible} • Due: {new Date(a.dueDate).toLocaleDateString()}</div>
              </div>
              <Badge className={a.status === 'complete' ? 'bg-success text-success-foreground' : 'bg-warning text-warning-foreground'}>
                {a.status}
              </Badge>
            </div>
          ))}
        </CardContent>
      </Card>
    </div>
  )
}

export default CapaReview
