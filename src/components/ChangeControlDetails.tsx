import React, { useEffect } from 'react'
import { useKV } from '@github/spark/hooks'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { ArrowLeft } from '@phosphor-icons/react'
import { useAuditLogger } from '@/hooks/use-audit'
import { ESignaturePrompt, type SignatureResult } from '@/components/ESignaturePrompt'
import type { ChangeControl, ESignatureRecord } from '@/types/quality'
import { Separator } from '@/components/ui/separator'

const formatDate = (value?: Date | string) => {
  if (!value) return '—'
  const date = value instanceof Date ? value : new Date(value)
  if (Number.isNaN(date.getTime())) return '—'
  return date.toLocaleDateString()
}

const demoCredentials = {
  username: 'cc.approver@biopharm.com',
  password: 'DemoPass123!'
}

const statusOrder: ChangeControl['status'][] = ['draft', 'in-review', 'approved', 'implemented', 'closed']

export function ChangeControlDetails({ id, onBack }: { id: string; onBack: () => void }) {
  const [ccs, setChangeControls] = useKV<ChangeControl[]>('change-controls', [])
  const cc = (ccs || []).find(c => c.id === id)
  const { log } = useAuditLogger()

  useEffect(() => {
    if (cc) log('View Change Control', 'change-control', `Viewed ${cc.id}`, { recordId: cc.id })
  }, [cc, log])

  const appendSignature = (action: string, signature: SignatureResult): ESignatureRecord => ({
    id: `${cc?.id ?? 'CC'}-${Date.now()}`,
    action,
    signedBy: signature.userId,
    signedAt: signature.timestamp,
    reason: signature.reason,
    digitalSignature: signature.digitalSignature
  })

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
          <div className="mt-4 grid gap-3 md:grid-cols-2">
            <div className="text-sm">
              <div className="text-xs uppercase text-muted-foreground/70">Planned Window</div>
              <div>{formatDate(cc.plannedStartDate)} → {formatDate(cc.plannedEndDate)}</div>
            </div>
            <div className="text-sm">
              <div className="text-xs uppercase text-muted-foreground/70">Related Deviations</div>
              <div>{(cc.relatedDeviations || []).join(', ') || 'None'}</div>
            </div>
          </div>
          <div className="mt-3 text-sm">
            Impacted batches: {cc.impactedBatches.length ? cc.impactedBatches.join(', ') : 'None'}
          </div>
          <div className="text-sm">
            Impacted equipment: {cc.impactedEquipment.length ? cc.impactedEquipment.join(', ') : 'None'}
          </div>
          {(cc.impactAssessment || cc.implementationPlan || cc.validationPlan) && (
            <div className="mt-4 space-y-4">
              {cc.impactAssessment && (
                <section className="space-y-2">
                  <Separator />
                  <div className="text-xs uppercase text-muted-foreground/70">Impact Assessment</div>
                  <p className="text-sm leading-relaxed whitespace-pre-wrap">{cc.impactAssessment}</p>
                </section>
              )}
              {cc.implementationPlan && (
                <section className="space-y-2">
                  <Separator />
                  <div className="text-xs uppercase text-muted-foreground/70">Implementation Plan</div>
                  <p className="text-sm leading-relaxed whitespace-pre-wrap">{cc.implementationPlan}</p>
                </section>
              )}
              {cc.validationPlan && (
                <section className="space-y-2">
                  <Separator />
                  <div className="text-xs uppercase text-muted-foreground/70">Validation / Verification</div>
                  <p className="text-sm leading-relaxed whitespace-pre-wrap">{cc.validationPlan}</p>
                </section>
              )}
            </div>
          )}
          <div className="flex flex-wrap gap-2 mt-4">
            {(() => {
              const currentIndex = statusOrder.indexOf(cc.status)
              const nextStatus = statusOrder[currentIndex + 1]
              if (!nextStatus) return null
              const label = `Advance to ${nextStatus.replace('-', ' ')}`
              return (
                <ESignaturePrompt
                  key={nextStatus}
                  trigger={<Button size="sm">{label}</Button>}
                  title="Change Control Approval"
                  statement={`${label} for ${cc.id}`}
                  demoCredentials={demoCredentials}
                  onConfirm={async (result: SignatureResult) => {
                    const record = appendSignature(label, result)
                    setChangeControls(current => (current || []).map(item => item.id === cc.id ? {
                      ...item,
                      status: nextStatus,
                      signatures: [...(item.signatures || []), record]
                    } : item))
                    log('Change Control Status Update', 'change-control', `${cc.id} advanced to ${nextStatus} by ${result.userId}`, {
                      recordId: cc.id,
                      digitalSignature: result.digitalSignature
                    })
                  }}
                />
              )
            })()}
          </div>
        </CardContent>
      </Card>

      {cc.signatures && cc.signatures.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Electronic Signature History</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3 text-sm">
            {cc.signatures
              .slice()
              .sort((a, b) => new Date(b.signedAt).getTime() - new Date(a.signedAt).getTime())
              .map(sig => (
                <div key={sig.id} className="border rounded-md p-3">
                  <div className="flex flex-wrap items-center gap-2 text-xs text-muted-foreground mb-1">
                    <span>{new Date(sig.signedAt).toLocaleString()}</span>
                    <span>• {sig.action}</span>
                    <span>• {sig.signedBy}</span>
                  </div>
                  <div className="text-sm">Reason: {sig.reason}</div>
                  <div className="mt-1 font-mono text-xs text-muted-foreground">{sig.digitalSignature}</div>
                </div>
              ))}
          </CardContent>
        </Card>
      )}
    </div>
  )
}

export default ChangeControlDetails
