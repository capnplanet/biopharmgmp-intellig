import { useMemo, useState } from 'react'
import { useKV } from '@github/spark/hooks'
import { useCurrentUser } from '@/hooks/use-current-user'
import { useAuditLogger } from '@/hooks/use-audit'
import type { CAPA, Deviation, Investigation } from '@/types/quality'
import type { CapaDraftAction, CapaDraftData, WorkflowStepState } from '@/types/workflows'
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Label } from '@/components/ui/label'
import { Badge } from '@/components/ui/badge'
import { Checkbox } from '@/components/ui/checkbox'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { ESignaturePrompt, type SignatureResult } from '@/components/ESignaturePrompt'
import { toast } from 'sonner'
import {
  ArrowLeft,
  ArrowRight,
  CheckCircle,
  ClipboardText,
  ListChecks,
  Robot,
  Sparkle
} from '@phosphor-icons/react'
import { format, addDays } from 'date-fns'
import { v4 as uuidv4 } from 'uuid'
import { getSpark } from '@/lib/spark'
import { buildInvestigationSources, sourcesToString } from '@/data/archive'
import { cn } from '@/lib/utils'

const demoCredentials = {
  username: 'capa.approver@biopharm.com',
  password: 'DemoPass123!'
}

type WizardStep = 'basics' | 'actions' | 'approval'

type StepConfig = {
  id: WizardStep
  title: string
  description: string
  requiresSignature?: boolean
}

const stepsConfig: StepConfig[] = [
  {
    id: 'basics',
    title: 'CAPA Overview',
    description: 'Define objective, scope, and related deviations.'
  },
  {
    id: 'actions',
    title: 'Action Plan',
    description: 'Capture corrective/preventive actions and monitoring plan.'
  },
  {
    id: 'approval',
    title: 'Approval & Launch',
    description: 'Review, e-sign, and release CAPA record.',
    requiresSignature: true
  }
]

const priorityOptions: Array<{ value: CAPA['priority']; label: string }> = [
  { value: 'high', label: 'High' },
  { value: 'medium', label: 'Medium' },
  { value: 'low', label: 'Low' }
]

const typeOptions: Array<{ value: CAPA['type']; label: string }> = [
  { value: 'corrective', label: 'Corrective' },
  { value: 'preventive', label: 'Preventive' }
]

const initialDraft = (owner: string): CapaDraftData => {
  const today = new Date()
  return {
    basics: {
      title: '',
      description: '',
      type: 'corrective',
      priority: 'high',
      dueDate: addDays(today, 45),
      owner,
      relatedDeviations: []
    },
    actions: [createDraftAction(owner, addDays(today, 14))],
    metadata: {
      riskAssessment: '',
      effectivenessPlan: ''
    },
    approvals: {}
  }
}

export function CapaCreationWizard({ onCancel }: { onCancel: () => void }) {
  const { user } = useCurrentUser()
  const { log } = useAuditLogger()
  const [, setCAPAs] = useKV<CAPA[]>('capas', [])
  const [deviations] = useKV<Deviation[]>('deviations', [])
  const [, setInvestigations] = useKV<Investigation[]>('investigations')
  const [, setRoute] = useKV<string>('route', '')
  const [draft, setDraft] = useState<CapaDraftData>(() => initialDraft(user?.id ?? 'Quality'))
  const [activeStep, setActiveStep] = useState<WizardStep>('basics')
  const [aiBusy, setAiBusy] = useState(false)

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

  const updateDraft = <K extends keyof CapaDraftData>(section: K, value: CapaDraftData[K]) => {
    setDraft((current) => ({ ...current, [section]: value }))
  }

  const updateAction = (id: string, patch: Partial<CapaDraftAction>) => {
    updateDraft('actions', draft.actions.map((action) => action.id === id ? { ...action, ...patch } : action))
  }

  const removeAction = (id: string) => {
    updateDraft('actions', draft.actions.filter((action) => action.id !== id))
  }

  const addAction = () => {
    updateDraft('actions', [...draft.actions, createDraftAction(draft.basics.owner, draft.basics.dueDate || addDays(new Date(), 30))])
  }

  const toggleDeviation = (id: string, checked: boolean) => {
    const related = draft.basics.relatedDeviations
    const next = checked
      ? Array.from(new Set([...related, id]))
      : related.filter((value) => value !== id)
    updateDraft('basics', { ...draft.basics, relatedDeviations: next })
  }

  const handleGenerateOverview = async () => {
    if (draft.basics.relatedDeviations.length === 0) {
      toast.error('Select at least one related deviation for AI context')
      return
    }

    try {
      setAiBusy(true)
      const spark = getSpark()
      if (!spark?.llm || !spark.llmPrompt) throw new Error('AI assistant unavailable')
      const context = draft.basics.relatedDeviations
        .map((id) => {
          const deviation = (deviations || []).find((dev) => dev.id === id)
          if (!deviation) return ''
          const sources = buildInvestigationSources(deviation.batchId)
          return `Deviation ${deviation.id}: ${deviation.title} (Severity: ${deviation.severity})\n${deviation.description}\nSources:\n${sourcesToString(sources)}`
        })
        .join('\n\n')

      const prompt = spark.llmPrompt`
        You are a pharmaceutical quality systems assistant. Based on the provided deviations, draft a CAPA plan.
        Respond with valid JSON matching the shape:
        {
          "title": string,
          "description": string,
          "owner": string,
          "priority": "high" | "medium" | "low",
          "type": "corrective" | "preventive",
          "dueInDays": number,
          "riskAssessment": string,
          "effectivenessPlan": string,
          "actions": [
            { "description": string, "responsible": string, "dueInDays": number }
          ]
        }
        Do not include any commentary outside the JSON.

        CONTEXT:
        ${context}
      `
      const raw = await spark.llm(prompt, 'gpt-4o-mini')
      const json = extractJson(raw)
      type CapaAiResult = Partial<{
        title: string
        description: string
        owner: string
        priority: CAPA['priority']
        type: CAPA['type']
        dueInDays: number
        riskAssessment: string
        effectivenessPlan: string
        actions: Array<{ description: string; responsible: string; dueInDays?: number }>
      }>
      const result = JSON.parse(json) as CapaAiResult
      const today = new Date()
      const dueDate = result.dueInDays ? addDays(today, result.dueInDays) : draft.basics.dueDate
      updateDraft('basics', {
        ...draft.basics,
        title: result.title || draft.basics.title,
        description: result.description || draft.basics.description,
        owner: result.owner || draft.basics.owner,
        priority: result.priority || draft.basics.priority,
        type: result.type || draft.basics.type,
        dueDate: dueDate || draft.basics.dueDate
      })
      updateDraft('metadata', {
        ...draft.metadata,
        riskAssessment: result.riskAssessment || draft.metadata.riskAssessment,
        effectivenessPlan: result.effectivenessPlan || draft.metadata.effectivenessPlan,
        aiProposal: `Generated ${new Date().toLocaleString()}`
      })
      if (result.actions && result.actions.length > 0) {
        updateDraft('actions', result.actions.map((action, index) => createDraftAction(
          action.responsible || draft.basics.owner,
          action.dueInDays ? addDays(today, action.dueInDays) : draft.basics.dueDate || addDays(today, 30),
          action.description || `Action ${index + 1}`
        )))
      }
      toast.success('CAPA proposal generated')
      log('AI CAPA Proposal', 'ai', 'Generated CAPA overview and actions', { recordId: draft.basics.relatedDeviations.join(', ') || undefined })
    } catch (error) {
      console.error(error)
      toast.error('Unable to generate CAPA draft')
      log('AI CAPA Failure', 'ai', 'CAPA draft generation failed', { outcome: 'failure' })
    } finally {
      setAiBusy(false)
    }
  }

  const handleGenerateActions = async () => {
    if (!draft.basics.description) {
      toast.error('Provide a CAPA description before generating actions')
      return
    }

    try {
      setAiBusy(true)
      const spark = getSpark()
      if (!spark?.llm || !spark.llmPrompt) throw new Error('AI assistant unavailable')
      const prompt = spark.llmPrompt`
        You are assisting with CAPA planning. Given the CAPA context below, output JSON array of actions where each item has description, responsible, dueInDays.
        Context:
        Title: ${draft.basics.title || 'Untitled CAPA'}
        Description: ${draft.basics.description}
        Risk Assessment: ${draft.metadata.riskAssessment || 'N/A'}
        Effectiveness Plan: ${draft.metadata.effectivenessPlan || 'N/A'}
        Existing Actions:
        ${draft.actions.map(action => `- ${action.description} (${action.responsible})`).join('\n') || 'None'}
      `
      const raw = await spark.llm(prompt, 'gpt-4o-mini')
      const json = extractJson(raw)
      const parsed = JSON.parse(json) as Array<{ description: string; responsible?: string; dueInDays?: number }>
      const today = new Date()
      const generated = parsed.map((action, index) => createDraftAction(
        action.responsible || draft.basics.owner,
        action.dueInDays ? addDays(today, action.dueInDays) : draft.basics.dueDate || addDays(today, 30),
        action.description || `Generated Action ${index + 1}`
      ))
      updateDraft('actions', generated)
      updateDraft('metadata', {
        ...draft.metadata,
        aiProposal: `Updated actions ${new Date().toLocaleString()}`
      })
      toast.success('Actions updated with AI suggestions')
      log('AI CAPA Actions', 'ai', 'Generated CAPA actions with AI', { recordId: draft.basics.title || 'CAPA-draft' })
    } catch (error) {
      console.error(error)
      toast.error('Unable to generate actions')
      log('AI CAPA Actions Failure', 'ai', 'Failed to generate CAPA actions', { outcome: 'failure' })
    } finally {
      setAiBusy(false)
    }
  }

  const canProceedFromBasics = Boolean(draft.basics.title && draft.basics.description && draft.basics.owner)
  const canProceedFromActions = draft.actions.length > 0 && draft.actions.every((action) => action.description.trim() && action.responsible.trim())

  const handleCreate = async (signature: SignatureResult) => {
    try {
      const capaId = buildCapaId()
      const dueDate = draft.basics.dueDate || addDays(new Date(), 45)
      const signatureRecord = {
        id: `${capaId}-sign-${Date.now()}`,
        action: 'CAPA Creation Approval',
        signedBy: signature.userId,
        signedAt: signature.timestamp,
        reason: signature.reason,
        digitalSignature: signature.digitalSignature
      }
      const actions = draft.actions.map((action, index) => ({
        id: action.id || `ACT-${index + 1}`,
        description: action.description,
        responsible: action.responsible,
        dueDate: action.dueDate || dueDate,
        status: 'pending' as const
      }))
      const capa: CAPA = {
        id: capaId,
        title: draft.basics.title,
        description: draft.basics.description,
        type: draft.basics.type,
        priority: draft.basics.priority,
        status: 'approved',
        dueDate,
        assignedTo: draft.basics.owner,
        relatedDeviations: draft.basics.relatedDeviations,
        actions,
        effectivenessCheck: draft.metadata.effectivenessPlan
          ? {
              dueDate: addDays(dueDate, 30),
              status: 'pending',
              result: undefined
            }
          : undefined,
        signatures: [signatureRecord],
        riskAssessment: draft.metadata.riskAssessment,
        effectivenessPlan: draft.metadata.effectivenessPlan,
        aiProposalSummary: draft.metadata.aiProposal,
        createdAt: new Date(),
        createdBy: user?.id ?? 'quality.user',
        metadata: {
          ...(draft.metadata.aiProposal ? { aiProposal: draft.metadata.aiProposal } : {}),
          createdFrom: 'wizard',
          createdAt: new Date().toISOString(),
          createdBy: user?.id ?? 'quality.user'
        }
      }

      setCAPAs((current) => [capa, ...(current || [])])
      if (draft.basics.relatedDeviations.length > 0) {
        setInvestigations((current) => (current || []).map((inv) => {
          if (!draft.basics.relatedDeviations.includes(inv.deviationId)) return inv
          const relatedCapas = new Set(inv.relatedCapas || [])
          relatedCapas.add(capaId)
          return {
            ...inv,
            relatedCapas: Array.from(relatedCapas)
          }
        }))
      }

      log('CAPA Created', 'capa', `CAPA ${capaId} created for ${draft.basics.relatedDeviations.join(', ') || 'general improvement'}`, {
        recordId: capaId,
        digitalSignature: signature.digitalSignature
      })
      toast.success(`CAPA ${capaId} created`)
      setRoute(`capa/${capaId}/review`)
    } catch (error) {
      console.error(error)
      toast.error('Unable to create CAPA record')
    }
  }

  const activeIndex = stepsConfig.findIndex((step) => step.id === activeStep)
  const progressValue = Math.round(((activeIndex + 1) / stepsConfig.length) * 100)

  return (
    <div className="p-6 space-y-6 overflow-auto h-full">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Create CAPA Record</h1>
          <p className="text-muted-foreground">Guided workflow to define CAPA scope, actions, and approval.</p>
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

      {activeStep === 'basics' && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Sparkle className="h-5 w-5" />
              CAPA Overview
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid gap-4 md:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="capa-title">Title</Label>
                <Input
                  id="capa-title"
                  value={draft.basics.title}
                  onChange={(event) => updateDraft('basics', { ...draft.basics, title: event.target.value })}
                  placeholder="Summarize the CAPA objective"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="capa-owner">Owner</Label>
                <Input
                  id="capa-owner"
                  value={draft.basics.owner}
                  onChange={(event) => updateDraft('basics', { ...draft.basics, owner: event.target.value })}
                />
              </div>
            </div>
            <div className="grid gap-4 md:grid-cols-3">
              <div className="space-y-2">
                <Label>Type</Label>
                <Select value={draft.basics.type} onValueChange={(value) => updateDraft('basics', { ...draft.basics, type: value as CAPA['type'] })}>
                  <SelectTrigger className="w-full">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {typeOptions.map((option) => (
                      <SelectItem key={option.value} value={option.value}>{option.label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Priority</Label>
                <Select value={draft.basics.priority} onValueChange={(value) => updateDraft('basics', { ...draft.basics, priority: value as CAPA['priority'] })}>
                  <SelectTrigger className="w-full">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {priorityOptions.map((option) => (
                      <SelectItem key={option.value} value={option.value}>{option.label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Due Date</Label>
                <Input
                  type="date"
                  value={draft.basics.dueDate ? format(draft.basics.dueDate, 'yyyy-MM-dd') : ''}
                  onChange={(event) => updateDraft('basics', { ...draft.basics, dueDate: event.target.value ? new Date(event.target.value) : null })}
                />
              </div>
            </div>
            <div className="space-y-2">
              <Label htmlFor="capa-description">Description</Label>
              <Textarea
                id="capa-description"
                value={draft.basics.description}
                onChange={(event) => updateDraft('basics', { ...draft.basics, description: event.target.value })}
                className="min-h-32"
                placeholder="Describe the non-conformance, objective, and expected outcome"
              />
            </div>
            <div className="space-y-2">
              <Label>Related Deviations</Label>
              <div className="grid gap-2">
                {(deviations || []).slice(0, 6).map((deviation) => (
                  <label key={deviation.id} className="flex items-center gap-2 text-sm">
                    <Checkbox
                      checked={draft.basics.relatedDeviations.includes(deviation.id)}
                      onCheckedChange={(checked) => toggleDeviation(deviation.id, checked === true)}
                    />
                    <span className="font-mono text-xs md:text-sm">{deviation.id}</span>
                    <span className="hidden md:inline text-muted-foreground">— {deviation.title}</span>
                  </label>
                ))}
                {((deviations || []).length || 0) > 6 && (
                  <p className="text-xs text-muted-foreground">Showing 6 deviations. Narrow selection in the Deviations tab for more.</p>
                )}
              </div>
            </div>
            <div className="space-y-2">
              <Label htmlFor="capa-risk">Risk Assessment</Label>
              <Textarea
                id="capa-risk"
                value={draft.metadata.riskAssessment || ''}
                onChange={(event) => updateDraft('metadata', { ...draft.metadata, riskAssessment: event.target.value })}
                className="min-h-24"
                placeholder="Summarize risk rating, impact assessment, and regulatory considerations"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="capa-effectiveness">Effectiveness Monitoring Plan</Label>
              <Textarea
                id="capa-effectiveness"
                value={draft.metadata.effectivenessPlan || ''}
                onChange={(event) => updateDraft('metadata', { ...draft.metadata, effectivenessPlan: event.target.value })}
                className="min-h-20"
                placeholder="Outline follow-up reviews, metrics, or verification activities"
              />
            </div>
            {draft.metadata.aiProposal && (
              <div className="rounded-md border border-dashed p-3 text-xs text-muted-foreground">
                <div className="font-medium text-sm mb-1">AI assistance</div>
                <div>{draft.metadata.aiProposal}</div>
              </div>
            )}
          </CardContent>
          <CardFooter className="flex justify-between">
            <Button variant="secondary" onClick={handleGenerateOverview} disabled={aiBusy}>
              <Robot className="h-4 w-4 mr-2" />
              {aiBusy ? 'Generating…' : 'Draft with AI'}
            </Button>
            <Button onClick={() => goToStep('forward')} disabled={!canProceedFromBasics}>
              Next
              <ArrowRight className="h-4 w-4 ml-2" />
            </Button>
          </CardFooter>
        </Card>
      )}

      {activeStep === 'actions' && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <ClipboardText className="h-5 w-5" />
              Action Plan
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-3">
              {draft.actions.map((action, index) => (
                <div key={action.id} className="rounded-lg border p-4 space-y-3">
                  <div className="flex items-center justify-between">
                    <div className="text-sm font-medium">Action {index + 1}</div>
                    {draft.actions.length > 1 && (
                      <Button variant="ghost" size="sm" onClick={() => removeAction(action.id)}>
                        Remove
                      </Button>
                    )}
                  </div>
                  <div className="space-y-2">
                    <Label>Description</Label>
                    <Textarea
                      value={action.description}
                      onChange={(event) => updateAction(action.id, { description: event.target.value })}
                      className="min-h-24"
                      placeholder="Describe the corrective/preventive step"
                    />
                  </div>
                  <div className="grid gap-4 md:grid-cols-2">
                    <div className="space-y-2">
                      <Label>Responsible</Label>
                      <Input
                        value={action.responsible}
                        onChange={(event) => updateAction(action.id, { responsible: event.target.value })}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label>Due Date</Label>
                      <Input
                        type="date"
                        value={action.dueDate ? format(action.dueDate, 'yyyy-MM-dd') : ''}
                        onChange={(event) => updateAction(action.id, { dueDate: event.target.value ? new Date(event.target.value) : undefined })}
                      />
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
          <CardFooter className="flex items-center justify-between">
            <div className="flex gap-2">
              <Button variant="secondary" onClick={handleGenerateActions} disabled={aiBusy}>
                <Robot className="h-4 w-4 mr-2" />
                {aiBusy ? 'Generating…' : 'Generate actions'}
              </Button>
              <Button variant="outline" onClick={addAction}>
                Add action
              </Button>
            </div>
            <Button onClick={() => goToStep('forward')} disabled={!canProceedFromActions}>
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
              <ListChecks className="h-5 w-5" />
              Review & Approve
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="rounded-lg border p-4 space-y-3 bg-muted/30">
              <div className="flex flex-wrap items-center gap-2">
                <Badge variant="outline">Type: {draft.basics.type}</Badge>
                <Badge variant="outline">Priority: {draft.basics.priority}</Badge>
                <Badge variant="outline">Owner: {draft.basics.owner}</Badge>
                <Badge variant="outline">Due {draft.basics.dueDate ? format(draft.basics.dueDate, 'PP') : 'TBD'}</Badge>
              </div>
              <div>
                <div className="text-xs uppercase tracking-wide text-muted-foreground">Title</div>
                <div className="font-medium">{draft.basics.title || '—'}</div>
              </div>
              <div>
                <div className="text-xs uppercase tracking-wide text-muted-foreground">Description</div>
                <p className="text-sm leading-relaxed whitespace-pre-wrap">{draft.basics.description || '—'}</p>
              </div>
              {draft.metadata.riskAssessment && (
                <div>
                  <div className="text-xs uppercase tracking-wide text-muted-foreground">Risk Assessment</div>
                  <p className="text-sm leading-relaxed whitespace-pre-wrap">{draft.metadata.riskAssessment}</p>
                </div>
              )}
              {draft.metadata.effectivenessPlan && (
                <div>
                  <div className="text-xs uppercase tracking-wide text-muted-foreground">Effectiveness Plan</div>
                  <p className="text-sm leading-relaxed whitespace-pre-wrap">{draft.metadata.effectivenessPlan}</p>
                </div>
              )}
            </div>
            <div className="space-y-3">
              <div className="text-sm font-medium">Actions</div>
              <div className="space-y-3">
                {draft.actions.map((action) => (
                  <div key={action.id} className="rounded-md border p-3 text-sm bg-background">
                    <div className="font-medium">{action.description || 'Untitled action'}</div>
                    <div className="text-xs text-muted-foreground mt-1">
                      Owner: {action.responsible || 'Unassigned'} • Due {action.dueDate ? format(action.dueDate, 'PP') : 'TBD'}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </CardContent>
          <CardFooter className="flex justify-between">
            <Button variant="outline" onClick={() => goToStep('back')}>
              <ArrowLeft className="h-4 w-4 mr-2" />
              Back
            </Button>
            <ESignaturePrompt
              trigger={<Button>Apply e-signature & Create</Button>}
              title="CAPA Creation Approval"
              statement={`Approve CAPA ${draft.basics.title || 'record'}`}
              onConfirm={handleCreate}
              demoCredentials={demoCredentials}
            />
          </CardFooter>
        </Card>
      )}
    </div>
  )
}

function createDraftAction(responsible: string, dueDate?: Date | null, description = ''): CapaDraftAction {
  return {
    id: `ACT-${uuidv4().slice(0, 8)}`,
    description,
    responsible,
    dueDate: dueDate ?? undefined
  }
}

function buildCapaId() {
  const timestamp = new Date().toISOString().replace(/[-:TZ.]/g, '').slice(0, 10)
  const random = uuidv4().replace(/-/g, '').slice(0, 3).toUpperCase()
  return `CAPA-${timestamp}-${random}`
}

function extractJson(raw: string) {
  const match = raw.match(/\{[\s\S]*\}/) || raw.match(/\[[\s\S]*\]/)
  if (!match) throw new Error('AI response not parseable as JSON')
  return match[0]
}
