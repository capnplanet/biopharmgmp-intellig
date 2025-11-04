import type { CAPA, Deviation } from '@/types/quality'

export function getActiveDeviationCount(deviations: Deviation[] = []): number {
  return deviations.filter(d => d.status === 'open' || d.status === 'investigating').length
}

export function getCriticalDeviationCountNonClosed(deviations: Deviation[] = []): number {
  return deviations.filter(d => d.severity === 'critical' && d.status !== 'closed').length
}

export function getActiveCapaCount(capas: CAPA[] = []): number {
  return capas.filter(c => c.status !== 'complete').length
}
