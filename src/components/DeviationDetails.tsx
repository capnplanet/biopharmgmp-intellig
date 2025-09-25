import React from 'react'
import { useKV } from '@github/spark/hooks'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { MagnifyingGlass, Robot, ArrowLeft } from '@phosphor-icons/react'

type Deviation = {
  id: string
  title: string
  description: string
  severity: 'low' | 'medium' | 'high' | 'critical'
  status: 'open' | 'investigating' | 'resolved' | 'closed'
  batchId: string
  reportedBy: string
  reportedDate: Date
  assignedTo?: string
  rootCause?: string
  correctiveActions?: string[]
  effectivenessCheck?: { dueDate: Date; status: 'pending' | 'complete'; result?: string }
}

export function DeviationDetails({ id, onBack, onInvestigate }: { id: string; onBack: () => void; onInvestigate?: (d: Deviation) => void }) {
  const [deviations] = useKV<Deviation[]>('deviations')
  const deviation = (deviations || []).find(d => d.id === id)
  
  const getSeverityColor = (severity: string) => {
    const colors = { low: 'bg-blue-100 text-blue-800', medium: 'bg-yellow-100 text-yellow-800', high: 'bg-orange-100 text-orange-800', critical: 'bg-red-100 text-red-800' }
    return colors[severity as keyof typeof colors] || colors.low
  }

  if (!deviation) {
    return (
      <div className="p-6 space-y-4">
        <Button variant="ghost" size="sm" onClick={onBack}><ArrowLeft className="h-4 w-4 mr-1"/>Back</Button>
        <Card><CardHeader><CardTitle>Deviation not found</CardTitle></CardHeader><CardContent>No deviation with id {id}</CardContent></Card>
      </div>
    )
  }

  return (
    <div className="p-6 space-y-6 overflow-auto h-full">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold"><span className="font-mono">{deviation.id}</span> Details</h1>
          <p className="text-muted-foreground">{deviation.title}</p>
        </div>
        <Button variant="ghost" onClick={onBack}><ArrowLeft className="h-4 w-4 mr-2"/>Back</Button>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Overview</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex flex-wrap items-center gap-2 mb-2">
            <Badge className={getSeverityColor(deviation.severity)}>{deviation.severity}</Badge>
            <Badge variant="outline">{deviation.status}</Badge>
            <span className="text-sm text-muted-foreground">Batch: <span className="font-mono">{deviation.batchId}</span></span>
          </div>
          <div className="text-sm text-muted-foreground">Reported by {deviation.reportedBy} on {new Date(deviation.reportedDate).toLocaleDateString()}</div>
          <p className="mt-3">{deviation.description}</p>
        </CardContent>
      </Card>

      <div className="flex gap-2">
        <Button onClick={() => onInvestigate?.(deviation)} className="flex items-center gap-2"><MagnifyingGlass className="h-4 w-4"/>Investigate</Button>
        <Button variant="outline" onClick={() => onInvestigate?.(deviation)} className="flex items-center gap-2"><Robot className="h-4 w-4"/>AI Assist</Button>
      </div>
    </div>
  )
}

export default DeviationDetails
