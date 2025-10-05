export type AlertSeverity = 'info' | 'success' | 'warning' | 'error'

export type AlertSource =
  | 'digital-twin'
  | 'quality'
  | 'equipment'
  | 'batch'
  | 'system'
  | 'manual'

export interface AlertRecord {
  id: string
  title: string
  description: string
  severity: AlertSeverity
  source: AlertSource
  timestamp: string
  relatedRecordId?: string
  context?: Record<string, unknown>
}
