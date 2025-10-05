import { AUDIT_EVENT_IDS, BATCH_IDS, DEVIATION_IDS, MATERIAL_LOTS } from '@/data/identifiers'
import { batches, equipmentCalibration, equipmentTelemetry, type BatchData } from '@/data/seed'
import { daysAgo, daysAhead, formatDate, previousYear } from '@/lib/timeframe'

export type InvestigationSource = {
  id: string // e.g., S1, S2
  title: string
  type: 'batch-record' | 'equipment-telemetry' | 'calibration-record' | 'gmp-guidance' | 'maintenance-log' | 'capa-history' | 'audit-event' | 'trend-data' | 'operator-log' | 'material-record'
  content: string
  meta?: Record<string, unknown>
  compliance?: {
    cfr21Part11: boolean
    alcoa: boolean
    dataIntegrity: boolean
  }
  lastUpdated?: Date
  author?: string
}

const getBatchById = (id: string): BatchData | undefined => batches.find(b => b.id === id)

// Comprehensive regulatory guidance repository
const regulatoryGuidance = {
  gmpAnnex1: `EU GMP Annex 1 (2022) excerpt: "Critical process parameters (CPPs) should be defined based on knowledge and risk assessment. Deviations from CPP ranges must be investigated and assessed for impact on product quality. Control systems should detect excursions and initiate corrective actions to maintain the state of control."`,
  
  fda21cfr211: `21 CFR 211.192: Deviation investigations must be conducted according to a written procedure. The investigation shall extend to other batches of the same drug product and other drug products that may have been associated with the specific failure or discrepancy. A written record of the investigation shall be made and shall include the conclusions and follow-up.`,
  
  patGuidance: `FDA PAT Guidance (2004): Process Analytical Technology facilitates understanding of the process through timely measurements (during processing) of critical quality and performance attributes of raw and in-process materials and processes with the goal of ensuring final product quality.`,
  
  ichQ7: `ICH Q7 Good Manufacturing Practice Guide for Active Pharmaceutical Ingredients: Any deviation from established procedures should be documented and explained. Critical deviations should be investigated, and the investigation should extend to other batches that may have been associated with the specific failure.`,
  
  gampValidation: `GAMP 5 Risk-based Approach: Computerized systems used in regulated environments must be validated to ensure they consistently perform their intended functions. This includes process control systems, data acquisition systems, and manufacturing execution systems.`
}

// Historical maintenance and CAPA data
const maintenanceLogs = {
  'BIO-002': [
    { date: formatDate(daysAgo(3)), activity: 'Temperature sensor calibration', technician: 'J.Smith', result: 'Passed', nextDue: formatDate(daysAhead(180)) },
    { date: formatDate(daysAgo(7)), activity: 'Agitator bearing replacement', technician: 'M.Johnson', result: 'Completed', notes: 'Slight temperature drift observed post-maintenance' },
    { date: formatDate(daysAgo(20)), activity: 'Preventive maintenance - heating jacket', technician: 'R.Wilson', result: 'Passed' }
  ],
  'CHR-002': [
    { date: formatDate(daysAgo(5)), activity: 'Column packing verification', technician: 'L.Davis', result: 'Passed' },
    { date: formatDate(daysAgo(22)), activity: 'Pump seal replacement', technician: 'K.Brown', result: 'Completed' }
  ],
  'FIL-002': [
    { date: formatDate(daysAgo(4)), activity: 'Filter integrity test', technician: 'S.Miller', result: 'Failed initial test, passed after re-seating', notes: 'Minor leak detected, corrected' },
    { date: formatDate(daysAgo(25)), activity: 'Pressure sensor calibration', technician: 'T.Anderson', result: 'Passed' }
  ]
}

// CAPA effectiveness tracking
const capaHistory = {
  [`CAPA-${previousYear}-015`]: {
    title: 'Temperature Control System Enhancement',
    equipment: ['BIO-001', 'BIO-002'],
    effectivenessData: 'Post-implementation: 85% reduction in temperature excursions. 3 minor excursions in 6 months vs 20 in previous 6 months.',
    status: 'Effective',
    completedDate: formatDate(daysAgo(320))
  },
  [`CAPA-${previousYear}-008`]: {
    title: 'Vibration Monitoring Program',
    equipment: ['FIL-001', 'FIL-002'],
    effectivenessData: 'Equipment failures reduced by 60%. Predictive maintenance schedules optimized based on vibration trends.',
    status: 'Effective',
    completedDate: formatDate(daysAgo(380))
  }
}

// Operator log entries for context
const operatorLogs = {
  [BATCH_IDS.warning]: [
    { timestamp: daysAgo(0, 9.25).toISOString(), operator: 'Sarah Chen', entry: 'Temperature alarm activated. Observed rapid temperature rise from 37.1°C to 38.2°C over 5 minutes.' },
    { timestamp: daysAgo(0, 9.5).toISOString(), operator: 'Sarah Chen', entry: 'Initiated emergency cooling protocol. Contacted maintenance for heating jacket inspection.' },
    { timestamp: daysAgo(0, 9.75).toISOString(), operator: 'Mike Rodriguez', entry: 'Maintenance response: Heating jacket control valve stuck open. Manual override engaged to stabilize temperature.' },
    { timestamp: daysAgo(0, 10.25).toISOString(), operator: 'Sarah Chen', entry: 'Temperature stabilized at 37.0°C. Process parameters returned to normal ranges.' }
  ],
  [BATCH_IDS.smallMolecule]: [
    { timestamp: daysAgo(0, 14.17).toISOString(), operator: 'Mike Rodriguez', entry: 'Manual pH reading: 3.2. Automated system reading: 3.0. Recalibrated pH probe.' },
    { timestamp: daysAgo(0, 14.33).toISOString(), operator: 'Mike Rodriguez', entry: 'Post-calibration readings align. Manual: 3.15, Automated: 3.14.' }
  ]
}

// Material traceability records
const materialRecords = {
  [MATERIAL_LOTS.moistureSensitive]: {
    supplier: 'ChemSupply Corp',
    lotNumber: MATERIAL_LOTS.moistureSensitive,
    specification: { moisture: { max: 5.0, unit: '%' }, purity: { min: 99.5, unit: '%' } },
    actualValues: { moisture: 5.2, purity: 99.7 },
    storageConditions: 'Controlled room temperature, <60% RH',
    transportConditions: 'Temperature excursion during transport: 28-35°C for 4 hours',
    impactAssessment: 'Moisture content exceeded specification. Material rejected and quarantined.'
  }
}

// Audit trail events related to specific batches/equipment
const auditTrailEvents = {
  [BATCH_IDS.warning]: [
    { id: AUDIT_EVENT_IDS.deviationCreated, timestamp: daysAgo(0, 9.5).toISOString(), action: 'Deviation Created', user: 'Sarah Chen', details: `Created ${DEVIATION_IDS.temperatureExcursion} for temperature excursion`, outcome: 'success' },
    { id: AUDIT_EVENT_IDS.equipmentStatusChange, timestamp: daysAgo(0, 8.25).toISOString(), action: 'Equipment Status Change', user: 'System', details: 'BIO-002 status changed to WARNING due to temperature deviation', outcome: 'warning' }
  ],
  [BATCH_IDS.smallMolecule]: [
    { id: AUDIT_EVENT_IDS.batchParameterUpdated, timestamp: daysAgo(0, 14.25).toISOString(), action: 'Batch Parameter Updated', user: 'Mike Rodriguez', details: 'Updated temperature setpoint from 36.8°C to 37.0°C', outcome: 'success' }
  ]
}

// Statistical trend data and control chart information
const trendAnalysis = {
  temperatureControl: {
    batchIds: [BATCH_IDS.monoclonal, BATCH_IDS.smallMolecule, BATCH_IDS.warning],
    statistics: {
      mean: 37.1,
      standardDeviation: 0.45,
      cpk: 1.2,
      excursions: [
        { batchId: BATCH_IDS.warning, timestamp: daysAgo(0, 9.25).toISOString(), value: 38.2, duration: '15 minutes', severity: 'major' }
      ],
      controlLimits: { ucl: 37.8, lcl: 36.2, usl: 37.5, lsl: 36.5 }
    },
    pattern: `Temperature control generally stable with one significant excursion in ${BATCH_IDS.warning}. Heating jacket control valve failure identified as root cause.`,
    recommendations: 'Implement predictive maintenance for heating jacket control valves. Consider redundant temperature control systems.'
  },
  equipmentVibration: {
    equipmentIds: ['BIO-001', 'BIO-002', 'FIL-001', 'FIL-002'],
    statistics: {
      baseline: { 'BIO-001': 1.6, 'BIO-002': 1.9, 'FIL-001': 3.6, 'FIL-002': 3.1 },
      alertThresholds: { 'BIO-series': 3.0, 'FIL-series': 4.0 },
      trends: 'FIL-001 showing increasing vibration trend over past 30 days. BIO-002 stable but requires monitoring.',
      alerts: [
        { equipmentId: 'FIL-001', currentValue: 3.6, threshold: 4.0, status: 'warning', trend: 'increasing' }
      ]
    }
  }
}

export const buildInvestigationSources = (batchId?: string): InvestigationSource[] => {
  const sources: InvestigationSource[] = []
  
  if (batchId) {
    const batch = getBatchById(batchId)
    if (batch) {
      // Enhanced batch record with full context
      const timeline = batch.timeline.map(t => `${t.stage}: ${t.status} (${t.startTime ? new Date(t.startTime).toISOString() : 'pending'}${t.endTime ? ' - ' + new Date(t.endTime).toISOString() : ''})`).join('; ')
      
      sources.push({
        id: 'S1',
        title: `Batch Record ${batch.id}`,
        type: 'batch-record',
        content: [
          `Product: ${batch.product} (${batch.productType})`,
          `Current Stage: ${batch.stage} (${batch.progress}% complete)`,
          `Status: ${batch.status}`,
          `Start Time: ${batch.startTime.toISOString()}`,
          `Process Timeline: ${timeline}`,
          `Current Parameters: T=${batch.parameters.temperature.current}${batch.parameters.temperature.unit} (target ${batch.parameters.temperature.target}, bounds ${batch.cppBounds.temperature.min}-${batch.cppBounds.temperature.max}),`,
          `P=${batch.parameters.pressure.current}${batch.parameters.pressure.unit} (target ${batch.parameters.pressure.target}, bounds ${batch.cppBounds.pressure.min}-${batch.cppBounds.pressure.max}),`,
          `pH=${batch.parameters.pH.current} (target ${batch.parameters.pH.target}, bounds ${batch.cppBounds.pH.min}-${batch.cppBounds.pH.max}),`,
          `V=${batch.parameters.volume.current}${batch.parameters.volume.unit} (target ${batch.parameters.volume.target}, bounds ${batch.cppBounds.volume.min}-${batch.cppBounds.volume.max})`,
        ].join(' | '),
        meta: { cppBounds: batch.cppBounds, timeline: batch.timeline, equipment: batch.equipment },
        compliance: { cfr21Part11: true, alcoa: true, dataIntegrity: true },
        lastUpdated: new Date(),
        author: 'Manufacturing System'
      })

      // Operator logs for this batch
      if (operatorLogs[batchId as keyof typeof operatorLogs]) {
        const logs = operatorLogs[batchId as keyof typeof operatorLogs]
        sources.push({
          id: 'S2',
          title: `Operator Logs ${batch.id}`,
          type: 'operator-log',
          content: logs.map(log => `${log.timestamp}: ${log.operator} - ${log.entry}`).join(' | '),
          compliance: { cfr21Part11: true, alcoa: true, dataIntegrity: true },
          lastUpdated: new Date(),
          author: 'Process Operators'
        })
      }

      // Material records if applicable
      if (batch.id === BATCH_IDS.monoclonal && materialRecords[MATERIAL_LOTS.moistureSensitive]) {
        const material = materialRecords[MATERIAL_LOTS.moistureSensitive]
        sources.push({
          id: 'S3',
          title: `Material Record ${MATERIAL_LOTS.moistureSensitive}`,
          type: 'material-record',
          content: [
            `Supplier: ${material.supplier}`,
            `Lot: ${material.lotNumber}`,
            `Spec: Moisture ≤${material.specification.moisture.max}${material.specification.moisture.unit}, Purity ≥${material.specification.purity.min}${material.specification.purity.unit}`,
            `Actual: Moisture ${material.actualValues.moisture}${material.specification.moisture.unit}, Purity ${material.actualValues.purity}${material.specification.purity.unit}`,
            `Storage: ${material.storageConditions}`,
            `Transport Issues: ${material.transportConditions}`,
            `Impact: ${material.impactAssessment}`
          ].join(' | '),
          compliance: { cfr21Part11: true, alcoa: true, dataIntegrity: true }
        })
      }

      // Equipment calibration records
      const eqCal = batch.equipment.map(id => equipmentCalibration.find(c => c.id === id)).filter(Boolean)
      if (eqCal.length) {
        sources.push({
          id: 'S4',
          title: `Calibration Records (${eqCal.map(c => c!.id).join(', ')})`,
          type: 'calibration-record',
          content: eqCal.map(c => `${c!.id} (${c!.name}): status=${c!.status}, last=${new Date(c!.lastCalibration).toLocaleDateString()}, next=${new Date(c!.nextDue).toLocaleDateString()}`).join(' | '),
          compliance: { cfr21Part11: true, alcoa: true, dataIntegrity: true }
        })
      }

      // Equipment telemetry with trend context
      const tel = batch.equipment.map(id => equipmentTelemetry.find(t => t.id === id)).filter(Boolean)
      if (tel.length) {
        sources.push({
          id: 'S5',
          title: `Equipment Telemetry (${tel.map(t => t!.id).join(', ')})`,
          type: 'equipment-telemetry',
          content: tel.map(t => `${t!.id}: vibration=${t!.vibrationRMS} mm/s (alert=${t!.vibrationAlert ? 'YES - exceeds threshold' : 'no'}), tempVar=${t!.temperatureVar} °C, uptime=${t!.uptimeHours}h`).join(' | '),
          compliance: { cfr21Part11: true, alcoa: true, dataIntegrity: true }
        })
      }

      // Maintenance history for involved equipment
      const relevantEquipment = batch.equipment.filter(id => maintenanceLogs[id as keyof typeof maintenanceLogs])
      if (relevantEquipment.length > 0) {
        const maintenanceData = relevantEquipment.map(id => {
          const logs = maintenanceLogs[id as keyof typeof maintenanceLogs]
          return `${id}: ${logs.map(log => `${log.date} - ${log.activity} by ${log.technician}: ${log.result}${log.notes ? ' (' + log.notes + ')' : ''}`).join('; ')}`
        }).join(' | ')
        
        sources.push({
          id: 'S6',
          title: `Maintenance History (${relevantEquipment.join(', ')})`,
          type: 'maintenance-log',
          content: maintenanceData,
          compliance: { cfr21Part11: true, alcoa: true, dataIntegrity: true }
        })
      }

      // CAPA effectiveness data for similar equipment
      const relevantCAPAs = Object.entries(capaHistory).filter(([, capa]) => 
        capa.equipment.some(eq => batch.equipment.includes(eq))
      )
      if (relevantCAPAs.length > 0) {
        sources.push({
          id: 'S7',
          title: `CAPA History (Related Equipment)`,
          type: 'capa-history',
          content: relevantCAPAs.map(([id, capa]) => 
            `${id}: ${capa.title} - Equipment: ${capa.equipment.join(', ')} - Effectiveness: ${capa.effectivenessData} - Status: ${capa.status} (Completed: ${capa.completedDate})`
          ).join(' | '),
          compliance: { cfr21Part11: true, alcoa: true, dataIntegrity: true }
        })
      }

      // Audit trail events for this batch
      if (auditTrailEvents[batchId as keyof typeof auditTrailEvents]) {
        const events = auditTrailEvents[batchId as keyof typeof auditTrailEvents]
        sources.push({
          id: 'S8',
          title: `Audit Trail Events ${batch.id}`,
          type: 'audit-event',
          content: events.map(event => 
            `${event.timestamp}: ${event.user} - ${event.action} - ${event.details} (${event.outcome})`
          ).join(' | '),
          compliance: { cfr21Part11: true, alcoa: true, dataIntegrity: true }
        })
      }

      // Statistical trend analysis
      if (batch.status === 'warning' || batch.parameters.temperature.current > batch.cppBounds.temperature.max) {
        sources.push({
          id: 'S9',
          title: 'Temperature Control Trend Analysis',
          type: 'trend-data',
          content: [
            `Historical Performance: Mean=${trendAnalysis.temperatureControl.statistics.mean}°C, StdDev=${trendAnalysis.temperatureControl.statistics.standardDeviation}°C, Cpk=${trendAnalysis.temperatureControl.statistics.cpk}`,
            `Control Limits: UCL=${trendAnalysis.temperatureControl.statistics.controlLimits.ucl}°C, LCL=${trendAnalysis.temperatureControl.statistics.controlLimits.lcl}°C`,
            `Recent Excursions: ${trendAnalysis.temperatureControl.statistics.excursions.map(exc => `${exc.batchId}: ${exc.value}°C for ${exc.duration} (${exc.severity})`).join('; ')}`,
            `Pattern Analysis: ${trendAnalysis.temperatureControl.pattern}`,
            `Recommendations: ${trendAnalysis.temperatureControl.recommendations}`
          ].join(' | '),
          compliance: { cfr21Part11: true, alcoa: true, dataIntegrity: true }
        })
      }

      // Equipment vibration trend analysis
      const vibrationAlertEquipment = batch.equipment.filter(id => {
        const telemetry = equipmentTelemetry.find(t => t.id === id)
        return telemetry?.vibrationAlert
      })
      if (vibrationAlertEquipment.length > 0) {
        sources.push({
          id: 'S10',
          title: 'Equipment Vibration Trend Analysis',
          type: 'trend-data',
          content: [
            `Baseline Values: ${Object.entries(trendAnalysis.equipmentVibration.statistics.baseline).map(([id, val]) => `${id}=${val}mm/s`).join(', ')}`,
            `Alert Thresholds: ${Object.entries(trendAnalysis.equipmentVibration.statistics.alertThresholds).map(([series, val]) => `${series}=${val}mm/s`).join(', ')}`,
            `Current Trends: ${trendAnalysis.equipmentVibration.statistics.trends}`,
            `Active Alerts: ${trendAnalysis.equipmentVibration.statistics.alerts.map(alert => `${alert.equipmentId}: ${alert.currentValue}mm/s (${alert.status}, trend: ${alert.trend})`).join('; ')}`
          ].join(' | '),
          compliance: { cfr21Part11: true, alcoa: true, dataIntegrity: true }
        })
      }
    }
  }

  // Comprehensive regulatory guidance
  sources.push({
    id: `S${sources.length + 1}`,
    title: 'GMP Guidance (EU Annex 1)',
    type: 'gmp-guidance',
    content: regulatoryGuidance.gmpAnnex1,
    compliance: { cfr21Part11: true, alcoa: true, dataIntegrity: true }
  })

  sources.push({
    id: `S${sources.length + 1}`,
    title: 'FDA Guidance (21 CFR 211.192)',
    type: 'gmp-guidance',
    content: regulatoryGuidance.fda21cfr211,
    compliance: { cfr21Part11: true, alcoa: true, dataIntegrity: true }
  })

  sources.push({
    id: `S${sources.length + 1}`,
    title: 'ICH Q7 Guidance',
    type: 'gmp-guidance',
    content: regulatoryGuidance.ichQ7,
    compliance: { cfr21Part11: true, alcoa: true, dataIntegrity: true }
  })

  return sources
}

export const sourcesToString = (sources: InvestigationSource[]) =>
  sources.map(s => `[${s.id}] ${s.title}: ${s.content}`).join('\n')
