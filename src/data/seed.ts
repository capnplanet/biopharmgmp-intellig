
import { BATCH_IDS } from '@/data/identifiers'
import { daysAgo, daysAhead, daysFromToday } from '@/lib/timeframe'

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

const MS_IN_HOUR = 60 * 60 * 1000
const MS_IN_MINUTE = 60 * 1000

const addHours = (date: Date, hours: number) => new Date(date.getTime() + hours * MS_IN_HOUR)
const addMinutes = (date: Date, minutes: number) => new Date(date.getTime() + minutes * MS_IN_MINUTE)

const batch1Start = daysAgo(1, 8)
const batch1InoculationStart = addHours(batch1Start, 2)
const batch1FermentationStart = addHours(batch1Start, 3)
const batch1HarvestStart = daysFromToday(0, 11)
const batch1PurificationStart = daysFromToday(0, 15)

const batch2Start = daysAgo(0, 14.5)
const batch2CrystallizationStart = addHours(batch2Start, 4)
const batch2FiltrationStart = daysFromToday(1, 6.5)
const batch2DryingStart = daysFromToday(1, 10.5)

const batch3Start = daysAgo(0, 7.75)
const batch3InoculationStart = addMinutes(batch3Start, 90)
const batch3FermentationStart = addHours(batch3Start, 2.25)
const batch3HarvestStart = daysFromToday(1, 10)
const batch3PurificationStart = daysFromToday(1, 14)

// Seed: equipment metadata
export const equipmentCalibration: EquipmentCalibration[] = [
  {
    id: 'BIO-001',
    name: 'Bioreactor 1',
    lastCalibration: daysAgo(30),
    nextDue: daysAhead(335),
    status: 'calibrated',
  },
  {
    id: 'BIO-002',
    name: 'Bioreactor 2',
    lastCalibration: daysAgo(45),
    nextDue: daysAhead(320),
    status: 'calibrated',
  },
  {
    id: 'CHR-001',
    name: 'Chromatography Skid A',
    lastCalibration: daysAgo(70),
    nextDue: daysAhead(295),
    status: 'calibrated',
  },
  {
    id: 'CHR-002',
    name: 'Chromatography Skid B',
    lastCalibration: daysAgo(80),
    nextDue: daysAhead(285),
    status: 'calibrated',
  },
  {
    id: 'FIL-001',
    name: 'Filter Train 1',
    lastCalibration: daysAgo(150),
    nextDue: daysAhead(20),
    status: 'due-soon',
  },
  {
    id: 'FIL-002',
    name: 'Filter Train 2',
    lastCalibration: daysAgo(170),
    nextDue: daysAhead(15),
    status: 'due-soon',
  },
  {
    id: 'REA-001',
    name: 'Reactor 1',
    lastCalibration: daysAgo(40),
    nextDue: daysAhead(330),
    status: 'calibrated',
  },
  {
    id: 'CRY-001',
    name: 'Crystallizer 1',
    lastCalibration: daysAgo(250),
    nextDue: daysAgo(10),
    status: 'overdue',
  },
  {
    id: 'DRY-002',
    name: 'Dryer 2',
    lastCalibration: daysAgo(210),
    nextDue: daysAhead(40),
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
    id: BATCH_IDS.monoclonal,
    product: 'Monoclonal Antibody X1',
    productType: 'large-molecule',
    stage: 'Fermentation',
    progress: 78,
    status: 'running',
    startTime: batch1Start,
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
      { stage: 'Media Preparation', startTime: batch1Start, endTime: addHours(batch1Start, 2), status: 'complete' },
      { stage: 'Inoculation', startTime: batch1InoculationStart, endTime: addHours(batch1InoculationStart, 1), status: 'complete' },
      { stage: 'Fermentation', startTime: batch1FermentationStart, status: 'active' },
      { stage: 'Harvest', startTime: batch1HarvestStart, status: 'pending' },
      { stage: 'Purification', startTime: batch1PurificationStart, status: 'pending' },
    ],
  },
  {
    id: BATCH_IDS.smallMolecule,
    product: 'Small Molecule API-Y',
    productType: 'small-molecule',
    stage: 'Crystallization',
    progress: 45,
    status: 'running',
    startTime: batch2Start,
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
      { stage: 'Synthesis', startTime: batch2Start, endTime: addHours(batch2Start, 4), status: 'complete' },
      { stage: 'Crystallization', startTime: batch2CrystallizationStart, status: 'active' },
      { stage: 'Filtration', startTime: batch2FiltrationStart, status: 'pending' },
      { stage: 'Drying', startTime: batch2DryingStart, status: 'pending' },
    ],
  },
  {
    id: BATCH_IDS.warning,
    product: 'Monoclonal Antibody X1',
    productType: 'large-molecule',
    stage: 'Fermentation',
    progress: 62,
    status: 'warning',
    startTime: batch3Start,
    equipment: ['BIO-002', 'CHR-002', 'FIL-002'],
    parameters: {
      // Reflecting an active temperature excursion scenario
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
      { stage: 'Media Preparation', startTime: batch3Start, endTime: addMinutes(batch3Start, 90), status: 'complete' },
      { stage: 'Inoculation', startTime: batch3InoculationStart, endTime: addMinutes(batch3InoculationStart, 45), status: 'complete' },
      { stage: 'Fermentation', startTime: batch3FermentationStart, status: 'active' },
      { stage: 'Harvest', startTime: batch3HarvestStart, status: 'pending' },
      { stage: 'Purification', startTime: batch3PurificationStart, status: 'pending' },
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
