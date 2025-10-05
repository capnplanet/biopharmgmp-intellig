import React, { useEffect, useMemo, useState } from 'react'
import { useForm, useFieldArray } from 'react-hook-form'
import { useKV } from '@github/spark/hooks'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Checkbox } from '@/components/ui/checkbox'
import { Form, FormControl, FormDescription, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form'
import { Progress } from '@/components/ui/progress'
import { toast } from 'sonner'
import { ArrowLeft, ArrowRight, Lightbulb, NotePencil, Signature } from '@phosphor-icons/react'
import { useAuditLogger } from '@/hooks/use-audit'
import { ESignaturePrompt, type SignatureResult } from '@/components/ESignaturePrompt'
import type { CAPA, Deviation, ESignatureRecord } from '@/types/quality'
import { cn } from '@/lib/utils'

const demoCredentials = {
  username: 'capa.approver@biopharm.com',
  password: 'DemoPass123!'
}

type CapaFormValues = {
  title: string
  description: string
  type: CAPA['type']
  priority: CAPA['priority']
  assignedTo: string
  dueDate: string
  effectivenessDueDate: string
  relatedDeviations: string[]
  rootCause: string
  correctivePlan: string
  preventivePlan: string
  verificationPlan: string
  riskAssessment: string
  linkedSystems: string
  actions: Array<{
    description: string
    responsible: string
    dueDate: string
  }>
}

const stepConfig = [
  { id: 'context', label: 'Context & Scope', description: 'Capture baseline details for the CAPA record.' },
  { id: 'analysis', label: 'Root Cause & Impact', description: 'Document contributing factors and impacted records.' },
  { id: 'plan', label: 'Corrective Actions', description: 'Define action plan, owners, and timelines.' },
  { id: 'review', label: 'Review & E-sign', description: 'Verify the plan and capture approval signature.' }
] as const

type StepId = typeof stepConfig[number]['id']

const stepValidationMap: Record<StepId, (keyof CapaFormValues | `actions.${number}.${keyof CapaFormValues['actions'][number]}`)[]> = {
  context: ['title', 'description', 'type', 'priority', 'assignedTo', 'dueDate'],
  analysis: ['rootCause'],
  plan: ['actions'],
  review: []
}

const generateCapaId = (existing: CAPA[] | undefined) => {
  const list = existing || []
  const year = new Date().getFullYear()
  const prefix = `CAPA-${year}-`
  const maxSequence = list
    .filter(item => item.id.startsWith(prefix))
    .map(item => Number.parseInt(item.id.slice(prefix.length), 10))
    .filter(num => !Number.isNaN(num))
    .reduce((acc, val) => Math.max(acc, val), 0)
  const next = `${(maxSequence + 1).toString().padStart(3, '0')}`
  return `${prefix}${next}`
}

const buildSignatureRecord = (capaId: string, signature: SignatureResult, action: string): ESignatureRecord => ({
  id: `${capaId}-${signature.timestamp.getTime()}`,
  action,
  signedBy: signature.userId,
  signedAt: signature.timestamp,
  reason: signature.reason,
  digitalSignature: signature.digitalSignature
})

export function CapaCreateWizard({ onBack }: { onBack: () => void }) {
  const [capas = [], setCAPAs] = useKV<CAPA[]>('capas', [])
  const [deviations = []] = useKV<Deviation[]>('deviations', [])
  const [, setRoute] = useKV<string>('route', '')
  const { log } = useAuditLogger()
  const [activeStep, setActiveStep] = useState<StepId>('context')
  const [isCreating, setIsCreating] = useState(false)
  const capASnapshot = React.useRef<CAPA[] | undefined>(capas)

  const form = useForm<CapaFormValues>({
    defaultValues: {
      title: '',
      description: '',
      type: 'corrective',
      priority: 'medium',
      assignedTo: '',
      dueDate: '',
      effectivenessDueDate: '',
      relatedDeviations: [],
      rootCause: '',
      correctivePlan: '',
      preventivePlan: '',
      verificationPlan: '',
      riskAssessment: '',
      linkedSystems: '',
      actions: [
        {
          description: '',
          responsible: '',
          dueDate: ''
        }
      ]
    }
  })

  const { control, watch } = form
  const { fields, append, remove } = useFieldArray({ name: 'actions', control })

  const watchedValues = watch()
  const activeIndex = useMemo(() => stepConfig.findIndex(step => step.id === activeStep), [activeStep])
  const progressValue = ((activeIndex + 1) / stepConfig.length) * 100

  useEffect(() => {
    log('Start CAPA Creation', 'capa', 'User started CAPA creation workflow')
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const goToStep = async (direction: 'next' | 'back') => {
    const currentIndex = stepConfig.findIndex(step => step.id === activeStep)
    if (direction === 'back') {
      const previous = Math.max(0, currentIndex - 1)
      setActiveStep(stepConfig[previous].id)
      return
    }

    const fieldsToValidate = stepValidationMap[activeStep]
    let isValid = true
    if (fieldsToValidate.length > 0) {
      isValid = await form.trigger(fieldsToValidate as (keyof CapaFormValues)[])
    }

    if (!isValid) {
      toast.error('Please complete required fields before continuing')
      return
    }

    if (activeStep === 'plan') {
      const actions = form.getValues('actions')
      const invalidAction = actions.some(action => !action.description || !action.responsible || !action.dueDate)
      if (invalidAction) {
        toast.error('Each action requires a description, owner, and due date')
        return
      }
    }

    const next = Math.min(stepConfig.length - 1, currentIndex + 1)
    setActiveStep(stepConfig[next].id)
  }

  const handleSignature = async (signature: SignatureResult) => {
    setIsCreating(true)
    const submit = form.handleSubmit(async values => {
      try {
        const capaId = generateCapaId(capASnapshot.current)
        const effectivenessDueDate = values.effectivenessDueDate ? new Date(values.effectivenessDueDate) : undefined
        const actions = values.actions.map((action, index) => ({
          id: `${capaId}-ACT-${(index + 1).toString().padStart(3, '0')}`,
          description: action.description.trim(),
          responsible: action.responsible.trim(),
          dueDate: new Date(action.dueDate),
          status: 'pending'
        }))

        const newRecord: CAPA = {
          id: capaId,
          title: values.title.trim(),
          description: values.description.trim(),
          type: values.type,
          priority: values.priority,
          status: 'draft',
          dueDate: new Date(values.dueDate),
          assignedTo: values.assignedTo.trim(),
          relatedDeviations: values.relatedDeviations,
          actions,
          effectivenessCheck: effectivenessDueDate
            ? {
                dueDate: effectivenessDueDate,
                status: 'pending'
              }
            : undefined,
          signatures: [buildSignatureRecord(capaId, signature, 'Creation Approved')],
          rootCause: values.rootCause.trim() || undefined,
          correctivePlan: values.correctivePlan.trim() || undefined,
          preventivePlan: values.preventivePlan.trim() || undefined,
          verificationPlan: values.verificationPlan.trim() || undefined,
          createdAt: new Date(),
          createdBy: signature.userId,
          metadata: {
            riskAssessment: values.riskAssessment.trim() || undefined,
            linkedSystems: values.linkedSystems.trim() || undefined,
            generator: 'CAPA Creation Wizard'
          }
        }

        setCAPAs(current => [newRecord, ...(current || [])])
        toast.success(`CAPA ${capaId} created`)
        log('CAPA Created', 'capa', `New CAPA ${capaId} created via wizard`, {
          recordId: capaId,
          digitalSignature: signature.digitalSignature,
          userOverride: {
            id: signature.userId,
            role: 'Quality Approver',
            ipAddress: '127.0.0.1',
            sessionId: `sess-esign-${capaId.slice(-4)}`
          }
        })
        setRoute(`capa/${capaId}/review`)
      } catch (error) {
        console.error(error)
        toast.error('Unable to create CAPA record')
      } finally {
        setIsCreating(false)
      }
    }, () => {
      toast.error('Please resolve validation issues before signing')
      setIsCreating(false)
    })

    try {
      await submit()
    } catch (error) {
      setIsCreating(false)
      toast.error('Unexpected error during CAPA creation')
      console.error(error)
    }
  }

  useEffect(() => {
    capASnapshot.current = capas
  }, [capas])

  return (
    <div className="p-6 space-y-6 overflow-auto h-full">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Create CAPA</h1>
          <p className="text-muted-foreground">Follow the guided workflow to assemble a compliant CAPA package.</p>
        </div>
        <Button variant="ghost" onClick={onBack}>
          <ArrowLeft className="h-4 w-4 mr-2" />
          Back to Quality
        </Button>
      </div>

      <Card>
        <CardHeader className="space-y-4">
          <CardTitle className="flex flex-col gap-2">
            <div className="flex items-center justify-between">
              <span className="text-lg font-semibold">Workflow Progress</span>
              <Badge variant="outline">Step {activeIndex + 1} of {stepConfig.length}</Badge>
            </div>
            <Progress value={progressValue} />
          </CardTitle>
          <ol className="grid gap-3 md:grid-cols-4">
            {stepConfig.map((step, index) => {
              const complete = index < activeIndex
              const current = index === activeIndex
              return (
                <li key={step.id} className={cn('rounded-md border p-3 text-sm transition', complete && 'bg-success/10 border-success/50', current && 'border-primary bg-primary/5')}>
                  <div className="flex items-center justify-between">
                    <span className="font-medium">{index + 1}. {step.label}</span>
                    {complete && <Badge variant="outline" className="text-xs">Complete</Badge>}
                    {current && !complete && <Badge variant="outline" className="text-xs">In progress</Badge>}
                  </div>
                  <p className="mt-2 text-xs text-muted-foreground leading-relaxed">{step.description}</p>
                </li>
              )
            })}
          </ol>
        </CardHeader>
      </Card>

      <Form {...form}>
        <form className="space-y-6" onSubmit={(event) => event.preventDefault()}>
          {activeStep === 'context' && (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <NotePencil className="h-5 w-5" />
                  CAPA Context
                </CardTitle>
              </CardHeader>
              <CardContent className="grid gap-4 md:grid-cols-2">
                <FormField
                  control={control}
                  name="title"
                  rules={{ required: 'Title is required' }}
                  render={({ field }) => (
                    <FormItem className="md:col-span-2">
                      <FormLabel>Title</FormLabel>
                      <FormControl>
                        <Input {...field} placeholder="Summarize the CAPA focus" />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={control}
                  name="type"
                  rules={{ required: 'Type is required' }}
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Type</FormLabel>
                      <Select onValueChange={field.onChange} value={field.value}>
                        <FormControl>
                          <SelectTrigger className="w-full">
                            <SelectValue placeholder="Select type" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          <SelectItem value="corrective">Corrective</SelectItem>
                          <SelectItem value="preventive">Preventive</SelectItem>
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={control}
                  name="priority"
                  rules={{ required: 'Priority is required' }}
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Priority</FormLabel>
                      <Select onValueChange={field.onChange} value={field.value}>
                        <FormControl>
                          <SelectTrigger className="w-full">
                            <SelectValue placeholder="Select priority" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          <SelectItem value="low">Low</SelectItem>
                          <SelectItem value="medium">Medium</SelectItem>
                          <SelectItem value="high">High</SelectItem>
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={control}
                  name="assignedTo"
                  rules={{ required: 'Owner is required' }}
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Owner / Responsible Team</FormLabel>
                      <FormControl>
                        <Input {...field} placeholder="e.g. Quality Systems" />
                      </FormControl>
                      <FormDescription>Name a single accountable owner for the CAPA.</FormDescription>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={control}
                  name="dueDate"
                  rules={{ required: 'Due date is required' }}
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Target Due Date</FormLabel>
                      <FormControl>
                        <Input type="date" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={control}
                  name="effectivenessDueDate"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Effectiveness Check</FormLabel>
                      <FormControl>
                        <Input type="date" {...field} />
                      </FormControl>
                      <FormDescription>Optional date to verify CAPA effectiveness post implementation.</FormDescription>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={control}
                  name="description"
                  rules={{ required: 'Description is required' }}
                  render={({ field }) => (
                    <FormItem className="md:col-span-2">
                      <FormLabel>Problem Statement</FormLabel>
                      <FormControl>
                        <Textarea {...field} className="min-h-32" placeholder="Describe the non-conformance or improvement opportunity driving this CAPA." />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </CardContent>
            </Card>
          )}

          {activeStep === 'analysis' && (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Lightbulb className="h-5 w-5" />
                  Root Cause & Impact
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <FormField
                  control={control}
                  name="rootCause"
                  rules={{ required: 'Root cause summary is required' }}
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Root Cause Summary</FormLabel>
                      <FormControl>
                        <Textarea {...field} className="min-h-24" placeholder="Summarize the confirmed primary root cause and key contributing factors." />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={control}
                  name="correctivePlan"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Corrective Plan Summary</FormLabel>
                      <FormControl>
                        <Textarea {...field} className="min-h-20" placeholder="Outline corrective actions that remove the detected non-conformance." />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={control}
                  name="preventivePlan"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Preventive Plan Summary</FormLabel>
                      <FormControl>
                        <Textarea {...field} className="min-h-20" placeholder="Outline preventive measures that avoid recurrence." />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={control}
                  name="verificationPlan"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Verification Approach</FormLabel>
                      <FormControl>
                        <Textarea {...field} className="min-h-20" placeholder="Describe how success will be measured and verified." />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={control}
                  name="riskAssessment"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Risk Assessment Notes</FormLabel>
                      <FormControl>
                        <Textarea {...field} className="min-h-20" placeholder="Capture risk rating, rationale, and any required notifications." />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={control}
                  name="linkedSystems"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Linked Systems / Documents</FormLabel>
                      <FormControl>
                        <Textarea {...field} className="min-h-20" placeholder="Reference impacted SOPs, batch records, or systems requiring updates." />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={control}
                  name="relatedDeviations"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Related Deviations</FormLabel>
                      <FormDescription>Select any deviations that triggered or connect to this CAPA.</FormDescription>
                      <div className="mt-3 grid gap-2 sm:grid-cols-2">
                        {(deviations || []).map(deviation => {
                          const checked = field.value?.includes(deviation.id) ?? false
                          return (
                            <label key={deviation.id} className="flex items-start gap-3 rounded-md border p-3 text-sm transition hover:bg-muted/40">
                              <Checkbox
                                checked={checked}
                                onCheckedChange={value => {
                                  const current = field.value || []
                                  if (value) {
                                    field.onChange([...current, deviation.id])
                                  } else {
                                    field.onChange(current.filter(id => id !== deviation.id))
                                  }
                                }}
                                className="mt-1"
                              />
                              <div>
                                <div className="font-medium leading-tight">{deviation.id} — {deviation.title}</div>
                                <div className="text-xs text-muted-foreground">Batch {deviation.batchId} • Severity {deviation.severity}</div>
                              </div>
                            </label>
                          )
                        })}
                        {(deviations || []).length === 0 && (
                          <div className="rounded-md border border-dashed p-3 text-xs text-muted-foreground">
                            No deviations available. You can link them later from the CAPA record.
                          </div>
                        )}
                      </div>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </CardContent>
            </Card>
          )}

          {activeStep === 'plan' && (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <ArrowRight className="h-5 w-5" />
                  Action Plan
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                {fields.map((fieldItem, index) => (
                  <div key={fieldItem.id} className="rounded-lg border p-4 space-y-3">
                    <div className="flex items-center justify-between">
                      <Badge variant="outline">Action {index + 1}</Badge>
                      {fields.length > 1 && (
                        <Button
                          type="button"
                          variant="ghost"
                          size="sm"
                          onClick={() => remove(index)}
                        >
                          Remove
                        </Button>
                      )}
                    </div>
                    <FormField
                      control={control}
                      name={`actions.${index}.description`}
                      rules={{ required: 'Description is required' }}
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Description</FormLabel>
                          <FormControl>
                            <Textarea {...field} className="min-h-20" placeholder="Describe the action to execute." />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <div className="grid gap-4 md:grid-cols-2">
                      <FormField
                        control={control}
                        name={`actions.${index}.responsible`}
                        rules={{ required: 'Responsible owner is required' }}
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Responsible Owner</FormLabel>
                            <FormControl>
                              <Input {...field} placeholder="e.g. Engineering" />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                      <FormField
                        control={control}
                        name={`actions.${index}.dueDate`}
                        rules={{ required: 'Due date is required' }}
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Due Date</FormLabel>
                            <FormControl>
                              <Input type="date" {...field} />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                    </div>
                  </div>
                ))}

                <Button
                  type="button"
                  variant="outline"
                  onClick={() => append({ description: '', responsible: '', dueDate: '' })}
                >
                  Add Action
                </Button>
              </CardContent>
            </Card>
          )}

          {activeStep === 'review' && (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Signature className="h-5 w-5" />
                  Review & Approval
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-5">
                <div className="space-y-3">
                  <h3 className="text-lg font-semibold">Summary</h3>
                  <div className="grid gap-4 md:grid-cols-2">
                    <div className="space-y-2">
                      <div className="text-xs uppercase text-muted-foreground">Title</div>
                      <div className="font-medium leading-tight">{watchedValues.title || '—'}</div>
                    </div>
                    <div className="space-y-2">
                      <div className="text-xs uppercase text-muted-foreground">Owner</div>
                      <div className="font-medium leading-tight">{watchedValues.assignedTo || '—'}</div>
                    </div>
                    <div className="space-y-2">
                      <div className="text-xs uppercase text-muted-foreground">Type / Priority</div>
                      <div className="font-medium leading-tight">{watchedValues.type} • {watchedValues.priority}</div>
                    </div>
                    <div className="space-y-2">
                      <div className="text-xs uppercase text-muted-foreground">Due Dates</div>
                      <div className="text-sm">CAPA: {watchedValues.dueDate || '—'}<br />Effectiveness: {watchedValues.effectivenessDueDate || '—'}</div>
                    </div>
                  </div>
                  <div>
                    <div className="text-xs uppercase text-muted-foreground">Problem Statement</div>
                    <p className="text-sm leading-relaxed mt-1 whitespace-pre-wrap">{watchedValues.description || '—'}</p>
                  </div>
                  <div className="grid gap-4 md:grid-cols-2">
                    <div>
                      <div className="text-xs uppercase text-muted-foreground">Root Cause</div>
                      <p className="text-sm leading-relaxed mt-1 whitespace-pre-wrap">{watchedValues.rootCause || '—'}</p>
                    </div>
                    <div>
                      <div className="text-xs uppercase text-muted-foreground">Corrective Plan</div>
                      <p className="text-sm leading-relaxed mt-1 whitespace-pre-wrap">{watchedValues.correctivePlan || '—'}</p>
                    </div>
                    <div>
                      <div className="text-xs uppercase text-muted-foreground">Preventive Plan</div>
                      <p className="text-sm leading-relaxed mt-1 whitespace-pre-wrap">{watchedValues.preventivePlan || '—'}</p>
                    </div>
                    <div>
                      <div className="text-xs uppercase text-muted-foreground">Verification Strategy</div>
                      <p className="text-sm leading-relaxed mt-1 whitespace-pre-wrap">{watchedValues.verificationPlan || '—'}</p>
                    </div>
                  </div>
                  <div>
                    <div className="text-xs uppercase text-muted-foreground">Risk Assessment</div>
                    <p className="text-sm leading-relaxed mt-1 whitespace-pre-wrap">{watchedValues.riskAssessment || '—'}</p>
                  </div>
                  <div>
                    <div className="text-xs uppercase text-muted-foreground">Linked Systems / Docs</div>
                    <p className="text-sm leading-relaxed mt-1 whitespace-pre-wrap">{watchedValues.linkedSystems || '—'}</p>
                  </div>
                  <div>
                    <div className="text-xs uppercase text-muted-foreground mb-2">Related Deviations</div>
                    <div className="flex flex-wrap gap-2">
                      {watchedValues.relatedDeviations?.length ? (
                        watchedValues.relatedDeviations.map(id => (
                          <Badge key={id} variant="outline">{id}</Badge>
                        ))
                      ) : (
                        <span className="text-sm text-muted-foreground">None linked</span>
                      )}
                    </div>
                  </div>
                </div>

                <div className="space-y-3">
                  <h3 className="text-lg font-semibold">Action Plan</h3>
                  {watchedValues.actions.map((action, index) => (
                    <div key={`summary-${index}`} className="rounded-lg border p-4 text-sm">
                      <div className="flex items-center justify-between mb-2">
                        <span className="font-medium">Action {index + 1}</span>
                        <Badge variant="outline">Due {action.dueDate || '—'}</Badge>
                      </div>
                      <div className="text-muted-foreground leading-relaxed whitespace-pre-wrap">{action.description || '—'}</div>
                      <div className="mt-2 text-xs text-muted-foreground uppercase">Owner: {action.responsible || '—'}</div>
                    </div>
                  ))}
                </div>

                <div className="flex flex-wrap gap-3 justify-end">
                  <ESignaturePrompt
                    trigger={<Button disabled={isCreating}>Sign & Create CAPA</Button>}
                    title="Electronic Signature Required"
                    statement={`Approve creation of CAPA ${watchedValues.title || ''}`}
                    demoCredentials={demoCredentials}
                    onConfirm={handleSignature}
                  />
                  <Button variant="outline" onClick={() => setActiveStep('context')} disabled={isCreating}>
                    Edit Details
                  </Button>
                </div>
              </CardContent>
            </Card>
          )}

          <div className="flex flex-wrap justify-between gap-2">
            <Button type="button" variant="outline" onClick={() => goToStep('back')} disabled={activeStep === 'context' || isCreating}>
              <ArrowLeft className="h-4 w-4 mr-2" />
              Back
            </Button>
            {activeStep !== 'review' && (
              <Button type="button" onClick={() => goToStep('next')} disabled={isCreating}>
                Next
                <ArrowRight className="h-4 w-4 ml-2" />
              </Button>
            )}
          </div>
        </form>
      </Form>
    </div>
  )
}

export default CapaCreateWizard
