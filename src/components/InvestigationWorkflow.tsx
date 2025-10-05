import React from 'react'
import { useKV } from '@github/spark/hooks'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Progress } from '@/components/ui/progress'
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '@/components/ui/accordion'
import { ArrowLeft, Clock, ListChecks, NotePencil, ArrowSquareOut } from '@phosphor-icons/react'
import type {
  Deviation,
  Investigation,
  InvestigationStage,
  InvestigationTaskStatus
} from '@/types/quality'
import { calculateInvestigationProgress, cycleTaskStatus, deriveInvestigationStatus } from '@/utils/investigation'
import { useAuditLogger } from '@/hooks/use-audit'
import { useQualityNavigation } from '@/hooks/use-quality-navigation'

interface InvestigationWorkflowProps {
  id: string
  onBack: () => void
}

const formatDate = (date?: Date | string) => {
  if (!date) return '—'
  const value = date instanceof Date ? date : new Date(date)
  if (Number.isNaN(value.getTime())) return '—'
  return value.toLocaleDateString()
}

const formatDateTime = (date?: Date | string) => {
  if (!date) return '—'
  const value = date instanceof Date ? date : new Date(date)
  if (Number.isNaN(value.getTime())) return '—'
  return `${value.toLocaleDateString()} ${value.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}`
}

const formatStatus = (status: Investigation['status']) => {
  const labels: Record<Investigation['status'], string> = {
    triage: 'Triage',
    analysis: 'Analysis',
    'root-cause': 'Root Cause',
    'corrective-actions': 'Corrective Actions',
    effectiveness: 'Effectiveness',
    closed: 'Closed'
  }
  return labels[status] ?? status
}

const getRiskBadgeClass = (risk: Investigation['riskLevel']) => {
  switch (risk) {
    case 'high':
      return 'bg-rose-100 text-rose-800'
    case 'medium':
      return 'bg-amber-100 text-amber-800'
    default:
      return 'bg-emerald-100 text-emerald-800'
  }
}

const getTaskStatusBadge = (status: InvestigationTaskStatus) => {
  switch (status) {
    case 'in-progress':
      return 'bg-blue-100 text-blue-800'
    case 'complete':
      return 'bg-emerald-100 text-emerald-800'
    default:
      return 'bg-slate-100 text-slate-800'
  }
}

const stageProgress = (stage: InvestigationStage) => {
  const total = stage.tasks.length
  if (total === 0) return 0
  const done = stage.tasks.filter(task => task.status === 'complete').length
  return Math.round((done / total) * 100)
}

export function InvestigationWorkflow({ id, onBack }: InvestigationWorkflowProps) {
  const [investigations, setInvestigations] = useKV<Investigation[]>('investigations')
  const [deviations] = useKV<Deviation[]>('deviations')
  const navigateQuality = useQualityNavigation()
  const { log } = useAuditLogger()

  const investigation = (investigations || []).find(inv => inv.id === id || inv.deviationId === id)
  const relatedDeviation = investigation
    ? (deviations || []).find(dev => dev.id === investigation.deviationId)
    : undefined

  if (!investigation) {
    return (
      <div className="p-6 space-y-4">
        <Button variant="ghost" size="sm" onClick={onBack}>
          <ArrowLeft className="h-4 w-4 mr-2" />
          Back
        </Button>
        <Card>
          <CardHeader>
            <CardTitle>Investigation not found</CardTitle>
          </CardHeader>
          <CardContent>
            Unable to locate an investigation workflow with id {id}.
          </CardContent>
        </Card>
      </div>
    )
  }

  const { totalTasks, completedTasks, inProgressTasks, progress } = calculateInvestigationProgress(investigation)

  const handleTaskStatusCycle = (stageId: string, taskId: string) => {
    let resultingStatus = investigation.status
    let resultingTaskStatus: InvestigationTaskStatus | undefined
    setInvestigations(current => {
      const list = current || []
      return list.map(inv => {
        if (inv.deviationId !== investigation.deviationId) return inv
        const updatedStages = inv.stages.map(stage => {
          if (stage.id !== stageId) return stage
          return {
            ...stage,
            tasks: stage.tasks.map(task => {
              if (task.id !== taskId) return task
              const next = cycleTaskStatus(task.status)
              resultingTaskStatus = next
              return {
                ...task,
                status: next,
                completedOn: next === 'complete' ? new Date() : next === 'pending' ? undefined : task.completedOn
              }
            })
          }
        })
        resultingStatus = deriveInvestigationStatus(updatedStages, inv.status)
        return {
          ...inv,
          stages: updatedStages,
          status: resultingStatus
        }
      })
    })

    if (resultingTaskStatus) {
      log('Investigation Task Updated', 'deviation', `Task ${taskId} -> ${resultingTaskStatus}`, { recordId: investigation.deviationId })
    }
  }

  return (
    <div className="p-6 space-y-6 overflow-auto h-full">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
        <div>
          <h1 className="text-3xl font-bold">Investigation Workflow</h1>
          <p className="text-muted-foreground">
            {investigation.deviationId} — {relatedDeviation?.title ?? investigation.title}
          </p>
          {relatedDeviation && (
            <Button
              variant="link"
              className="px-0"
              onClick={() => navigateQuality(`deviation/${relatedDeviation.id}`)}
            >
              <ArrowSquareOut className="h-4 w-4 mr-1" />
              View deviation record
            </Button>
          )}
        </div>
        <Button variant="ghost" onClick={onBack}>
          <ArrowLeft className="h-4 w-4 mr-2" />
          Back to Quality
        </Button>
      </div>

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        <Card>
          <CardHeader>
            <CardTitle>Overall Progress</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <Progress value={progress} />
            <div className="text-sm text-muted-foreground">
              {completedTasks}/{totalTasks} tasks complete
              {inProgressTasks > 0 ? ` • ${inProgressTasks} in progress` : ''}
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle>Current Phase</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            <div className="flex flex-wrap items-center gap-2">
              <Badge>{formatStatus(investigation.status)}</Badge>
              <Badge className={getRiskBadgeClass(investigation.riskLevel)}>Risk: {investigation.riskLevel}</Badge>
            </div>
            <div className="text-sm text-muted-foreground">
              Lead: {investigation.lead || relatedDeviation?.assignedTo || 'Unassigned'}
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle>Key Dates</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2 text-sm">
            <div>Started: {formatDate(investigation.startedOn)}</div>
            <div>Target completion: {formatDate(investigation.targetCompletion)}</div>
            {relatedDeviation?.reportedDate && (
              <div>Deviation reported: {formatDate(relatedDeviation.reportedDate)}</div>
            )}
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle>Effectiveness Review</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2 text-sm">
            {investigation.effectivenessReview ? (
              <>
                <div>Due: {formatDate(investigation.effectivenessReview.dueDate)}</div>
                <div>Status: {investigation.effectivenessReview.status}</div>
                {investigation.effectivenessReview.notes && (
                  <div className="text-muted-foreground">{investigation.effectivenessReview.notes}</div>
                )}
              </>
            ) : (
              <div className="text-muted-foreground">Schedule effectiveness monitoring once CAPA actions are closed.</div>
            )}
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Clock className="h-4 w-4" />
            Timeline
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          {investigation.timeline.length === 0 ? (
            <div className="text-sm text-muted-foreground">No timeline entries recorded yet.</div>
          ) : (
            investigation.timeline
              .slice()
              .sort((a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime())
              .map(entry => (
                <div key={entry.id} className="flex flex-col gap-1 border-l-2 border-primary/40 pl-4">
                  <div className="text-xs text-muted-foreground">{formatDateTime(entry.timestamp)} • {entry.actor}</div>
                  <div className="text-sm font-medium">{entry.summary}</div>
                  {entry.details && (
                    <div className="text-sm text-muted-foreground">{entry.details}</div>
                  )}
                </div>
              ))
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <ListChecks className="h-4 w-4" />
            Workflow Stages
          </CardTitle>
        </CardHeader>
        <CardContent>
          <Accordion type="multiple" defaultValue={investigation.stages.map(stage => stage.id)}>
            {investigation.stages.map(stage => (
              <AccordionItem key={stage.id} value={stage.id}>
                <AccordionTrigger>
                  <div className="flex flex-col items-start gap-1">
                    <div className="font-medium">{stage.title}</div>
                    <div className="text-xs text-muted-foreground">{stage.description}</div>
                    <div className="flex items-center gap-3 text-xs text-muted-foreground">
                      <span>Progress {stageProgress(stage)}%</span>
                      <Progress className="w-40" value={stageProgress(stage)} />
                    </div>
                  </div>
                </AccordionTrigger>
                <AccordionContent>
                  <div className="space-y-3">
                    {stage.tasks.map(task => (
                      <div key={task.id} className="p-3 border rounded-md space-y-2 md:flex md:items-start md:justify-between md:space-y-0">
                        <div>
                          <div className="font-medium">{task.title}</div>
                          <div className="text-xs text-muted-foreground">
                            Owner: {task.owner} • Due {formatDate(task.dueDate)}
                          </div>
                          <p className="text-sm text-muted-foreground mt-1">{task.description}</p>
                        </div>
                        <div className="flex items-center gap-2">
                          <Badge className={getTaskStatusBadge(task.status)}>{task.status}</Badge>
                          <Button variant="outline" size="sm" onClick={() => handleTaskStatusCycle(stage.id, task.id)}>
                            <NotePencil className="h-4 w-4 mr-2" />
                            Advance
                          </Button>
                        </div>
                      </div>
                    ))}
                  </div>
                </AccordionContent>
              </AccordionItem>
            ))}
          </Accordion>
        </CardContent>
      </Card>

      {investigation.relatedCapas && investigation.relatedCapas.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Related CAPA Records</CardTitle>
          </CardHeader>
          <CardContent className="flex flex-wrap gap-2">
            {investigation.relatedCapas.map(capaId => (
              <Button
                key={capaId}
                variant="outline"
                size="sm"
                onClick={() => navigateQuality(`capa/${capaId}/review`)}
              >
                {capaId}
              </Button>
            ))}
          </CardContent>
        </Card>
      )}
    </div>
  )
}
