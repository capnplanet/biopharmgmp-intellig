
export type ProductType = 'small-molecule' | 'large-molecule'

export type BatchTimelineItem = {
  stage: string
  startTime: Date
  endTime?: Date
  status: 'complete' | 'active' | 'pending'
}

export type CPPBounds = {
  temperature: { min: number; max: number; unit: string }
  pressure: { min: number; max: number; unit: string }
  pH: { min: number; max: number; unit: string }
  volume: { min: number; max: number; unit: string }
}

export type EquipmentCalibration = {
  id: string
  name: string
  lastCalibration: Date
  nextDue: Date
  status: 'calibrated' | 'due-soon' | 'overdue'
}

export type EquipmentTelemetry = {
  id: string
  vibrationRMS: number // mm/s
  vibrationAlert: boolean
  temperatureVar: number // °C std dev
  uptimeHours: number
}

export type BatchParameters = {
  temperature: { current: number; target: number; unit: string }
  pressure: { current: number; target: number; unit: string }
  pH: { current: number; target: number; unit: string }
  volume: { current: number; target: number; unit: string }
}

export type BatchData = {
  id: string
  product: string
  productType: ProductType
  stage: string
  progress: number
  status: 'running' | 'complete' | 'warning' | 'error'
  startTime: Date
  equipment: string[]
  parameters: BatchParameters
  cppBounds: CPPBounds
  timeline: BatchTimelineItem[]
}

// Seed: equipment metadata
export const equipmentCalibration: EquipmentCalibration[] = [
  {
    id: 'BIO-001',
    name: 'Bioreactor 1',
    lastCalibration: new Date('2024-12-01T00:00:00Z'),
    nextDue: new Date('2025-12-01T00:00:00Z'),
    status: 'calibrated',
  },
  {
    id: 'BIO-002',
    name: 'Bioreactor 2',
    lastCalibration: new Date('2024-11-20T00:00:00Z'),
    nextDue: new Date('2025-11-20T00:00:00Z'),
    status: 'calibrated',
  },
  {
    id: 'CHR-001',
    name: 'Chromatography Skid A',
    lastCalibration: new Date('2024-08-15T00:00:00Z'),
    nextDue: new Date('2025-08-15T00:00:00Z'),
    status: 'calibrated',
  },
  {
    id: 'CHR-002',
    name: 'Chromatography Skid B',
    lastCalibration: new Date('2024-08-05T00:00:00Z'),
    nextDue: new Date('2025-08-05T00:00:00Z'),
    status: 'calibrated',
  },
  {
    id: 'FIL-001',
    name: 'Filter Train 1',
    lastCalibration: new Date('2024-05-10T00:00:00Z'),
    nextDue: new Date('2025-05-10T00:00:00Z'),
    status: 'due-soon',
  },
  {
    id: 'FIL-002',
    name: 'Filter Train 2',
    lastCalibration: new Date('2024-05-05T00:00:00Z'),
    nextDue: new Date('2025-05-05T00:00:00Z'),
    status: 'due-soon',
  },
  {
    id: 'REA-001',
    name: 'Reactor 1',
    lastCalibration: new Date('2024-11-05T00:00:00Z'),
    nextDue: new Date('2025-11-05T00:00:00Z'),
    status: 'calibrated',
  },
  {
    id: 'CRY-001',
    name: 'Crystallizer 1',
    lastCalibration: new Date('2024-02-01T00:00:00Z'),
    nextDue: new Date('2025-02-01T00:00:00Z'),
    status: 'overdue',
  },
  {
    id: 'DRY-002',
    name: 'Dryer 2',
    lastCalibration: new Date('2024-03-20T00:00:00Z'),
    nextDue: new Date('2025-03-20T00:00:00Z'),
    status: 'due-soon',
  },
]

export const equipmentTelemetry: EquipmentTelemetry[] = [
  { id: 'BIO-001', vibrationRMS: 1.6, vibrationAlert: false, temperatureVar: 0.18, uptimeHours: 1800 },
  { id: 'BIO-002', vibrationRMS: 1.9, vibrationAlert: false, temperatureVar: 0.2, uptimeHours: 1620 },
  { id: 'CHR-001', vibrationRMS: 2.1, vibrationAlert: false, temperatureVar: 0.25, uptimeHours: 1420 },
  { id: 'CHR-002', vibrationRMS: 2.0, vibrationAlert: false, temperatureVar: 0.23, uptimeHours: 1380 },
  { id: 'FIL-001', vibrationRMS: 3.6, vibrationAlert: true, temperatureVar: 0.31, uptimeHours: 980 },
  { id: 'FIL-002', vibrationRMS: 3.1, vibrationAlert: false, temperatureVar: 0.29, uptimeHours: 910 },
  { id: 'REA-001', vibrationRMS: 2.8, vibrationAlert: false, temperatureVar: 0.22, uptimeHours: 650 },
  { id: 'CRY-001', vibrationRMS: 4.9, vibrationAlert: true, temperatureVar: 0.44, uptimeHours: 420 },
  { id: 'DRY-002', vibrationRMS: 2.4, vibrationAlert: false, temperatureVar: 0.28, uptimeHours: 300 },
]

export const batches: BatchData[] = [
  {
    id: 'BTH-2024-001',
    product: 'Monoclonal Antibody X1',
    productType: 'large-molecule',
    stage: 'Fermentation',
    progress: 78,
    status: 'running',
    startTime: new Date('2024-01-15T08:00:00Z'),
    equipment: ['BIO-001', 'CHR-001', 'FIL-001'],
    parameters: {
      temperature: { current: 37.2, target: 37.0, unit: '°C' },
      pressure: { current: 1.2, target: 1.1, unit: 'bar' },
      pH: { current: 7.1, target: 7.0, unit: 'pH' },
      volume: { current: 1850, target: 2000, unit: 'L' },
    },
    cppBounds: {
      temperature: { min: 36.5, max: 37.5, unit: '°C' },
      pressure: { min: 1.0, max: 1.2, unit: 'bar' },
      pH: { min: 6.8, max: 7.2, unit: 'pH' },
      volume: { min: 1800, max: 2000, unit: 'L' },
    },
    timeline: [
      { stage: 'Media Preparation', startTime: new Date('2024-01-15T08:00:00Z'), endTime: new Date('2024-01-15T10:00:00Z'), status: 'complete' },
      { stage: 'Inoculation', startTime: new Date('2024-01-15T10:00:00Z'), endTime: new Date('2024-01-15T11:00:00Z'), status: 'complete' },
      { stage: 'Fermentation', startTime: new Date('2024-01-15T11:00:00Z'), status: 'active' },
      { stage: 'Harvest', startTime: new Date('2024-01-16T11:00:00Z'), status: 'pending' },
      { stage: 'Purification', startTime: new Date('2024-01-16T15:00:00Z'), status: 'pending' },
    ],
  },
  {
    id: 'BTH-2024-002',
    product: 'Small Molecule API-Y',
    productType: 'small-molecule',
    stage: 'Crystallization',
    progress: 45,
    status: 'running',
    startTime: new Date('2024-01-16T14:30:00Z'),
    equipment: ['REA-001', 'CRY-001', 'DRY-002'],
    parameters: {
      temperature: { current: 25.1, target: 25.0, unit: '°C' },
      pressure: { current: 0.95, target: 1.0, unit: 'bar' },
      pH: { current: 3.2, target: 3.0, unit: 'pH' },
      volume: { current: 500, target: 500, unit: 'L' },
    },
    cppBounds: {
      temperature: { min: 24.5, max: 25.5, unit: '°C' },
      pressure: { min: 0.9, max: 1.1, unit: 'bar' },
      pH: { min: 2.8, max: 3.2, unit: 'pH' },
      volume: { min: 480, max: 520, unit: 'L' },
    },
    timeline: [
      { stage: 'Synthesis', startTime: new Date('2024-01-16T14:30:00Z'), endTime: new Date('2024-01-16T18:30:00Z'), status: 'complete' },
      { stage: 'Crystallization', startTime: new Date('2024-01-16T18:30:00Z'), status: 'active' },
      { stage: 'Filtration', startTime: new Date('2024-01-17T06:30:00Z'), status: 'pending' },
      { stage: 'Drying', startTime: new Date('2024-01-17T10:30:00Z'), status: 'pending' },
    ],
  },
  {
    id: 'BTH-2024-003',
    product: 'Monoclonal Antibody X1',
    productType: 'large-molecule',
    stage: 'Fermentation',
    progress: 62,
    status: 'warning',
    startTime: new Date('2024-01-16T07:45:00Z'),
    equipment: ['BIO-002', 'CHR-002', 'FIL-002'],
    parameters: {
      // Reflecting deviation DEV-2024-001: temperature excursion
      temperature: { current: 38.2, target: 37.0, unit: '°C' },
      pressure: { current: 1.15, target: 1.1, unit: 'bar' },
      pH: { current: 7.0, target: 7.0, unit: 'pH' },
      volume: { current: 1900, target: 2000, unit: 'L' },
    },
    cppBounds: {
      temperature: { min: 36.5, max: 37.5, unit: '°C' },
      pressure: { min: 1.0, max: 1.2, unit: 'bar' },
      pH: { min: 6.8, max: 7.2, unit: 'pH' },
      volume: { min: 1800, max: 2000, unit: 'L' },
    },
    timeline: [
      { stage: 'Media Preparation', startTime: new Date('2024-01-16T07:45:00Z'), endTime: new Date('2024-01-16T09:15:00Z'), status: 'complete' },
      { stage: 'Inoculation', startTime: new Date('2024-01-16T09:15:00Z'), endTime: new Date('2024-01-16T10:00:00Z'), status: 'complete' },
      { stage: 'Fermentation', startTime: new Date('2024-01-16T10:00:00Z'), status: 'active' },
      { stage: 'Harvest', startTime: new Date('2024-01-17T10:00:00Z'), status: 'pending' },
      { stage: 'Purification', startTime: new Date('2024-01-17T14:00:00Z'), status: 'pending' },
    ],
  },
]

export const getCPPCompliance = (batch: BatchData) => {
  const { parameters, cppBounds } = batch
  const checks = [
    parameters.temperature.current >= cppBounds.temperature.min && parameters.temperature.current <= cppBounds.temperature.max,
    parameters.pressure.current >= cppBounds.pressure.min && parameters.pressure.current <= cppBounds.pressure.max,
    parameters.pH.current >= cppBounds.pH.min && parameters.pH.current <= cppBounds.pH.max,
    parameters.volume.current >= cppBounds.volume.min && parameters.volume.current <= cppBounds.volume.max,
  ]
  const pass = checks.filter(Boolean).length
  return pass / checks.length
}
