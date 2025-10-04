export type DeviationSeverity = "low" | "medium" | "high" | "critical"
export type DeviationStatus = "open" | "investigating" | "resolved" | "closed"

export interface EffectivenessCheck {
  dueDate: Date
  status: "pending" | "complete"
  result?: string
}

export interface Deviation {
  id: string
  title: string
  description: string
  severity: DeviationSeverity
  status: DeviationStatus
  batchId: string
  reportedBy: string
  reportedDate: Date
  assignedTo?: string
  rootCause?: string
  correctiveActions?: string[]
  effectivenessCheck?: EffectivenessCheck
}

export type CAPAType = "corrective" | "preventive"
export type CAPAPriority = "low" | "medium" | "high"
export type CAPAStatus = "draft" | "approved" | "implementing" | "complete"

export interface CapaAction {
  id: string
  description: string
  responsible: string
  dueDate: Date
  status: "pending" | "complete"
}

export interface CAPA {
  id: string
  title: string
  description: string
  type: CAPAType
  priority: CAPAPriority
  status: CAPAStatus
  dueDate: Date
  assignedTo: string
  relatedDeviations: string[]
  actions: CapaAction[]
  effectivenessCheck?: EffectivenessCheck
}

export type InvestigationTaskStatus = "pending" | "in-progress" | "complete"

export interface InvestigationTask {
  id: string
  title: string
  description: string
  owner: string
  dueDate: Date
  status: InvestigationTaskStatus
  notes?: string
  completedOn?: Date
  attachments?: string[]
}

export interface InvestigationStage {
  id: string
  title: string
  description: string
  gate: "containment" | "root-cause" | "corrective" | "verification" | "effectiveness"
  tasks: InvestigationTask[]
}

export type InvestigationStatus =
  | "triage"
  | "analysis"
  | "root-cause"
  | "corrective-actions"
  | "effectiveness"
  | "closed"

export interface InvestigationTimelineEvent {
  id: string
  timestamp: Date
  summary: string
  actor: string
  details?: string
}

export interface Investigation {
  id: string
  deviationId: string
  title: string
  severity: DeviationSeverity
  lead: string
  status: InvestigationStatus
  riskLevel: "low" | "medium" | "high"
  startedOn: Date
  targetCompletion: Date
  relatedCapas?: string[]
  timeline: InvestigationTimelineEvent[]
  stages: InvestigationStage[]
  effectivenessReview?: {
    dueDate: Date
    status: "pending" | "scheduled" | "complete"
    notes?: string
  }
}

export type ChangeControlStatus =
  | "draft"
  | "in-review"
  | "approved"
  | "implemented"
  | "closed"

export interface ChangeControl {
  id: string
  title: string
  description: string
  status: ChangeControlStatus
  requestedBy: string
  requestedDate: Date
  impactedBatches: string[]
  impactedEquipment: string[]
  riskLevel: "low" | "medium" | "high"
}
