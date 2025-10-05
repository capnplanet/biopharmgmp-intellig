import { useEffect, useMemo, useState } from 'react'
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle } from '@/components/ui/sheet'
import { Button } from '@/components/ui/button'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Textarea } from '@/components/ui/textarea'
import { Badge } from '@/components/ui/badge'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Skeleton } from '@/components/ui/skeleton'
import { cn } from '@/lib/utils'
import { getSpark } from '@/lib/spark'
import { buildInvestigationSources, sourcesToString } from '@/data/archive'
import type { AutomationSuggestion } from '@/types/automation'
import type { CAPA, ChangeControl, Deviation } from '@/types/quality'
import type { AuditModule } from '@/hooks/use-audit'
import { Robot, Sparkle, ArrowsClockwise } from '@phosphor-icons/react'

interface QualityAssistantPanelProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  deviations: Deviation[]
  capas: CAPA[]
  changeControls: ChangeControl[]
  automationQueue: AutomationSuggestion[]
  onLog: (action: string, module: AuditModule, details: string, options?: Record<string, unknown>) => void
  initialMode?: AssistantMode
  initialRecordId?: string
}

export type AssistantMode = 'deviation' | 'capa' | 'change-control'

type AssistantResult = {
  timestamp: Date
  label: string
  output: string
  mode: AssistantMode
}

const modeLabels: Record<AssistantMode, string> = {
  deviation: 'Deviation Investigation Support',
  capa: 'CAPA Authoring Support',
  'change-control': 'Change Control Planning'
}

type ContextRecord = Deviation | CAPA | ChangeControl | undefined

type BuildContextArgs = {
  deviations: Deviation[]
  capas: CAPA[]
  changeControls: ChangeControl[]
  automationQueue: AutomationSuggestion[]
  mode: AssistantMode
  id?: string
}

type AssistantContext = {
  summary: string
  sources: string
}

const MAX_SOURCES = 5

const uniqueBy = <T,>(items: T[], key: (item: T) => string) => {
  const seen = new Set<string>()
  const result: T[] = []
  for (const item of items) {
    const k = key(item)
    if (seen.has(k)) continue
    seen.add(k)
    result.push(item)
  }
  return result
}

const buildAssistantContext = ({ deviations, capas, changeControls, automationQueue, mode, id }: BuildContextArgs): AssistantContext | undefined => {
  if (!id) return undefined
  if (mode === 'deviation') {
    const deviation = deviations.find((d) => d.id === id)
    if (!deviation) return undefined
    const sources = buildInvestigationSources(deviation.batchId).slice(0, MAX_SOURCES)
    const measurement = deviation.metadata as Record<string, unknown> | undefined
    const automation = automationQueue.find((entry) => entry.deviationId === deviation.id)
    const summary = [
      `Deviation ${deviation.id} — ${deviation.title}`,
      `Severity: ${deviation.severity.toUpperCase()} | Status: ${deviation.status}`,
      `Batch: ${deviation.batchId} | Reported: ${new Date(deviation.reportedDate).toLocaleString()}`,
      deviation.description,
      automation ? `AI Recommendation: ${automation.summary}` : undefined,
      measurement?.parameter ? `Parameter: ${String(measurement.parameter)} Current: ${measurement?.currentValue ?? '—'}` : undefined,
    ].filter(Boolean).join('\n')

    return {
      summary,
      sources: sourcesToString(sources)
    }
  }

  if (mode === 'capa') {
    const capa = capas.find((c) => c.id === id)
    if (!capa) return undefined
    const relatedDeviations = capa.relatedDeviations
      .map((devId) => deviations.find((dev) => dev.id === devId))
      .filter(Boolean) as Deviation[]

    const sources = uniqueBy(
      relatedDeviations.flatMap((dev) => buildInvestigationSources(dev.batchId)),
      (source) => source.id
    ).slice(0, MAX_SOURCES)

    const actionsSummary = capa.actions.map((action, index) => `${index + 1}. ${action.description} — ${action.responsible} (due ${action.dueDate.toLocaleDateString()})`).join('\n')

    const summary = [
      `CAPA ${capa.id} — ${capa.title}`,
      `Type: ${capa.type.toUpperCase()} | Priority: ${capa.priority.toUpperCase()} | Status: ${capa.status}`,
      `Owner: ${capa.assignedTo} | Due: ${capa.dueDate.toLocaleDateString()}`,
      capa.description,
      relatedDeviations.length ? `Related Deviations: ${relatedDeviations.map((dev) => dev.id).join(', ')}` : undefined,
      actionsSummary ? `Current Actions:\n${actionsSummary}` : undefined,
    ].filter(Boolean).join('\n')

    return {
      summary,
      sources: sources.length > 0 ? sourcesToString(sources) : 'No direct batch history available.'
    }
  }

  const changeControl = changeControls.find((cc) => cc.id === id)
  if (!changeControl) return undefined
  const impactedBatches = changeControl.impactedBatches.map((batchId) => buildInvestigationSources(batchId)).flat()
  const sources = uniqueBy(impactedBatches, (source) => source.id).slice(0, MAX_SOURCES)
  const summary = [
    `Change Control ${changeControl.id} — ${changeControl.title}`,
    `Risk: ${changeControl.riskLevel.toUpperCase()} | Status: ${changeControl.status}`,
    `Requested By ${changeControl.requestedBy} on ${changeControl.requestedDate.toLocaleDateString()}`,
    changeControl.description,
    changeControl.impactAssessment ? `Impact Assessment: ${changeControl.impactAssessment}` : undefined,
    changeControl.implementationPlan ? `Implementation Plan: ${changeControl.implementationPlan}` : undefined,
    changeControl.validationPlan ? `Validation Plan: ${changeControl.validationPlan}` : undefined,
    changeControl.impactedEquipment.length ? `Equipment: ${changeControl.impactedEquipment.join(', ')}` : undefined,
    changeControl.impactedBatches.length ? `Batches: ${changeControl.impactedBatches.join(', ')}` : undefined,
  ].filter(Boolean).join('\n')

  return {
    summary,
    sources: sources.length > 0 ? sourcesToString(sources) : 'No recent archive entries found for impacted batches.'
  }
}

export function QualityAssistantPanel({
  open,
  onOpenChange,
  deviations,
  capas,
  changeControls,
  automationQueue,
  onLog,
  initialMode,
  initialRecordId
}: QualityAssistantPanelProps) {
  const [mode, setMode] = useState<AssistantMode>('deviation')
  const [selectedId, setSelectedId] = useState<string | undefined>(undefined)
  const [result, setResult] = useState<AssistantResult | undefined>(undefined)
  const [generating, setGenerating] = useState(false)
  const [error, setError] = useState<string | undefined>(undefined)

  const options = useMemo(() => {
    switch (mode) {
      case 'deviation':
        return deviations.map((deviation) => ({ value: deviation.id, label: `${deviation.id} — ${deviation.title}` }))
      case 'capa':
        return capas.map((capa) => ({ value: capa.id, label: `${capa.id} — ${capa.title}` }))
      case 'change-control':
        return changeControls.map((cc) => ({ value: cc.id, label: `${cc.id} — ${cc.title}` }))
    }
  }, [mode, deviations, capas, changeControls])

  useEffect(() => {
    if (!open) {
      setResult(undefined)
      setError(undefined)
      return
    }
    if (initialMode && initialMode !== mode) {
      setMode(initialMode)
    }
  }, [open, initialMode, mode])

  useEffect(() => {
    if (!open) return
    const preferredId = initialRecordId && options.some(option => option.value === initialRecordId)
      ? initialRecordId
      : options[0]?.value
    if (preferredId !== selectedId) {
      setSelectedId(preferredId)
    }
  }, [open, options, initialRecordId, selectedId])

  const handleGenerate = async () => {
    if (!selectedId) {
      setError('Select a record to analyze')
      return
    }

    const context = buildAssistantContext({
      deviations,
      capas,
      changeControls,
      automationQueue,
      mode,
      id: selectedId
    })

    if (!context) {
      setError('Unable to construct context for selection')
      return
    }

    try {
      setGenerating(true)
      setError(undefined)
      const spark = getSpark()
      if (!spark?.llm || !spark.llmPrompt) {
        throw new Error('AI assistant unavailable')
      }
      const prompt = spark.llmPrompt`
        You are a pharmaceutical quality management co-pilot following GMP and 21 CFR Part 11 expectations.
        Provide guidance for the selected workflow with actionable, compliance-ready recommendations.

        CONTEXT SUMMARY:
        ${context.summary}

        DIGITAL TWIN & ARCHIVE SOURCES:
        ${context.sources}

        REQUIREMENTS:
        - Provide structured response with headers for Immediate Actions, Long-Term Strategy, Documentation, and Notifications.
        - Reference relevant sources inline like [S1] when citing archive context.
        - Highlight any e-signature or approval checkpoints needed.
        - Recommend how generative automation can help populate records (templates, data pulls, etc.).
      `
      const output = await spark.llm(prompt, 'gpt-4o')
      const data: AssistantResult = {
        timestamp: new Date(),
        label: `${modeLabels[mode]} for ${selectedId}`,
        output,
        mode
      }
      setResult(data)
      onLog('AI Quality Assistant', 'ai', `${modeLabels[mode]} generated for ${selectedId}`, {
        recordId: selectedId,
        mode,
        generatedAt: data.timestamp.toISOString()
      })
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Unknown error'
      setError(message)
      onLog('AI Quality Assistant Error', 'ai', `Failed to generate assistant output for ${selectedId}: ${message}`, {
        recordId: selectedId,
        mode,
        outcome: 'failure'
      })
    } finally {
      setGenerating(false)
    }
  }

  const renderSelectedSummary = () => {
    if (!selectedId) return null
    let record: ContextRecord
    let badgeText: string

    if (mode === 'deviation') {
      record = deviations.find((item) => item.id === selectedId)
      badgeText = 'Deviation'
    } else if (mode === 'capa') {
      record = capas.find((item) => item.id === selectedId)
      badgeText = 'CAPA'
    } else {
      record = changeControls.find((item) => item.id === selectedId)
      badgeText = 'Change Control'
    }

    if (!record) return null

    const description = 'description' in record ? record.description : ''

    return (
      <div className="rounded-lg border bg-muted/40 p-4 space-y-2">
        <div className="flex items-center gap-3">
          <Badge>{badgeText}</Badge>
          <span className="font-medium">{record.title}</span>
        </div>
        <p className="text-sm text-muted-foreground whitespace-pre-wrap">{description}</p>
      </div>
    )
  }

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="right" className="w-full sm:max-w-3xl">
        <SheetHeader>
          <SheetTitle className="flex items-center gap-2">
            <Robot className="h-5 w-5" />
            Quality AI Assistant
          </SheetTitle>
          <SheetDescription>
            Generate digital-twin-informed guidance for deviations, CAPAs, and change controls.
          </SheetDescription>
        </SheetHeader>

        <div className="mt-6 space-y-4">
          <div className="grid gap-3 sm:grid-cols-2">
            <div className="space-y-1">
              <label className="text-xs uppercase text-muted-foreground/80">Workflow</label>
              <Select value={mode} onValueChange={(value: AssistantMode) => setMode(value)}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="deviation">Deviation</SelectItem>
                  <SelectItem value="capa">CAPA</SelectItem>
                  <SelectItem value="change-control">Change Control</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1">
              <label className="text-xs uppercase text-muted-foreground/80">Record</label>
              <Select value={selectedId} onValueChange={(value) => setSelectedId(value)}>
                <SelectTrigger>
                  <SelectValue placeholder={`Select a ${mode.replace('-', ' ')}`} />
                </SelectTrigger>
                <SelectContent>
                  {options.length === 0 ? (
                    <SelectItem value="" disabled>
                      No records available
                    </SelectItem>
                  ) : (
                    options.map((option) => (
                      <SelectItem key={option.value} value={option.value}>
                        {option.label}
                      </SelectItem>
                    ))
                  )}
                </SelectContent>
              </Select>
            </div>
          </div>

          {renderSelectedSummary()}

          <div className="flex items-center gap-2">
            <Button onClick={handleGenerate} disabled={generating || !selectedId} className="flex items-center gap-2">
              {generating ? <ArrowsClockwise className="h-4 w-4 animate-spin" /> : <Sparkle className="h-4 w-4" />}
              {generating ? 'Generating recommendations…' : 'Generate Recommendations'}
            </Button>
            {result && (
              <span className="text-xs text-muted-foreground">
                Generated {result.timestamp.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
              </span>
            )}
          </div>

          {error && (
            <div className="rounded-md border border-destructive/50 bg-destructive/10 p-3 text-sm text-destructive">
              {error}
            </div>
          )}

          <ScrollArea className="h-72 rounded-md border">
            {generating ? (
              <div className="space-y-3 p-4">
                <Skeleton className="h-4 w-3/4" />
                <Skeleton className="h-4 w-2/3" />
                <Skeleton className="h-4 w-5/6" />
                <Skeleton className="h-4 w-1/2" />
              </div>
            ) : result ? (
              <Textarea
                readOnly
                value={result.output}
                className={cn('min-h-full h-full border-none resize-none bg-transparent focus-visible:ring-0')}
              />
            ) : (
              <div className="p-6 text-sm text-muted-foreground">
                Use the assistant to create AI-driven guidance for your selected workflow. Digital twin data and archive context
                will automatically feed the recommendations.
              </div>
            )}
          </ScrollArea>
        </div>
      </SheetContent>
    </Sheet>
  )
}

export default QualityAssistantPanel
