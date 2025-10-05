import { calendarYear, nextYear, previousYear, startOfToday } from '@/lib/timeframe'

const currentYear = calendarYear
const nextYearValue = nextYear
const previousYearValue = previousYear

const previousYearShort = String(previousYearValue).slice(-2)
const today = startOfToday()
const monthDay = `${String(today.getUTCMonth() + 1).padStart(2, '0')}${String(today.getUTCDate()).padStart(2, '0')}`

export const BATCH_IDS = {
  monoclonal: `BTH-${currentYear}-001`,
  smallMolecule: `BTH-${currentYear}-002`,
  warning: `BTH-${currentYear}-003`,
} as const

export const DEVIATION_IDS = {
  temperatureExcursion: `DEV-${currentYear}-001`,
  documentationDiscrepancy: `DEV-${currentYear}-002`,
  materialOutOfSpec: `DEV-${currentYear}-003`,
} as const

export const CAPA_IDS = {
  temperatureControlUpgrade: `CAPA-${currentYear}-001`,
  chromatographyCalibration: `CAPA-${currentYear}-002`,
  vibrationMonitoring: `CAPA-${currentYear}-003`,
} as const

export const CHANGE_CONTROL_IDS = {
  pidRetune: `CC-${nextYearValue}-001`,
  vibrationMonitoring: `CC-${nextYearValue}-002`,
} as const

export const MATERIAL_LOTS = {
  moistureSensitive: `RM-${previousYearShort}${monthDay}-A`,
} as const

export const INVESTIGATION_IDS = {
  temperatureExcursion: DEVIATION_IDS.temperatureExcursion,
  documentationDiscrepancy: DEVIATION_IDS.documentationDiscrepancy,
  materialOutOfSpec: DEVIATION_IDS.materialOutOfSpec,
} as const

export const AUDIT_EVENT_IDS = {
  deviationCreated: `AUD-${currentYear}-001`,
  batchParameterUpdated: `AUD-${currentYear}-002`,
  equipmentStatusChange: `AUD-${currentYear}-003`,
  capaApproved: `AUD-${currentYear}-004`,
  loginFailed: `AUD-${currentYear}-005`,
  deviationResolved: `AUD-${currentYear}-006`,
  aiAnalysisGenerated: `AUD-${currentYear}-007`,
  navigation: `AUD-${currentYear}-008`,
  changeControlCreated: `AUD-${currentYear}-009`,
} as const

export const MATERIAL_RECORD_IDS = {
  impactedBatchLot: MATERIAL_LOTS.moistureSensitive,
} as const
