import { useEffect } from 'react'
import { useKV } from '@github/spark/hooks'
import { toast } from 'sonner'
import type { AutomationProposalDetail } from '@/lib/qualityAutomation'
import type { AutomationSuggestion } from '@/types/automation'
import type { Deviation } from '@/types/quality'
import { useAuditLogger } from '@/hooks/use-audit'
import { useAlerts } from '@/hooks/use-alerts'

export function AutomationBridge() {
  const [, setDeviations] = useKV<Deviation[]>('deviations', [])
  const [suggestions = [], setSuggestions] = useKV<AutomationSuggestion[]>('automation-queue', [])
  const { log } = useAuditLogger()
  const { recordAlert } = useAlerts()

  useEffect(() => {
    if (!suggestions) {
      setSuggestions([])
    }
  }, [suggestions, setSuggestions])

  useEffect(() => {
    const handler = (event: Event) => {
      const detail = (event as CustomEvent<AutomationProposalDetail>).detail
      if (!detail) return

      setDeviations(current => {
        const existing = current || []
        if (existing.some(dev => dev.id === detail.deviation.id)) return existing
        return [detail.deviation, ...existing]
      })

      setSuggestions(existing => {
        const currentSuggestions = existing || []
        if (currentSuggestions.some(item => item.id === detail.suggestion.id)) return currentSuggestions
        return [detail.suggestion, ...currentSuggestions]
      })

      log('Digital Twin Signal Detected', 'deviation', `Automated ${detail.trigger} detected on batch ${detail.batchId} (${detail.parameter}). Proposed deviation ${detail.deviation.id}.`, {
        recordId: detail.deviation.id,
      })

      log('Automation Plan Proposed', 'ai', `Recommendation ${detail.suggestion.id} generated for deviation ${detail.deviation.id}.`, {
        recordId: detail.deviation.id,
      })

      recordAlert(
        `${detail.trigger} condition detected for ${detail.batchId}`,
        `Deviation ${detail.deviation.id} and mitigation plan ${detail.suggestion.id} generated.`,
        {
          severity: detail.trigger === 'OOS' ? 'warning' : 'info',
          source: 'digital-twin',
          relatedRecordId: detail.deviation.id,
          context: {
            batchId: detail.batchId,
            trigger: detail.trigger,
            parameter: detail.parameter,
          },
        }
      )

      toast.info(`Digital twin detected ${detail.trigger} trend`, {
        description: `Deviation ${detail.deviation.id} and AI action plan ${detail.suggestion.id} pending review.`,
      })
    }

    window.addEventListener('quality:automation-proposal', handler as EventListener)
    return () => window.removeEventListener('quality:automation-proposal', handler as EventListener)
  }, [log, recordAlert, setDeviations, setSuggestions])

  useEffect(() => {
    if (!suggestions?.length) return
    // Ensure suggestions older than 2 days are retained but marked for follow-up
    const now = Date.now()
    const stale = suggestions.filter(item => item.status === 'pending' && now - new Date(item.createdAt).getTime() > 1000 * 60 * 60 * 24 * 2)
    if (stale.length > 0) {
      toast.warning('Pending automation actions require attention', {
        description: `${stale.length} AI recommendations have awaited review for more than 48 hours.`,
      })
    }
  }, [suggestions])

  return null
}
