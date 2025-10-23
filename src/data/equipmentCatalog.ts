import type { EquipmentTelemetry } from '@/data/seed'

export type EquipmentMeta = {
  id: string
  name: string
  processArea: 'Upstream' | 'Downstream' | 'Utilities'
  classification: 'Bioreactor' | 'Chromatography' | 'Filtration' | 'Drying' | 'Reaction' | 'Crystallization'
  description: string
  supportedInterfaces: Array<'OPC UA' | 'Modbus TCP' | 'MQTT' | 'REST' | 'File Drop'>
  historianTags: string[]
  regulatedDataNotes: string
}

type CatalogMap = Record<string, EquipmentMeta>

const catalogEntries: EquipmentMeta[] = [
  {
    id: 'BIO-001',
    name: 'Bioreactor 1',
    processArea: 'Upstream',
    classification: 'Bioreactor',
    description: 'Stainless-steel perfusion bioreactor with automated pH and DO control used for monoclonal antibody production.',
    supportedInterfaces: ['OPC UA', 'Modbus TCP', 'MQTT'],
    historianTags: ['BIO-001:TEMP', 'BIO-001:PH', 'BIO-001:AGITATION', 'BIO-001:VIBRATION'],
    regulatedDataNotes: 'CPP telemetry and batch genealogy are captured for 21 CFR Part 11 compliance.'
  },
  {
    id: 'BIO-002',
    name: 'Bioreactor 2',
    processArea: 'Upstream',
    classification: 'Bioreactor',
    description: 'Parallel perfusion bioreactor supporting redundancy and scale-out with shared control modules.',
    supportedInterfaces: ['OPC UA', 'Modbus TCP', 'MQTT'],
    historianTags: ['BIO-002:TEMP', 'BIO-002:PH', 'BIO-002:AGITATION', 'BIO-002:VIBRATION'],
    regulatedDataNotes: 'Linked to validated historian and recipe management for GMP traceability.'
  },
  {
    id: 'CHR-001',
    name: 'Chromatography Skid A',
    processArea: 'Downstream',
    classification: 'Chromatography',
    description: 'Protein A chromatography skid with inline UV analytics and column integrity monitoring.',
    supportedInterfaces: ['OPC UA', 'Modbus TCP', 'REST'],
    historianTags: ['CHR-001:PRESSURE', 'CHR-001:FLOW', 'CHR-001:UV', 'CHR-001:CONDUCTIVITY'],
    regulatedDataNotes: 'Critical cleaning cycle data recorded as GMP electronic records.'
  },
  {
    id: 'CHR-002',
    name: 'Chromatography Skid B',
    processArea: 'Downstream',
    classification: 'Chromatography',
    description: 'Ion-exchange chromatography skid used for polishing steps with redundant pump trains.',
    supportedInterfaces: ['OPC UA', 'Modbus TCP', 'REST'],
    historianTags: ['CHR-002:PRESSURE', 'CHR-002:FLOW', 'CHR-002:UV', 'CHR-002:CONDUCTIVITY'],
    regulatedDataNotes: 'Batch-to-batch trending for validation lifecycle maintained by the historian.'
  },
  {
    id: 'FIL-001',
    name: 'Filter Train 1',
    processArea: 'Downstream',
    classification: 'Filtration',
    description: 'Sterile filtration skid with differential pressure and integrity testing instrumentation.',
    supportedInterfaces: ['OPC UA', 'Modbus TCP', 'File Drop'],
    historianTags: ['FIL-001:PRESSURE_IN', 'FIL-001:PRESSURE_OUT', 'FIL-001:DP', 'FIL-001:VIBRATION'],
    regulatedDataNotes: 'Integrity test reports archived for GMP release decisions.'
  },
  {
    id: 'FIL-002',
    name: 'Filter Train 2',
    processArea: 'Downstream',
    classification: 'Filtration',
    description: 'Redundant filtration skid supporting small-molecule operations with predictive maintenance sensors.',
    supportedInterfaces: ['OPC UA', 'Modbus TCP', 'File Drop'],
    historianTags: ['FIL-002:PRESSURE_IN', 'FIL-002:PRESSURE_OUT', 'FIL-002:DP', 'FIL-002:VIBRATION'],
    regulatedDataNotes: 'Differential pressure and integrity data stored in validated LIMS.'
  },
  {
    id: 'REA-001',
    name: 'Reactor 1',
    processArea: 'Upstream',
    classification: 'Reaction',
    description: 'Glass-lined synthesis reactor handling small-molecule reactions with precise temperature control.',
    supportedInterfaces: ['OPC UA', 'Modbus TCP'],
    historianTags: ['REA-001:TEMP', 'REA-001:PRESSURE', 'REA-001:AGITATION'],
    regulatedDataNotes: 'Reaction parameter records tied to master batch records.'
  },
  {
    id: 'CRY-001',
    name: 'Crystallizer 1',
    processArea: 'Downstream',
    classification: 'Crystallization',
    description: 'Batch crystallizer with supersaturation monitoring and agitation control.',
    supportedInterfaces: ['OPC UA', 'Modbus TCP', 'MQTT'],
    historianTags: ['CRY-001:TEMP', 'CRY-001:SUPER', 'CRY-001:AGITATION', 'CRY-001:VIBRATION'],
    regulatedDataNotes: 'Critical crystal size distribution metrics archived for release testing.'
  },
  {
    id: 'DRY-002',
    name: 'Spray Dryer 2',
    processArea: 'Downstream',
    classification: 'Drying',
    description: 'Spray dryer with exhaust moisture analytics and inlet temperature profiling.',
    supportedInterfaces: ['OPC UA', 'MQTT'],
    historianTags: ['DRY-002:TEMP_IN', 'DRY-002:TEMP_OUT', 'DRY-002:MOISTURE', 'DRY-002:VIBRATION'],
    regulatedDataNotes: 'Drying curves and moisture analytics retained for QA oversight.'
  }
]

export const equipmentCatalog: CatalogMap = catalogEntries.reduce<CatalogMap>((acc, entry) => {
  acc[entry.id] = entry
  return acc
}, {})

export const equipmentList = catalogEntries.slice()

export function getEquipmentMeta(id: string): EquipmentMeta | undefined {
  return equipmentCatalog[id]
}

export function deriveDisplayData(telemetry: EquipmentTelemetry) {
  const meta = getEquipmentMeta(telemetry.id)
  const utilization = Math.min(100, Math.round(((telemetry.uptimeHours % 720) / 720) * 100))
  const status: 'online' | 'warning' | 'maintenance' = telemetry.vibrationAlert
    ? 'warning'
    : utilization < 20
      ? 'maintenance'
      : 'online'

  return {
    telemetry,
    meta,
    utilization,
    status,
  }
}
