import { useMemo, useState } from 'react'
import { useKV } from '@github/spark/hooks'
import { useCurrentUser } from '@/hooks/use-current-user'
import { useAuditLogger } from '@/hooks/use-audit'
import { batches } from '@/data/seed'
import { buildInvestigationSources, sourcesToString } from '@/data/archive'
import { v4 as uuidv4 } from 'uuid'
import type { Deviation, Investigation } from '@/types/quality'
import type { DeviationDraftData, DeviationDraftMetadata, WorkflowStepState } from '@/types/workflows'
import { getSpark } from '@/lib/spark'
import {
  Card,
  CardContent,
  CardFooter,
  CardHeader,
  CardTitle
} from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Label } from '@/components/ui/label'
import { Badge } from '@/components/ui/badge'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue
} from '@/components/ui/select'
import { ESignaturePrompt, type SignatureResult } from '@/components/ESignaturePrompt'
import { toast } from 'sonner'
import {
  ArrowLeft,
  ArrowRight,
  CheckCircle,
  Lightning,
  Robot,
  Sparkle
} from '@phosphor-icons/react'
import { format } from 'date-fns'
import { Progress } from '@/components/ui/progress'
import { cn } from '@/lib/utils'
import type { DeviationSeverity } from '@/types/quality'
import { createInvestigationFromDeviation } from '@/utils/investigation'

const demoCredentials = {
  username: 'qa.signer@biopharm.com',
  password: 'DemoPass123!'
}

type WizardStep = 'details' | 'metadata' | 'approval'

interface DeviationCreationWizardProps {
  onCancel: () => void
  onCreated?: (deviationId: string) => void
}

type StepConfig = {
  id: WizardStep
  title: string
  description: string
  requiresSignature?: boolean
}

const stepsConfig: StepConfig[] = [
  {
    id: 'details',
    title: 'Deviation Details',
    description: 'Capture the triggering event, severity, and context.'
  },
  {
    id: 'metadata',
    title: 'Context & Metadata',
    description: 'Document data integrity, containment, and ownership.'
  },
  {
    id: 'approval',
    title: 'QA Approval',
    description: 'Review record, apply e-signature, and launch workflow.',
    requiresSignature: true
  }
]

const initialDraft = (reportedBy?: string): DeviationDraftData => ({
  details: {
    batchId: batches[0]?.id ?? '',
    title: '',
    severity: 'medium',
    detectionSource: 'manual',
    occurredAt: new Date()
  },
  metadata: {
    description: '',
    reportedBy: reportedBy || 'Manufacturing Operator',
    assignedTo: 'Quality Assurance',
    impactedMaterials: '',
    containmentActions: '',
    notes: ''
  },
  approvals: {}
})

const detectionSources: Array<{ value: DeviationDraftData['details']['detectionSource']; label: string }> = [
  { value: 'manual', label: 'Manual Observation' },
  { value: 'digital-twin', label: 'Digital Twin Alert' },
  { value: 'lab', label: 'Laboratory Result' },
  { value: 'ai', label: 'AI Agent Recommendation' }
]

const severityOptions: Array<{ value: DeviationSeverity; label: string }> = [
  { value: 'low', label: 'Low' },
  { value: 'medium', label: 'Medium' },
  { value: 'high', label: 'High' },
  { value: 'critical', label: 'Critical' }
]

export function DeviationCreationWizard({ onCancel, onCreated }: DeviationCreationWizardProps) {
  const { user } = useCurrentUser()
  const { log } = useAuditLogger()
  const [, setDeviations] = useKV<Deviation[]>('deviations')
  const [, setInvestigations] = useKV<Investigation[]>('investigations')
  const [, setRoute] = useKV<string>('route', '')
  const [draft, setDraft] = useState<DeviationDraftData>(() => initialDraft(user?.id))
  const [activeStep, setActiveStep] = useState<WizardStep>('details')
  const [aiBusy, setAiBusy] = useState(false)

  const computedSteps: WorkflowStepState[] = useMemo(() => {
    return stepsConfig.map((step) => {
      const order = stepsConfig.findIndex((s) => s.id === step.id)
      const activeOrder = stepsConfig.findIndex((s) => s.id === activeStep)
      const status = order < activeOrder ? 'complete' : order === activeOrder ? 'active' : 'pending'
      return {
        id: step.id,
        title: step.title,
        description: step.description,
        status,
        requiresSignature: step.requiresSignature
      }
    })
  }, [activeStep])

  const goToStep = (direction: 'forward' | 'back') => {
    const order = stepsConfig.findIndex((step) => step.id === activeStep)
    const nextIndex = direction === 'forward' ? order + 1 : order - 1
    const next = stepsConfig[nextIndex]
    if (!next) return
    setActiveStep(next.id)
  }

  const updateDraft = <K extends keyof DeviationDraftData>(section: K, value: DeviationDraftData[K]) => {
    setDraft((current) => ({ ...current, [section]: value }))
  }

  const handleGenerate = async () => {
    if (!draft.details.batchId) {
      toast.error('Select a batch before requesting AI assistance')
      return
    }

    try {
      setAiBusy(true)
      const spark = getSpark()
      if (!spark?.llm || !spark.llmPrompt) throw new Error('AI assistant unavailable')
      const sources = buildInvestigationSources(draft.details.batchId)
      const prompt = spark.llmPrompt`
        You are a GMP deviation drafting assistant. Create a JSON payload with keys:
        {
          "title": string,
          "description": string,
          "assignedTo": string,
          "containmentActions": string,
          "impactedMaterials": string,
          "notes": string
        }
        The response must be valid JSON only without additional commentary.

        CONTEXT:
        Batch ID: ${draft.details.batchId}
        Detection Source: ${draft.details.detectionSource}
        Severity: ${draft.details.severity}
        Event Timestamp: ${draft.details.occurredAt?.toISOString() ?? 'unknown'}

        BATCH & ARCHIVE DATA:
        ${sourcesToString(sources)}
      `
      const raw = await spark.llm(prompt, 'gpt-4o-mini')
      const json = extractJson(raw)
  type DeviationDraftAiResult = Partial<DeviationDraftMetadata> & { assignedTo?: string; title?: string }
  const result = JSON.parse(json) as DeviationDraftAiResult
      const nextMetadata: DeviationDraftMetadata = {
        ...draft.metadata,
        description: result.description || draft.metadata.description,
        containmentActions: result.containmentActions || draft.metadata.containmentActions,
        impactedMaterials: result.impactedMaterials || draft.metadata.impactedMaterials,
        notes: result.notes || draft.metadata.notes,
        aiSummary: `Generated ${new Date().toLocaleString()}`
      }
      if (result.assignedTo) {
        nextMetadata.assignedTo = result.assignedTo
      }
      updateDraft('metadata', nextMetadata)
      if (result.title) {
        updateDraft('details', {
          ...draft.details,
          title: result.title
        })
      }
      toast.success('Draft details generated')
      log('AI Draft Generated', 'ai', `Deviation draft generated for ${draft.details.batchId}`, { recordId: draft.details.batchId })
    } catch (error) {
      console.error(error)
      toast.error('Unable to generate deviation draft')
      log('AI Draft Failed', 'ai', 'Deviation draft generation failed', { outcome: 'failure' })
    } finally {
      setAiBusy(false)
    }
  }

  const canProceedFromDetails = draft.details.batchId && draft.details.title && draft.metadata.description
  const canProceedFromMetadata = draft.metadata.reportedBy && draft.metadata.assignedTo

  const handleCreate = async (signature: SignatureResult) => {
    try {
      const deviationId = buildDeviationId()
      const reportedDate = draft.details.occurredAt ? new Date(draft.details.occurredAt) : new Date()
      const signatureRecord = {
        id: `${deviationId}-sign-${Date.now()}`,
        action: 'Deviation Creation Approval',
        signedBy: signature.userId,
        signedAt: signature.timestamp,
        reason: signature.reason,
        digitalSignature: signature.digitalSignature
      }

      const deviation: Deviation = {
        id: deviationId,
        title: draft.details.title,
        description: draft.metadata.description,
        severity: draft.details.severity,
        status: 'open',
        batchId: draft.details.batchId,
        reportedBy: draft.metadata.reportedBy,
        reportedDate,
        assignedTo: draft.metadata.assignedTo,
        origin: draft.details.detectionSource === 'manual' ? 'manual' : draft.details.detectionSource === 'ai' ? 'ai' : 'digital-twin',
        metadata: {
          detectionSource: draft.details.detectionSource,
          occurredAt: reportedDate.toISOString(),
          containmentActions: draft.metadata.containmentActions,
          impactedMaterials: draft.metadata.impactedMaterials,
          notes: draft.metadata.notes,
          aiSummary: draft.metadata.aiSummary
        },
        signatures: [signatureRecord]
      }

  setDeviations((current) => [deviation, ...(current || [])])
      const autoInvestigation = createInvestigationFromDeviation(deviation)
      setInvestigations((current) => [autoInvestigation, ...(current || [])])
      log('Deviation Created', 'deviation', `Deviation ${deviationId} created`, {
        recordId: deviationId,
        digitalSignature: signature.digitalSignature
      })
      toast.success(`Deviation ${deviationId} created and investigation launched`)
      onCreated?.(deviationId)
      setRoute(`deviation/${deviationId}`)
    } catch (error) {
      console.error(error)
      toast.error('Unable to create deviation record')
    }
  }

  const activeIndex = stepsConfig.findIndex((step) => step.id === activeStep)
  const progressValue = Math.round(((activeIndex + 1) / stepsConfig.length) * 100)

  return (
    <div className="p-6 space-y-6 overflow-auto h-full">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Log New Deviation</h1>
          <p className="text-muted-foreground">Guided workflow to capture deviation details, metadata, and approval.</p>
        </div>
        <Button variant="ghost" onClick={onCancel}>
          <ArrowLeft className="h-4 w-4 mr-2" />
          Back to Quality
        </Button>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center justify-between">
            <span>Workflow Progress</span>
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <Progress value={progressValue} className="w-40" />
              <span>{progressValue}%</span>
            </div>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid gap-4 md:grid-cols-3">
            {computedSteps.map((step, index) => (
              <div key={step.id} className={cn('rounded-lg border p-4 transition', step.status === 'active' ? 'border-primary shadow-sm' : step.status === 'complete' ? 'border-emerald-200 bg-emerald-50/40 dark:bg-emerald-950/20' : 'border-border')}>
                <div className="flex items-center gap-3">
                  <div className={cn('flex h-8 w-8 items-center justify-center rounded-full border text-sm font-medium', step.status === 'complete' ? 'bg-emerald-500 text-white border-emerald-500' : step.status === 'active' ? 'bg-primary text-primary-foreground border-primary' : 'text-muted-foreground')}>
                    {step.status === 'complete' ? <CheckCircle className="h-4 w-4" /> : index + 1}
                  </div>
                  <div>
                    <div className="font-medium leading-tight">{step.title}</div>
                    <div className="text-xs text-muted-foreground">{step.description}</div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {activeStep === 'details' && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Lightning className="h-5 w-5" />
              Deviation Details
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid gap-4 md:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="deviation-batch">Impacted Batch</Label>
                <Select value={draft.details.batchId} onValueChange={(value) => updateDraft('details', { ...draft.details, batchId: value })}>
                  <SelectTrigger className="w-full">
                    <SelectValue placeholder="Select batch" />
                  </SelectTrigger>
                  <SelectContent>
                    {batches.map((batch) => (
                      <SelectItem key={batch.id} value={batch.id}>{batch.id} — {batch.product}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label htmlFor="deviation-severity">Severity</Label>
                <Select value={draft.details.severity} onValueChange={(value: DeviationSeverity) => updateDraft('details', { ...draft.details, severity: value })}>
                  <SelectTrigger className="w-full">
                    <SelectValue placeholder="Select severity" />
                  </SelectTrigger>
                  <SelectContent>
                    {severityOptions.map((option) => (
                      <SelectItem key={option.value} value={option.value}>{option.label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="grid gap-4 md:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="deviation-detection">Detection Source</Label>
                <Select value={draft.details.detectionSource} onValueChange={(value) => updateDraft('details', { ...draft.details, detectionSource: value as DeviationDraftData['details']['detectionSource'] })}>
                  <SelectTrigger className="w-full">
                    <SelectValue placeholder="Select detection method" />
                  </SelectTrigger>
                  <SelectContent>
                    {detectionSources.map((source) => (
                      <SelectItem key={source.value} value={source.value}>{source.label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label htmlFor="deviation-occurred">Event Timestamp</Label>
                <Input
                  id="deviation-occurred"
                  type="datetime-local"
                  value={draft.details.occurredAt ? format(draft.details.occurredAt, "yyyy-MM-dd'T'HH:mm") : ''}
                  onChange={(event) => {
                    const value = event.target.value
                    updateDraft('details', {
                      ...draft.details,
                      occurredAt: value ? new Date(value) : null
                    })
                  }}
                />
              </div>
            </div>
            <div className="space-y-2">
              <Label htmlFor="deviation-title">Deviation Title</Label>
              <Input
                id="deviation-title"
                value={draft.details.title}
                onChange={(event) => updateDraft('details', { ...draft.details, title: event.target.value })}
                placeholder="Summarize the deviation in a short title"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="deviation-description">Initial Description</Label>
              <Textarea
                id="deviation-description"
                value={draft.metadata.description}
                onChange={(event) => updateDraft('metadata', { ...draft.metadata, description: event.target.value })}
                className="min-h-32"
                placeholder="Describe what occurred, how it was detected, and immediate impact"
              />
            </div>
          </CardContent>
          <CardFooter className="flex justify-between">
            <Button variant="secondary" onClick={handleGenerate} disabled={aiBusy}>
              <Robot className="h-4 w-4 mr-2" />
              {aiBusy ? 'Consulting AI…' : 'Generate draft with AI'}
            </Button>
            <Button onClick={() => goToStep('forward')} disabled={!canProceedFromDetails}>
              Next
              <ArrowRight className="h-4 w-4 ml-2" />
            </Button>
          </CardFooter>
        </Card>
      )}

      {activeStep === 'metadata' && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Sparkle className="h-5 w-5" />
              Metadata & Containment
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid gap-4 md:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="deviation-reported-by">Reported By</Label>
                <Input
                  id="deviation-reported-by"
                  value={draft.metadata.reportedBy}
                  onChange={(event) => updateDraft('metadata', { ...draft.metadata, reportedBy: event.target.value })}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="deviation-assigned">Assigned To</Label>
                <Input
                  id="deviation-assigned"
                  value={draft.metadata.assignedTo}
                  onChange={(event) => updateDraft('metadata', { ...draft.metadata, assignedTo: event.target.value })}
                />
              </div>
            </div>
            <div className="space-y-2">
              <Label htmlFor="deviation-impacted">Impacted Materials / Lots</Label>
              <Input
                id="deviation-impacted"
                value={draft.metadata.impactedMaterials ?? ''}
                onChange={(event) => updateDraft('metadata', { ...draft.metadata, impactedMaterials: event.target.value })}
                placeholder="List impacted batches, materials, or products"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="deviation-containment">Containment Actions</Label>
              <Textarea
                id="deviation-containment"
                value={draft.metadata.containmentActions ?? ''}
                onChange={(event) => updateDraft('metadata', { ...draft.metadata, containmentActions: event.target.value })}
                className="min-h-24"
                placeholder="Describe immediate containment or mitigation steps"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="deviation-notes">Additional Notes</Label>
              <Textarea
                id="deviation-notes"
                value={draft.metadata.notes ?? ''}
                onChange={(event) => updateDraft('metadata', { ...draft.metadata, notes: event.target.value })}
                className="min-h-20"
                placeholder="Relevant observations, attachments, or references"
              />
            </div>
            {draft.metadata.aiSummary && (
              <div className="rounded-md border border-dashed p-3 text-xs text-muted-foreground">
                <div className="font-medium text-sm mb-1">AI Assistance record</div>
                <div>{draft.metadata.aiSummary}</div>
              </div>
            )}
          </CardContent>
          <CardFooter className="flex justify-between">
            <Button variant="outline" onClick={() => goToStep('back')}>
              <ArrowLeft className="h-4 w-4 mr-2" />
              Back
            </Button>
            <Button onClick={() => goToStep('forward')} disabled={!canProceedFromMetadata}>
              Next
              <ArrowRight className="h-4 w-4 ml-2" />
            </Button>
          </CardFooter>
        </Card>
      )}

      {activeStep === 'approval' && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <CheckCircle className="h-5 w-5" />
              Approval & Launch
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-3">
              <div className="text-sm text-muted-foreground">Review the deviation summary before applying your electronic signature.</div>
              <div className="rounded-lg border p-4 space-y-2">
                <div className="flex flex-wrap items-center gap-2">
                  <Badge variant="outline">Batch {draft.details.batchId}</Badge>
                  <Badge variant="outline">Severity: {draft.details.severity}</Badge>
                  <Badge>{draft.details.detectionSource}</Badge>
                </div>
                <div>
                  <div className="text-xs uppercase tracking-wide text-muted-foreground">Title</div>
                  <div className="font-medium">{draft.details.title || '—'}</div>
                </div>
                <div>
                  <div className="text-xs uppercase tracking-wide text-muted-foreground">Description</div>
                  <p className="text-sm leading-relaxed whitespace-pre-wrap">{draft.metadata.description || '—'}</p>
                </div>
                {draft.metadata.containmentActions && (
                  <div>
                    <div className="text-xs uppercase tracking-wide text-muted-foreground">Containment</div>
                    <p className="text-sm leading-relaxed whitespace-pre-wrap">{draft.metadata.containmentActions}</p>
                  </div>
                )}
                {draft.metadata.notes && (
                  <div>
                    <div className="text-xs uppercase tracking-wide text-muted-foreground">Notes</div>
                    <p className="text-sm leading-relaxed whitespace-pre-wrap">{draft.metadata.notes}</p>
                  </div>
                )}
              </div>
            </div>
          </CardContent>
          <CardFooter className="flex justify-between">
            <Button variant="outline" onClick={() => goToStep('back')}>
              <ArrowLeft className="h-4 w-4 mr-2" />
              Back
            </Button>
            <ESignaturePrompt
              trigger={<Button disabled={!canProceedFromMetadata}>Apply e-signature & Create</Button>}
              title="Deviation Creation Approval"
              statement={`Approve creation of deviation for batch ${draft.details.batchId}`}
              onConfirm={handleCreate}
              demoCredentials={demoCredentials}
            />
          </CardFooter>
        </Card>
      )}
    </div>
  )
}

function buildDeviationId() {
  const timestamp = new Date().toISOString().replace(/[-:TZ.]/g, '').slice(0, 14)
  const random = uuidv4().replace(/-/g, '').slice(0, 4).toUpperCase()
  return `DEV-${timestamp}-${random}`
}

function extractJson(raw: string) {
  const match = raw.match(/\{[\s\S]*\}/)
  if (!match) throw new Error('AI response not parseable as JSON')
  return match[0]
}
