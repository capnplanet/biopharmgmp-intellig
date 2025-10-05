import { useMemo, useState } from 'react'
import { useKV } from '@github/spark/hooks'
import { useCurrentUser } from '@/hooks/use-current-user'
import { useAuditLogger } from '@/hooks/use-audit'
import { useQualityNavigation } from '@/hooks/use-quality-navigation'
import { batches } from '@/data/seed'
import type { ChangeControl, Deviation } from '@/types/quality'
import type { ChangeControlDraftData, ChangeControlDraftImpact, WorkflowStepState } from '@/types/workflows'
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Label } from '@/components/ui/label'
import { Badge } from '@/components/ui/badge'
import { Checkbox } from '@/components/ui/checkbox'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Progress } from '@/components/ui/progress'
import { ESignaturePrompt, type SignatureResult } from '@/components/ESignaturePrompt'
import { toast } from 'sonner'
import { ArrowLeft, ArrowRight, ClipboardText, Factory, FileText, Lightning, Robot } from '@phosphor-icons/react'
import { addDays, format } from 'date-fns'
import { v4 as uuidv4 } from 'uuid'
import { cn } from '@/lib/utils'
import { getSpark } from '@/lib/spark'

const demoCredentials = {
  username: 'change.approver@biopharm.com',
  password: 'DemoPass123!'
}

type WizardStep = 'basics' | 'impact' | 'approval'

type StepConfig = {
  id: WizardStep
  title: string
  description: string
  requiresSignature?: boolean
}

const stepsConfig: StepConfig[] = [
  {
    id: 'basics',
    title: 'Change Request Overview',
    description: 'Capture scope, rationale, and requested owner.'
  },
  {
    id: 'impact',
    title: 'Impact & Implementation',
    description: 'Document affected assets, plan, and validation strategy.'
  },
  {
    id: 'approval',
    title: 'QA / CCB Approval',
    description: 'Review, e-sign, and launch controlled change.',
    requiresSignature: true
  }
]

const initialDraft = (requester: string): ChangeControlDraftData => ({
  basics: {
    title: '',
    description: '',
    requestedBy: requester,
    status: 'draft',
    plannedStartDate: addDays(new Date(), 7),
    plannedEndDate: addDays(new Date(), 21)
  },
  impact: {
    impactedBatches: [],
    impactedEquipment: [],
    riskLevel: 'medium',
    implementationPlan: '',
    validationPlan: '',
    relatedDeviations: []
  },
  approvals: {}
})

const riskOptions: Array<{ value: ChangeControlDraftImpact['riskLevel']; label: string }> = [
  { value: 'low', label: 'Low' },
  { value: 'medium', label: 'Medium' },
  { value: 'high', label: 'High' }
]

const formatDateInput = (value?: Date | null) => {
  if (!value) return ''
  try {
    return format(value, 'yyyy-MM-dd')
  } catch {
    return ''
  }
}

const parseDateInput = (value: string) => {
  if (!value) return undefined
  const date = new Date(value)
  return Number.isNaN(date.getTime()) ? undefined : date
}

const buildChangeControlId = () => {
  const ts = new Date().toISOString().replace(/[-:TZ.]/g, '').slice(0, 14)
  const suffix = Math.floor(Math.random() * 1000).toString().padStart(3, '0')
  return `CC-${ts}-${suffix}`
}

export function ChangeControlCreationWizard({ onCancel }: { onCancel: () => void }) {
  const { user } = useCurrentUser()
  const { log } = useAuditLogger()
  const [, setChangeControls] = useKV<ChangeControl[]>('change-controls', [])
  const [deviations] = useKV<Deviation[]>('deviations', [])
  const navigateQuality = useQualityNavigation()
  const [draft, setDraft] = useState<ChangeControlDraftData>(() => initialDraft(user?.id ?? 'Quality Systems'))
  const [activeStep, setActiveStep] = useState<WizardStep>('basics')
  const [aiBusy, setAiBusy] = useState(false)

  const equipmentOptions = useMemo(() => {
    const allEquipment = batches.flatMap((batch) => batch.equipment ?? [])
    return Array.from(new Set(allEquipment)).sort()
  }, [])

  const deviationOptions = useMemo(() => {
    return (deviations || []).map((dev) => ({ value: dev.id, label: `${dev.id} — ${dev.title}` }))
  }, [deviations])

  const computedSteps: WorkflowStepState[] = useMemo(() => {
    return stepsConfig.map((step, index) => {
      const activeIndex = stepsConfig.findIndex((s) => s.id === activeStep)
      const status = index < activeIndex ? 'complete' : index === activeIndex ? 'active' : 'pending'
      return { ...step, status }
    })
  }, [activeStep])

  const goToStep = (direction: 'forward' | 'back') => {
    const order = stepsConfig.findIndex((step) => step.id === activeStep)
    const nextIndex = direction === 'forward' ? order + 1 : order - 1
    const next = stepsConfig[nextIndex]
    if (!next) return
    setActiveStep(next.id)
  }

  const updateDraft = <K extends keyof ChangeControlDraftData>(section: K, value: ChangeControlDraftData[K]) => {
    setDraft((current) => ({ ...current, [section]: value }))
  }

  const updateImpact = (patch: Partial<ChangeControlDraftImpact>) => {
    setDraft((current) => ({
      ...current,
      impact: {
        ...current.impact,
        ...patch,
      },
    }))
  }

  const toggleItem = (list: string[], value: string, checked: boolean) => {
    if (checked) {
      return Array.from(new Set([...list, value]))
    }
    return list.filter((entry) => entry !== value)
  }

  const handleGenerateImpact = async () => {
    if (!draft.basics.description) {
      toast.error('Provide a change description before requesting AI support')
      return
    }

    try {
      setAiBusy(true)
      const spark = getSpark()
      if (!spark?.llm || !spark.llmPrompt) throw new Error('AI assistant unavailable')
      const context = `Change Title: ${draft.basics.title || 'Untitled change'}\nDescription: ${draft.basics.description}\nRisk Level: ${draft.impact.riskLevel}\nImpacted Batches: ${(draft.impact.impactedBatches || []).join(', ') || 'None'}\nImpacted Equipment: ${(draft.impact.impactedEquipment || []).join(', ') || 'None'}\nRelated Deviations: ${(draft.impact.relatedDeviations || []).join(', ') || 'None'}`
      const prompt = spark.llmPrompt`
        You are assisting a pharmaceutical Change Control Board. Based on the change request context below, provide a concise JSON object with keys impactAssessment, implementationPlan, validationPlan.

        Context:
        ${context}

        Respond ONLY with JSON.
      `
      const raw = await spark.llm(prompt, 'gpt-4o-mini')
      const jsonMatch = raw.match(/\{[\s\S]*\}/)
      if (!jsonMatch) throw new Error('AI response did not include JSON payload')
      const parsed = JSON.parse(jsonMatch[0]) as Partial<{ impactAssessment: string; implementationPlan: string; validationPlan: string }>
      updateImpact({
        implementationPlan: parsed.implementationPlan || draft.impact.implementationPlan,
        validationPlan: parsed.validationPlan || draft.impact.validationPlan,
        aiImpactSummary: `Generated on ${new Date().toLocaleString()}`
      })
      if (parsed.impactAssessment) {
        updateImpact({ impactAssessment: parsed.impactAssessment })
      }
      toast.success('Implementation plan drafted with AI support')
      log('AI Change Control Draft', 'ai', 'Generated change control plan details', { recordId: draft.basics.title || 'change-draft' })
    } catch (error) {
      console.error(error)
      toast.error('Unable to generate change plan')
      log('AI Change Control Draft Failure', 'ai', 'Change control AI assistance failed', { outcome: 'failure' })
    } finally {
      setAiBusy(false)
    }
  }

  const canProceedBasics = Boolean(draft.basics.title.trim() && draft.basics.description.trim())
  const hasImplementationDetail = Boolean(draft.impact.implementationPlan && draft.impact.implementationPlan.trim().length > 0)
  const canProceedImpact = hasImplementationDetail && draft.impact.impactedBatches.length > 0

  const handleCreate = async (signature: SignatureResult) => {
    try {
      const id = buildChangeControlId()
      const signatureRecord = {
        id: `${id}-sign-${uuidv4()}`,
        action: 'Change Control Approval',
        signedBy: signature.userId,
        signedAt: signature.timestamp,
        reason: signature.reason,
        digitalSignature: signature.digitalSignature
      }

      const changeControl: ChangeControl = {
        id,
        title: draft.basics.title,
        description: draft.basics.description,
        status: 'in-review',
        requestedBy: draft.basics.requestedBy,
        requestedDate: new Date(),
        impactedBatches: draft.impact.impactedBatches,
        impactedEquipment: draft.impact.impactedEquipment,
        riskLevel: draft.impact.riskLevel,
        impactAssessment: draft.impact.impactAssessment,
        implementationPlan: draft.impact.implementationPlan,
        validationPlan: draft.impact.validationPlan,
        relatedDeviations: draft.impact.relatedDeviations,
        plannedStartDate: draft.basics.plannedStartDate || undefined,
        plannedEndDate: draft.basics.plannedEndDate || undefined,
        signatures: [signatureRecord]
      }

      setChangeControls((current) => [changeControl, ...(current || [])])
      if ((draft.impact.relatedDeviations || []).length > 0) {
        log('Change Control Linked Deviations', 'change-control', `Linked change control ${id} to deviations ${draft.impact.relatedDeviations?.join(', ')}`, { recordId: id })
      }
      log('Change Control Created', 'change-control', `Change control ${id} created`, {
        recordId: id,
        digitalSignature: signature.digitalSignature
      })
      toast.success(`Change control ${id} created`)
  navigateQuality(`cc/${id}`)
    } catch (error) {
      console.error(error)
      toast.error('Unable to create change control record')
    }
  }

  const progressValue = Math.round(((stepsConfig.findIndex((step) => step.id === activeStep) + 1) / stepsConfig.length) * 100)

  return (
    <div className="p-6 space-y-6 overflow-auto h-full">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Initiate Change Control</h1>
          <p className="text-muted-foreground">Guided workflow to scope, assess, and approve controlled changes.</p>
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
              <Badge variant="outline">{progressValue}%</Badge>
            </div>
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <Progress value={progressValue} />
          <div className="grid gap-4 md:grid-cols-3">
            {computedSteps.map((step, index) => (
              <div
                key={step.id}
                className={cn(
                  'rounded-lg border p-4 transition',
                  step.status === 'active'
                    ? 'border-primary shadow-sm'
                    : step.status === 'complete'
                      ? 'border-emerald-200 bg-emerald-50/40 dark:bg-emerald-950/20'
                      : 'border-border'
                )}
              >
                <div className="flex items-center gap-3">
                  <div
                    className={cn(
                      'flex h-8 w-8 items-center justify-center rounded-full border text-sm font-medium',
                      step.status === 'complete'
                        ? 'bg-emerald-500 text-white border-emerald-500'
                        : step.status === 'active'
                          ? 'bg-primary text-primary-foreground border-primary'
                          : 'text-muted-foreground'
                    )}
                  >
                    {step.status === 'complete' ? index + 1 : index + 1}
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

      {activeStep === 'basics' && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <FileText className="h-5 w-5" />
              Change Request Overview
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid gap-4 md:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="cc-title">Title</Label>
                <Input
                  id="cc-title"
                  value={draft.basics.title}
                  onChange={(event) => updateDraft('basics', { ...draft.basics, title: event.target.value })}
                  placeholder="e.g. Upgrade bioreactor temperature control loop"
                />
              </div>
              <div className="space-y-2">
                <Label>Requested By</Label>
                <Input
                  value={draft.basics.requestedBy}
                  onChange={(event) => updateDraft('basics', { ...draft.basics, requestedBy: event.target.value })}
                />
              </div>
            </div>
            <div className="space-y-2">
              <Label htmlFor="cc-description">Rationale & Scope</Label>
              <Textarea
                id="cc-description"
                value={draft.basics.description}
                onChange={(event) => updateDraft('basics', { ...draft.basics, description: event.target.value })}
                placeholder="Summarize justification, drivers, and scope boundaries."
                className="min-h-28"
              />
            </div>
            <div className="grid gap-4 md:grid-cols-2">
              <div className="space-y-2">
                <Label>Planned Start</Label>
                <Input
                  type="date"
                  value={formatDateInput(draft.basics.plannedStartDate)}
                  onChange={(event) => updateDraft('basics', { ...draft.basics, plannedStartDate: parseDateInput(event.target.value) })}
                />
              </div>
              <div className="space-y-2">
                <Label>Planned Completion</Label>
                <Input
                  type="date"
                  value={formatDateInput(draft.basics.plannedEndDate)}
                  onChange={(event) => updateDraft('basics', { ...draft.basics, plannedEndDate: parseDateInput(event.target.value) })}
                />
              </div>
            </div>
          </CardContent>
          <CardFooter className="flex justify-end gap-2">
            <Button variant="outline" onClick={onCancel}>Cancel</Button>
            <Button onClick={() => goToStep('forward')} disabled={!canProceedBasics}>
              Continue
              <ArrowRight className="h-4 w-4 ml-2" />
            </Button>
          </CardFooter>
        </Card>
      )}

      {activeStep === 'impact' && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Factory className="h-5 w-5" />
              Impact Assessment
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-5">
            <div className="grid gap-6 md:grid-cols-2">
              <div className="space-y-3">
                <Label>Impacted Batches</Label>
                <div className="space-y-2 rounded-md border p-3 max-h-48 overflow-y-auto">
                  {batches.map((batch) => (
                    <div key={batch.id} className="flex items-center gap-2 text-sm">
                      <Checkbox
                        id={`batch-${batch.id}`}
                        checked={draft.impact.impactedBatches.includes(batch.id)}
                        onCheckedChange={(checked) => {
                          updateImpact({
                            impactedBatches: toggleItem(draft.impact.impactedBatches, batch.id, Boolean(checked))
                          })
                        }}
                      />
                      <Label htmlFor={`batch-${batch.id}`} className="font-mono text-xs uppercase tracking-wide">
                        {batch.id}
                      </Label>
                      <span className="text-xs text-muted-foreground">{batch.product}</span>
                    </div>
                  ))}
                </div>
              </div>
              <div className="space-y-3">
                <Label>Impacted Equipment</Label>
                <div className="space-y-2 rounded-md border p-3 max-h-48 overflow-y-auto">
                  {equipmentOptions.map((equipment) => (
                    <div key={equipment} className="flex items-center gap-2 text-sm">
                      <Checkbox
                        id={`equip-${equipment}`}
                        checked={draft.impact.impactedEquipment.includes(equipment)}
                        onCheckedChange={(checked) => {
                          updateImpact({
                            impactedEquipment: toggleItem(draft.impact.impactedEquipment, equipment, Boolean(checked))
                          })
                        }}
                      />
                      <Label htmlFor={`equip-${equipment}`} className="text-xs text-muted-foreground">
                        {equipment}
                      </Label>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            <div className="grid gap-4 md:grid-cols-2">
              <div className="space-y-2">
                <Label>Risk Level</Label>
                <Select
                  value={draft.impact.riskLevel}
                  onValueChange={(value) => updateImpact({ riskLevel: value as ChangeControlDraftImpact['riskLevel'] })}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select risk" />
                  </SelectTrigger>
                  <SelectContent>
                    {riskOptions.map((option) => (
                      <SelectItem key={option.value} value={option.value}>
                        {option.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Related Deviations</Label>
                <div className="rounded-md border p-3 max-h-32 overflow-y-auto space-y-2">
                  {deviationOptions.length === 0 ? (
                    <p className="text-xs text-muted-foreground">No deviations available.</p>
                  ) : (
                    deviationOptions.map((option) => (
                      <div key={option.value} className="flex items-center gap-2 text-sm">
                        <Checkbox
                          id={`dev-${option.value}`}
                          checked={Boolean(draft.impact.relatedDeviations?.includes(option.value))}
                          onCheckedChange={(checked) => {
                            updateImpact({
                              relatedDeviations: toggleItem(draft.impact.relatedDeviations || [], option.value, Boolean(checked))
                            })
                          }}
                        />
                        <Label htmlFor={`dev-${option.value}`} className="text-xs text-muted-foreground">
                          {option.label}
                        </Label>
                      </div>
                    ))
                  )}
                </div>
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="cc-impact">Impact Assessment</Label>
              <Textarea
                id="cc-impact"
                value={draft.impact.impactAssessment || ''}
                onChange={(event) => updateImpact({ impactAssessment: event.target.value })}
                placeholder="Document process, product, facilities, validation, and regulatory impact."
                className="min-h-24"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="cc-implementation">Implementation Plan</Label>
              <Textarea
                id="cc-implementation"
                value={draft.impact.implementationPlan || ''}
                onChange={(event) => updateImpact({ implementationPlan: event.target.value })}
                placeholder="Outline sequencing, responsible teams, and change execution tasks."
                className="min-h-24"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="cc-validation">Validation & Verification Plan</Label>
              <Textarea
                id="cc-validation"
                value={draft.impact.validationPlan || ''}
                onChange={(event) => updateImpact({ validationPlan: event.target.value })}
                placeholder="Describe validation batch strategy, requalification, or testing.
                "
                className="min-h-20"
              />
            </div>
            <div className="flex items-center justify-between gap-3">
              <div className="text-xs text-muted-foreground">
                {draft.impact.aiImpactSummary || 'Leverage AI assistant to jump-start change planning.'}
              </div>
              <Button variant="outline" size="sm" onClick={handleGenerateImpact} disabled={aiBusy}>
                <Robot className="h-4 w-4 mr-2" />
                {aiBusy ? 'Generating…' : 'AI draft plan'}
              </Button>
            </div>
          </CardContent>
          <CardFooter className="flex justify-between gap-2">
            <Button variant="ghost" onClick={() => goToStep('back')}>
              <ArrowLeft className="h-4 w-4 mr-2" />
              Back
            </Button>
            <div className="flex gap-2">
              <Button variant="outline" onClick={onCancel}>Cancel</Button>
              <Button onClick={() => goToStep('forward')} disabled={!canProceedImpact}>
                Continue
                <ArrowRight className="h-4 w-4 ml-2" />
              </Button>
            </div>
          </CardFooter>
        </Card>
      )}

      {activeStep === 'approval' && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <ClipboardText className="h-5 w-5" />
              Review & Approval
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid gap-4 md:grid-cols-2">
              <div className="space-y-2">
                <Label>Summary</Label>
                <div className="rounded-md border p-3 text-sm space-y-1">
                  <div><span className="font-semibold">Title:</span> {draft.basics.title || '—'}</div>
                  <div><span className="font-semibold">Requested By:</span> {draft.basics.requestedBy}</div>
                  <div><span className="font-semibold">Planned Window:</span> {formatDateInput(draft.basics.plannedStartDate) || '—'} → {formatDateInput(draft.basics.plannedEndDate) || '—'}</div>
                  <div><span className="font-semibold">Risk:</span> {draft.impact.riskLevel}</div>
                </div>
              </div>
              <div className="space-y-2">
                <Label>Impacted Scope</Label>
                <div className="rounded-md border p-3 text-sm space-y-1">
                  <div><span className="font-semibold">Batches:</span> {draft.impact.impactedBatches.join(', ') || 'None'}</div>
                  <div><span className="font-semibold">Equipment:</span> {draft.impact.impactedEquipment.join(', ') || 'None'}</div>
                  <div><span className="font-semibold">Related Deviations:</span> {(draft.impact.relatedDeviations || []).join(', ') || 'None'}</div>
                </div>
              </div>
            </div>
            <div className="space-y-2">
              <Label>Implementation Plan</Label>
              <div className="rounded-md border p-3 text-sm bg-muted/50 whitespace-pre-wrap">{draft.impact.implementationPlan || '—'}</div>
            </div>
            <div className="space-y-2">
              <Label>Validation Strategy</Label>
              <div className="rounded-md border p-3 text-sm bg-muted/50 whitespace-pre-wrap">{draft.impact.validationPlan || '—'}</div>
            </div>
            <div className="space-y-2">
              <Label>Impact Assessment</Label>
              <div className="rounded-md border p-3 text-sm bg-muted/50 whitespace-pre-wrap">{draft.impact.impactAssessment || '—'}</div>
            </div>
          </CardContent>
          <CardFooter className="flex flex-wrap items-center justify-between gap-3">
            <Button variant="ghost" onClick={() => goToStep('back')}>
              <ArrowLeft className="h-4 w-4 mr-2" />
              Back
            </Button>
            <ESignaturePrompt
              trigger={(
                <Button className="flex items-center gap-2">
                  <Lightning className="h-4 w-4" />
                  Approve & Issue Change
                </Button>
              )}
              title="Authorize Change Control"
              statement={`Approval for change control ${draft.basics.title || 'draft change control'}`}
              demoCredentials={demoCredentials}
              onConfirm={handleCreate}
            />
          </CardFooter>
        </Card>
      )}
    </div>
  )
}

export default ChangeControlCreationWizard
