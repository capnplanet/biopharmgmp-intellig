import { useKV } from '@github/spark/hooks'
import { useCurrentUser } from '@/hooks/use-current-user'

export type AuditOutcome = 'success' | 'failure' | 'warning'
export type AuditModule =
  | 'batch'
  | 'quality'
  | 'equipment'
  | 'system'
  | 'deviation'
  | 'capa'
  | 'change-control'
  | 'navigation'
  | 'workflow'
  | 'ai'

export type AuditEvent = {
  id: string
  timestamp: Date
  userId: string
  userRole: string
  action: string
  module: AuditModule
  details: string
  recordId?: string
  ipAddress: string
  sessionId: string
  outcome: AuditOutcome
  digitalSignature?: string
}

export function useAuditLogger(user?: { id: string; role: string; ipAddress?: string; sessionId?: string }) {
  const [events, setEvents] = useKV<AuditEvent[]>('audit-events')
  const { user: currentUser } = useCurrentUser()

  function genId() {
    const ts = new Date().toISOString().replace(/[-:TZ.]/g, '').slice(0, 14)
    const rand = Math.floor(Math.random() * 1000).toString().padStart(3, '0')
    return `AUD-${ts}-${rand}`
  }

  const defaultUser = {
    id: 'user@local',
    role: 'User',
    ipAddress: '127.0.0.1',
    sessionId: 'sess-local'
  }

  function log(action: string, module: AuditModule, details: string, opts?: { recordId?: string; outcome?: AuditOutcome; digitalSignature?: string; userOverride?: { id: string; role: string; ipAddress?: string; sessionId?: string } }) {
  const u = opts?.userOverride || user || currentUser || defaultUser
    const event: AuditEvent = {
      id: genId(),
      timestamp: new Date(),
      userId: u.id,
      userRole: u.role,
      action,
      module,
      details,
      recordId: opts?.recordId,
      ipAddress: u.ipAddress || defaultUser.ipAddress,
      sessionId: u.sessionId || defaultUser.sessionId,
      outcome: opts?.outcome || 'success',
      digitalSignature: opts?.digitalSignature,
    }
    setEvents([event, ...((events as AuditEvent[]) || [])])
  }

  async function withAudit<T>(actionName: string, module: AuditModule, details: string, fn: () => Promise<T>, opts?: { recordId?: string }) {
    try {
      const result = await fn()
      log(actionName, module, details, { recordId: opts?.recordId, outcome: 'success' })
      return result
    } catch (err) {
      log(actionName, module, `${details} (error: ${(err as Error).message})`, { recordId: opts?.recordId, outcome: 'failure' })
      throw err
    }
  }

  return { log, withAudit }
}
