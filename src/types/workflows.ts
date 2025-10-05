import type {
  CAPAPriority,
  CAPAType,
  ChangeControlStatus,
  DeviationSeverity,
  ESignatureRecord
} from '@/types/quality'

export type WorkflowStepStatus = 'pending' | 'active' | 'complete'

export interface WorkflowStepState {
  id: string
  title: string
  description: string
  status: WorkflowStepStatus
  requiresSignature?: boolean
  signature?: ESignatureRecord
  completedAt?: Date
}

export interface DeviationDraftDetails {
  batchId: string
  title: string
  severity: DeviationSeverity
  detectionSource: 'manual' | 'digital-twin' | 'lab' | 'ai'
  occurredAt?: Date | null
}

export interface DeviationDraftMetadata {
  description: string
  reportedBy: string
  assignedTo: string
  impactedMaterials?: string
  containmentActions?: string
  notes?: string
  aiSummary?: string
}

export interface DeviationDraftApprovals {
  qaReviewer?: string
  justification?: string
  signature?: ESignatureRecord
}

export interface DeviationDraftData {
  details: DeviationDraftDetails
  metadata: DeviationDraftMetadata
  approvals: DeviationDraftApprovals
}

export interface CapaDraftBasics {
  title: string
  description: string
  type: CAPAType
  priority: CAPAPriority
  dueDate?: Date | null
  owner: string
  relatedDeviations: string[]
}

export interface CapaDraftAction {
  id: string
  description: string
  responsible: string
  dueDate?: Date | null
}

export interface CapaDraftMetadata {
  riskAssessment?: string
  effectivenessPlan?: string
  aiProposal?: string
}

export interface CapaDraftApprovals {
  approver?: string
  justification?: string
  signature?: ESignatureRecord
}

export interface CapaDraftData {
  basics: CapaDraftBasics
  actions: CapaDraftAction[]
  metadata: CapaDraftMetadata
  approvals: CapaDraftApprovals
}

export interface ChangeControlDraftBasics {
  title: string
  description: string
  requestedBy: string
  status: ChangeControlStatus
}

export interface ChangeControlDraftImpact {
  impactedBatches: string[]
  impactedEquipment: string[]
  riskLevel: 'low' | 'medium' | 'high'
  implementationPlan?: string
  aiImpactSummary?: string
}

export interface ChangeControlDraftApprovals {
  approver?: string
  justification?: string
  signature?: ESignatureRecord
}

export interface ChangeControlDraftData {
  basics: ChangeControlDraftBasics
  impact: ChangeControlDraftImpact
  approvals: ChangeControlDraftApprovals
}
