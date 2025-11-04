import type { AuditEvent } from '@/hooks/use-audit'

export type AuditExportFormat = 'csv' | 'json'

const DEFAULT_FILE_PREFIX = 'audit-trail'

function buildFileName(suffix: string, extension: string) {
  const date = new Date().toISOString().split('T')[0]
  return `${DEFAULT_FILE_PREFIX}-${suffix}-${date}.${extension}`
}

export function exportAuditEventsCSV(events: AuditEvent[], options?: { fileName?: string; includeHeader?: boolean }) {
  if (!events || events.length === 0) {
    throw new Error('No audit events available to export')
  }

  const headers = [
    'ID',
    'Timestamp',
    'User ID',
    'User Role',
    'Action',
    'Module',
    'Details',
    'Record ID',
    'IP Address',
    'Session ID',
    'Outcome',
    'Digital Signature',
  ]

  const esc = (value: unknown) => {
    if (value === null || value === undefined) return ''
    const str = String(value)
    if (/[",\n]/.test(str)) {
      return `"${str.replace(/"/g, '""')}"`
    }
    return str
  }

  const rows = events.map((event) => [
    event.id,
    event.timestamp instanceof Date ? event.timestamp.toISOString() : new Date(event.timestamp).toISOString(),
    event.userId,
    event.userRole,
    event.action,
    event.module,
    event.details,
    event.recordId ?? '',
    event.ipAddress,
    event.sessionId,
    event.outcome,
    event.digitalSignature ?? '',
  ].map(esc).join(','))

  const includeHeader = options?.includeHeader !== false
  const csv = includeHeader ? [headers.join(','), ...rows].join('\n') : rows.join('\n')

  const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' })
  const url = window.URL.createObjectURL(blob)
  const link = document.createElement('a')
  link.href = url
  link.download = options?.fileName ?? buildFileName('full', 'csv')
  link.click()
  window.URL.revokeObjectURL(url)
}

// Build CSV string without triggering a download (for bundling)
export function buildAuditEventsCSVString(events: AuditEvent[], options?: { includeHeader?: boolean }): string {
  if (!events || events.length === 0) {
    throw new Error('No audit events available to export')
  }

  const headers = [
    'ID',
    'Timestamp',
    'User ID',
    'User Role',
    'Action',
    'Module',
    'Details',
    'Record ID',
    'IP Address',
    'Session ID',
    'Outcome',
    'Digital Signature',
  ]

  const esc = (value: unknown) => {
    if (value === null || value === undefined) return ''
    const str = String(value)
    if (/[",\n]/.test(str)) {
      return `"${str.replace(/"/g, '""')}"`
    }
    return str
  }

  const rows = events.map((event) => [
    event.id,
    event.timestamp instanceof Date ? event.timestamp.toISOString() : new Date(event.timestamp).toISOString(),
    event.userId,
    event.userRole,
    event.action,
    event.module,
    event.details,
    event.recordId ?? '',
    event.ipAddress,
    event.sessionId,
    event.outcome,
    event.digitalSignature ?? '',
  ].map(esc).join(','))

  const includeHeader = options?.includeHeader !== false
  return includeHeader ? [headers.join(','), ...rows].join('\n') : rows.join('\n')
}

export function exportAuditEventsJSON(events: AuditEvent[], options?: { fileName?: string }) {
  if (!events || events.length === 0) {
    throw new Error('No audit events available to export')
  }

  const payload = JSON.stringify(
    events.map((event) => ({
      ...event,
      timestamp: event.timestamp instanceof Date ? event.timestamp.toISOString() : new Date(event.timestamp).toISOString(),
    })),
    null,
    2
  )

  const blob = new Blob([payload], { type: 'application/json;charset=utf-8;' })
  const url = window.URL.createObjectURL(blob)
  const link = document.createElement('a')
  link.href = url
  link.download = options?.fileName ?? buildFileName('full', 'json')
  link.click()
  window.URL.revokeObjectURL(url)
}

// Build JSON string without triggering a download (for bundling)
export function buildAuditEventsJSONString(events: AuditEvent[]): string {
  if (!events || events.length === 0) {
    throw new Error('No audit events available to export')
  }
  return JSON.stringify(
    events.map((event) => ({
      ...event,
      timestamp: event.timestamp instanceof Date ? event.timestamp.toISOString() : new Date(event.timestamp).toISOString(),
    })),
    null,
    2
  )
}

export function tryExportAuditEvents(format: AuditExportFormat, events: AuditEvent[], options?: { fileName?: string }) {
  if (format === 'csv') {
    exportAuditEventsCSV(events, options)
  } else if (format === 'json') {
    exportAuditEventsJSON(events, options)
  } else {
    throw new Error(`Unsupported audit export format: ${format}`)
  }
}
