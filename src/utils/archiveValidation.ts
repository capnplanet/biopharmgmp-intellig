import { BATCH_IDS, DEVIATION_IDS } from '@/data/identifiers'
import { buildInvestigationSources } from '@/data/archive'

export interface ValidationResult {
  isCompliant: boolean
  completeness: number
  issues: string[]
  recommendations: string[]
  sourceBreakdown: {
    total: number
    byType: Record<string, number>
    compliantSources: number
  }
}

/**
 * Validates that investigation sources are complete, aligned, and compliant
 * for root cause analysis in GMP environments
 */
export function validateArchiveCompleteness(batchId: string): ValidationResult {
  const sources = buildInvestigationSources(batchId)
  const issues: string[] = []
  const recommendations: string[] = []
  
  // Count sources by type
  const byType = sources.reduce((acc, source) => {
    acc[source.type] = (acc[source.type] || 0) + 1
    return acc
  }, {} as Record<string, number>)
  
  // Check for essential source types
  const essentialTypes = ['batch-record', 'equipment-telemetry', 'calibration-record', 'gmp-guidance']
  const missingTypes = essentialTypes.filter(type => !byType[type])
  
  if (missingTypes.length > 0) {
    issues.push(`Missing essential source types: ${missingTypes.join(', ')}`)
    recommendations.push('Ensure all critical record types are included in investigation sources')
  }
  
  // Check compliance flags
  const compliantSources = sources.filter(s => s.compliance?.cfr21Part11 && s.compliance?.alcoa).length
  const complianceRate = sources.length > 0 ? compliantSources / sources.length : 0
  
  if (complianceRate < 1.0) {
    issues.push(`${sources.length - compliantSources} sources lack full compliance flags`)
    recommendations.push('Ensure all sources meet 21 CFR Part 11 and ALCOA+ requirements')
  }
  
  // Check content depth - each source should have substantive content
  const shallowSources = sources.filter(s => s.content.length < 100)
  if (shallowSources.length > 0) {
    issues.push(`${shallowSources.length} sources have insufficient detail (< 100 characters)`)
    recommendations.push('Expand source content to provide actionable investigation context')
  }
  
  // Check for operator logs on critical deviations
  const hasOperatorLogs = sources.some(s => s.type === 'operator-log')
  if (batchId === BATCH_IDS.warning && !hasOperatorLogs) {
    issues.push('Critical temperature deviation lacks operator log context')
    recommendations.push('Include operator observations and actions for critical deviations')
  }
  
  // Check for trend analysis on process excursions
  const hasTrendData = sources.some(s => s.type === 'trend-data')
  if (batchId === BATCH_IDS.warning && !hasTrendData) {
    issues.push('Process excursion lacks statistical trend analysis')
    recommendations.push('Include control chart and trend analysis for process deviations')
  }
  
  // Check for audit trail integration
  const hasAuditEvents = sources.some(s => s.type === 'audit-event')
  if (!hasAuditEvents) {
    issues.push('Investigation lacks audit trail event integration')
    recommendations.push('Link relevant audit trail events to provide complete traceability')
  }
  
  // Calculate completeness score
  const baseScore = Math.min(sources.length / 8, 1) * 40 // Up to 40 points for source quantity
  const typeScore = Math.min(Object.keys(byType).length / 6, 1) * 30 // Up to 30 points for source variety
  const complianceScore = complianceRate * 20 // Up to 20 points for compliance
  const contentScore = Math.min((sources.length - shallowSources.length) / sources.length, 1) * 10 // Up to 10 points for content depth
  
  const completeness = Math.round(baseScore + typeScore + complianceScore + contentScore)
  const isCompliant = issues.length === 0 && completeness >= 85
  
  return {
    isCompliant,
    completeness,
    issues,
    recommendations,
    sourceBreakdown: {
      total: sources.length,
      byType,
      compliantSources
    }
  }
}

/**
 * Validates content alignment with specific deviation types
 */
export function validateContentAlignment(deviationId: string, batchId: string): {
  isAligned: boolean
  alignment: number
  details: string[]
} {
  const sources = buildInvestigationSources(batchId)
  const details: string[] = []
  let alignmentScore = 0
  
  // Temperature excursion specific checks
  if (deviationId === DEVIATION_IDS.temperatureExcursion) {
    const hasTemperatureData = sources.some(s => s.content.includes('temperature') || s.content.includes('Temperature'))
    const hasEquipmentData = sources.some(s => s.content.includes('BIO-002'))
    const hasMaintenanceHistory = sources.some(s => s.type === 'maintenance-log')
    const hasOperatorResponse = sources.some(s => s.content.includes('cooling protocol') || s.content.includes('heating jacket'))
    
    if (hasTemperatureData) { alignmentScore += 25; details.push('✓ Temperature data present') }
    if (hasEquipmentData) { alignmentScore += 25; details.push('✓ BIO-002 equipment data included') }
    if (hasMaintenanceHistory) { alignmentScore += 25; details.push('✓ Maintenance history available') }
    if (hasOperatorResponse) { alignmentScore += 25; details.push('✓ Operator response documented') }
  }
  
  // Material deviation specific checks
  if (deviationId === DEVIATION_IDS.materialOutOfSpec) {
    const hasMaterialData = sources.some(s => s.type === 'material-record')
    const hasSupplierInfo = sources.some(s => s.content.includes('supplier') || s.content.includes('Supplier'))
    const hasImpactAssessment = sources.some(s => s.content.includes('impact') || s.content.includes('Impact'))
    
    if (hasMaterialData) { alignmentScore += 33; details.push('✓ Material record included') }
    if (hasSupplierInfo) { alignmentScore += 33; details.push('✓ Supplier information present') }
    if (hasImpactAssessment) { alignmentScore += 34; details.push('✓ Impact assessment documented') }
  }
  
  return {
    isAligned: alignmentScore >= 75,
    alignment: alignmentScore,
    details
  }
}

/**
 * Test function to validate the entire archive system
 */
export function runArchiveValidationSuite(): {
  overallCompliance: boolean
  testResults: Array<{
    testName: string
    batchId: string
    deviationId?: string
    result: ValidationResult | ReturnType<typeof validateContentAlignment>
  }>
} {
  const testResults: Array<{
    testName: string
    batchId: string
    deviationId?: string
    result: ValidationResult | ReturnType<typeof validateContentAlignment>
  }> = []

  const warningCompleteness = validateArchiveCompleteness(BATCH_IDS.warning)
  testResults.push({
    testName: `${BATCH_IDS.warning} Completeness`,
    batchId: BATCH_IDS.warning,
    result: warningCompleteness,
  })

  const warningAlignment = validateContentAlignment(DEVIATION_IDS.temperatureExcursion, BATCH_IDS.warning)
  testResults.push({
    testName: `${DEVIATION_IDS.temperatureExcursion} Content Alignment`,
    batchId: BATCH_IDS.warning,
    deviationId: DEVIATION_IDS.temperatureExcursion,
    result: warningAlignment,
  })

  const monoclonalCompleteness = validateArchiveCompleteness(BATCH_IDS.monoclonal)
  testResults.push({
    testName: `${BATCH_IDS.monoclonal} Completeness`,
    batchId: BATCH_IDS.monoclonal,
    result: monoclonalCompleteness,
  })

  const monoclonalAlignment = validateContentAlignment(DEVIATION_IDS.materialOutOfSpec, BATCH_IDS.monoclonal)
  testResults.push({
    testName: `${DEVIATION_IDS.materialOutOfSpec} Content Alignment`,
    batchId: BATCH_IDS.monoclonal,
    deviationId: DEVIATION_IDS.materialOutOfSpec,
    result: monoclonalAlignment,
  })

  const smallMoleculeCompleteness = validateArchiveCompleteness(BATCH_IDS.smallMolecule)
  testResults.push({
    testName: `${BATCH_IDS.smallMolecule} Completeness`,
    batchId: BATCH_IDS.smallMolecule,
    result: smallMoleculeCompleteness,
  })

  const overallCompliance = testResults.every(test => {
    if ('isCompliant' in test.result) {
      return test.result.isCompliant
    }
    return test.result.isAligned
  })

  return {
    overallCompliance,
    testResults,
  }
}