import React, { useEffect } from 'react'
import { useKV } from '@github/spark/hooks'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { CheckCircle, ArrowLeft } from '@phosphor-icons/react'
import { useAuditLogger } from '@/hooks/use-audit'
import { ESignaturePrompt, type SignatureResult } from '@/components/ESignaturePrompt'
import type { CAPA, ESignatureRecord } from '@/types/quality'

const demoCredentials = {
  username: 'approver.demo@biopharm.com',
  password: 'DemoPass123!'
}

export function CapaReview({ id, onBack }: { id: string, onBack: () => void }) {
  const [capas, setCAPAs] = useKV<CAPA[]>('capas')
  const [, setRoute] = useKV<string>('route', '')
  const capa = (capas || []).find(c => c.id === id)
  const { log } = useAuditLogger()

  useEffect(() => {
    if (capa) {
      log('View CAPA', 'capa', `Viewed ${capa.id}`, { recordId: capa.id })
    }
  }, [capa, log])

  const appendSignature = (action: string, signature: SignatureResult): ESignatureRecord => ({
    id: `${capa?.id ?? 'CAPA'}-${Date.now()}`,
    action,
    signedBy: signature.userId,
    signedAt: signature.timestamp,
    reason: signature.reason,
    digitalSignature: signature.digitalSignature
  })

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
          <div className="pt-4 flex flex-wrap gap-2">
            {capa.status !== 'approved' && (
              <ESignaturePrompt
                trigger={<Button size="sm">Approve CAPA</Button>}
                title="Approve CAPA"
                statement={`Approval for ${capa.id}`}
                demoCredentials={demoCredentials}
                onConfirm={async (result: SignatureResult) => {
                  const record = appendSignature('Approval', result)
                  setCAPAs(current => (current || []).map(item => item.id === capa.id ? {
                    ...item,
                    status: 'approved',
                    signatures: [...(item.signatures || []), record]
                  } : item))
                  log('CAPA Approved', 'capa', `CAPA ${capa.id} approved by ${result.userId}`, {
                    recordId: capa.id,
                    digitalSignature: result.digitalSignature
                  })
                }}
              />
            )}
            {capa.status !== 'complete' && (
              <ESignaturePrompt
                trigger={<Button size="sm" variant="outline">Mark Complete</Button>}
                title="Complete CAPA"
                statement={`Completion confirmation for ${capa.id}`}
                demoCredentials={demoCredentials}
                onConfirm={async (result: SignatureResult) => {
                  const record = appendSignature('Completion', result)
                  setCAPAs(current => (current || []).map(item => item.id === capa.id ? {
                    ...item,
                    status: 'complete',
                    signatures: [...(item.signatures || []), record]
                  } : item))
                  log('CAPA Completed', 'capa', `CAPA ${capa.id} marked complete by ${result.userId}`, {
                    recordId: capa.id,
                    digitalSignature: result.digitalSignature
                  })
                }}
              />
            )}
          </div>
        </CardContent>
      </Card>

      {capa.signatures && capa.signatures.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Electronic Signature History</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3 text-sm">
            {capa.signatures
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

export default CapaReview
