import React, { useEffect } from 'react'
import { useKV } from '@github/spark/hooks'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { ArrowLeft } from '@phosphor-icons/react'
import { useAuditLogger } from '@/hooks/use-audit'
import type { ChangeControl } from '@/types/quality'

export function ChangeControlDetails({ id, onBack }: { id: string; onBack: () => void }) {
  const [ccs] = useKV<ChangeControl[]>('change-controls', [])
  const cc = (ccs || []).find(c => c.id === id)
  const { log } = useAuditLogger()

  useEffect(() => {
    if (cc) log('View Change Control', 'change-control', `Viewed ${cc.id}`, { recordId: cc.id })
  }, [cc, log])

  if (!cc) {
    return (
      <div className="p-6 space-y-4">
        <Button variant="ghost" size="sm" onClick={onBack}><ArrowLeft className="h-4 w-4 mr-1"/>Back</Button>
        <Card><CardHeader><CardTitle>Change Control not found</CardTitle></CardHeader><CardContent>No change control with id {id}</CardContent></Card>
      </div>
    )
  }

  return (
    <div className="p-6 space-y-6 overflow-auto h-full">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold"><span className="font-mono">{cc.id}</span> Change Control</h1>
          <p className="text-muted-foreground">{cc.title}</p>
        </div>
        <Button variant="ghost" onClick={onBack}><ArrowLeft className="h-4 w-4 mr-2"/>Back</Button>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Overview</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex flex-wrap gap-2 mb-2">
            <Badge variant="outline">{cc.status}</Badge>
            <Badge variant="outline">Risk: {cc.riskLevel}</Badge>
          </div>
          <div className="text-sm text-muted-foreground">Requested by {cc.requestedBy} on {new Date(cc.requestedDate).toLocaleDateString()}</div>
          <p className="mt-3">{cc.description}</p>
          <div className="mt-3 text-sm">
            Impacted batches: {cc.impactedBatches.length ? cc.impactedBatches.join(', ') : 'None'}
          </div>
          <div className="text-sm">
            Impacted equipment: {cc.impactedEquipment.length ? cc.impactedEquipment.join(', ') : 'None'}
          </div>
        </CardContent>
      </Card>
    </div>
  )
}

export default ChangeControlDetails
