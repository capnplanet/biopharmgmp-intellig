import { useCallback } from 'react'
import { useKV } from '@github/spark/hooks'
import { v4 as uuidv4 } from 'uuid'
import type { AlertRecord, AlertSeverity, AlertSource } from '@/types/alerts'

const ALERT_STORAGE_KEY = 'platform-alerts'
const MAX_ALERTS = 50

export function useAlerts() {
  const [alerts = [], setAlerts] = useKV<AlertRecord[]>(ALERT_STORAGE_KEY, [])

  const addAlert = useCallback(
    (data: Omit<AlertRecord, 'id' | 'timestamp'> & { id?: string; timestamp?: string }) => {
      const id = data.id ?? uuidv4()
      const timestamp = data.timestamp ?? new Date().toISOString()
      const record: AlertRecord = {
        id,
        timestamp,
        title: data.title,
        description: data.description,
        severity: data.severity,
        source: data.source,
        relatedRecordId: data.relatedRecordId,
        context: data.context,
      }
      setAlerts((current = []) => {
        const filtered = current.filter((item) => item.id !== record.id)
        const next = [record, ...filtered].slice(0, MAX_ALERTS)
        return next
      })
      return record
    },
    [setAlerts]
  )

  const clearAlert = useCallback(
    (id: string) => {
      setAlerts((current = []) => current.filter((item) => item.id !== id))
    },
    [setAlerts]
  )

  const clearAll = useCallback(() => {
    setAlerts([])
  }, [setAlerts])

  const recordAlert = useCallback(
    (
      title: string,
      description: string,
      options: {
        severity?: AlertSeverity
        source?: AlertSource
        relatedRecordId?: string
        context?: Record<string, unknown>
      } = {}
    ) => {
      return addAlert({
        title,
        description,
        severity: options.severity ?? 'info',
        source: options.source ?? 'system',
        relatedRecordId: options.relatedRecordId,
        context: options.context,
      })
    },
    [addAlert]
  )

  return {
    alerts,
    addAlert,
    clearAlert,
    clearAll,
    recordAlert,
  }
}
