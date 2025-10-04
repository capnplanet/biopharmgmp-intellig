export type AutomationTrigger = 'OOS' | 'OOT'
export type AutomationSuggestionStatus = 'pending' | 'accepted' | 'dismissed'

export interface AutomationSuggestion {
  id: string
  deviationId: string
  trigger: AutomationTrigger
  parameter: 'temperature' | 'pressure' | 'pH' | 'volume'
  summary: string
  actions: string[]
  assignee: string
  status: AutomationSuggestionStatus
  createdAt: string
  resolvedAt?: string
  aiConfidence: 'low' | 'medium' | 'high'
  decision?: 'accepted' | 'dismissed'
  decisionBy?: string
  decisionReason?: string
  decisionSignatureId?: string
  measurement?: {
    currentValue: number
    target: number
    bounds?: {
      min: number
      max: number
    }
  }
  deviationClosedAt?: string
}
