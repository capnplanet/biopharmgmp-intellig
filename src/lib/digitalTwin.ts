import { batches, equipmentTelemetry } from '@/data/seed'
import type { BatchData } from '@/data/seed'
import { sampleAndRecordPredictions } from '@/lib/modeling'

// Simple Gaussian noise
function randn() {
  // Box–Muller transform
  let u = 0, v = 0
  while (u === 0) u = Math.random()
  while (v === 0) v = Math.random()
  return Math.sqrt(-2.0 * Math.log(u)) * Math.cos(2.0 * Math.PI * v)
}

export type TwinOptions = {
  tickMs: number // real-time interval between ticks
  simSecondsPerTick: number // how many simulated seconds per tick
  monitorEverySimSeconds: number // how often to record predictions
}

export type TwinHandle = {
  start: () => void
  stop: () => void
  isRunning: () => boolean
  setSpeed: (simSecondsPerTick: number) => void
  getSpeed: () => number
}

export type TwinSnapshot = {
  timestamp: Date
  batches: typeof batches
  equipmentTelemetry: typeof equipmentTelemetry
}

type TwinListener = (snapshot: TwinSnapshot) => void

const listeners = new Set<TwinListener>()

export function subscribeToTwin(listener: TwinListener) {
  listeners.add(listener)
  return () => listeners.delete(listener)
}

const cloneBatch = (batch: BatchData): BatchData => ({
  ...batch,
  startTime: new Date(batch.startTime),
  parameters: {
    temperature: { ...batch.parameters.temperature },
    pressure: { ...batch.parameters.pressure },
    pH: { ...batch.parameters.pH },
    volume: { ...batch.parameters.volume },
  },
  cppBounds: {
    temperature: { ...batch.cppBounds.temperature },
    pressure: { ...batch.cppBounds.pressure },
    pH: { ...batch.cppBounds.pH },
    volume: { ...batch.cppBounds.volume },
  },
  timeline: batch.timeline.map(item => ({
    ...item,
    startTime: new Date(item.startTime),
    endTime: item.endTime ? new Date(item.endTime) : undefined,
  })),
})

const cloneEquipment = (item: typeof equipmentTelemetry[number]) => ({ ...item })

const cloneSnapshot = (): TwinSnapshot => ({
  timestamp: new Date(),
  batches: batches.map(cloneBatch),
  equipmentTelemetry: equipmentTelemetry.map(cloneEquipment),
})

let timer: number | undefined
let opts: TwinOptions = { tickMs: 2000, simSecondsPerTick: 60, monitorEverySimSeconds: 30 }
let simAccum = 0

// Internal state for transient events (e.g., equipment alerts)
const eqAlertDecay: Record<string, number> = {}
const batchWarningDecay: Record<string, number> = {}
let batchSequence = batches.length

const generateBatchId = () => {
  batchSequence += 1
  const stamp = new Date().toISOString().replace(/[-:TZ.]/g, '').slice(0, 12)
  return `BTH-${stamp}-${batchSequence.toString().padStart(3, '0')}`
}

const createNewBatchFrom = (template: BatchData): BatchData => {
  const now = new Date()
  const newTimeline = template.timeline.map((item, index) => ({
    ...item,
    startTime: index === 0 ? now : new Date(now.getTime() + index * 60 * 60 * 1000),
    endTime: undefined,
    status: (index === 0 ? 'active' : 'pending') as BatchData['timeline'][number]['status'],
  }))
  const nextParameters: BatchData['parameters'] = {
    temperature: {
      ...template.parameters.temperature,
      current: template.parameters.temperature.target + randn() * 0.15,
    },
    pressure: {
      ...template.parameters.pressure,
      current: template.parameters.pressure.target + randn() * 0.03,
    },
    pH: {
      ...template.parameters.pH,
      current: template.parameters.pH.target + randn() * 0.05,
    },
    volume: {
      ...template.parameters.volume,
      current: Math.max(template.cppBounds.volume.min, Math.min(template.cppBounds.volume.max, template.parameters.volume.target + randn() * 25)),
    },
  }
  return {
    ...template,
    id: generateBatchId(),
    stage: newTimeline.find(item => item.status === 'active')?.stage ?? template.stage,
    progress: Math.max(0, Math.min(5, randn() * 2 + 1)),
    status: 'running',
    startTime: now,
    parameters: nextParameters,
    timeline: newTimeline,
  }
}

const clearBatchState = (batchId: string) => {
  delete batchWarningDecay[batchId]
}

const TRANSIENT_EVENT_PROB = 0.006
const WARNING_RECOVERY_PROB = 0.05
const MIN_WARNING_TICKS = 2
const MAX_WARNING_TICKS = 5

function tick() {
  const dtSec = opts.simSecondsPerTick

  // Update batches: progress and CPPs drift around targets with small noise
  const completed: Array<{ index: number; template: BatchData }> = []
  for (let i = 0; i < batches.length; i++) {
    const b = batches[i]
    // Progress: advance slowly if running
    if (b.status === 'running' || b.status === 'warning') {
      const progressDelta = (dtSec / 3600) * (0.5 + Math.random() * 0.8) // ~0.5–1.3% per sim hour
      b.progress = Math.min(100, Math.max(0, b.progress + progressDelta))
  if (b.progress >= 100) {
        b.status = 'complete'
        // Mark active timeline stage complete if needed
        const active = b.timeline.find(t => t.status === 'active')
        if (active && !active.endTime) {
          active.status = 'complete'
          active.endTime = new Date()
        }
        completed.push({ index: i, template: cloneBatch(b) })
      }
    }

    const p = b.parameters
    // Ornstein–Uhlenbeck style drift toward target with noise
    const step = (cur: number, target: number, k: number, sigma: number) => {
      const drift = k * (target - cur) * (dtSec / 60) // stronger drift for larger dt
      const noise = sigma * Math.sqrt(dtSec / 60) * randn()
      return cur + drift + noise
    }

    p.temperature.current = step(p.temperature.current, p.temperature.target, 0.05, 0.06)
    p.pressure.current = step(p.pressure.current, p.pressure.target, 0.06, 0.02)
    p.pH.current = step(p.pH.current, p.pH.target, 0.04, 0.015)
    // Volume tends to target slowly (e.g., feed)
    p.volume.current = step(p.volume.current, p.volume.target, 0.02, 0.5)

    const warningTicksRemaining = batchWarningDecay[b.id] || 0

    // Occasionally introduce a transient deviation for realism
    if (Math.random() < TRANSIENT_EVENT_PROB) {
      const which = Math.floor(Math.random() * 3)
      if (which === 0) p.temperature.current += 0.3 + 0.15 * Math.random()
      if (which === 1) p.pressure.current += (Math.random() < 0.5 ? -1 : 1) * (0.05 + 0.03 * Math.random())
      if (which === 2) p.pH.current += (Math.random() < 0.5 ? -1 : 1) * (0.1 + 0.04 * Math.random())
      if (b.status === 'running') {
        b.status = 'warning'
        batchWarningDecay[b.id] = MIN_WARNING_TICKS + Math.floor(Math.random() * (MAX_WARNING_TICKS - MIN_WARNING_TICKS + 1))
      }
    } else if (b.status === 'warning') {
      if (warningTicksRemaining > 0) {
        batchWarningDecay[b.id] = warningTicksRemaining - 1
      } else if (Math.random() < WARNING_RECOVERY_PROB) {
        b.status = 'running'
        delete batchWarningDecay[b.id]
      }
    }
  }

  if (completed.length > 0) {
    for (const { index, template } of completed) {
      clearBatchState(template.id)
      batches[index] = createNewBatchFrom(template)
    }
  }

  // Update equipment telemetry
  for (const e of equipmentTelemetry) {
    const baseRms = 2.2 + (e.id.includes('FIL') ? 0.8 : 0) + (e.id.includes('CRY') ? 1.2 : 0)
    const k = 0.08
    const sigma = 0.15
    // Drift toward base plus noise
    e.vibrationRMS = Math.max(0.4, e.vibrationRMS + k * (baseRms - e.vibrationRMS) + sigma * randn())

    // Temperature variance small drift
    e.temperatureVar = Math.max(0.05, e.temperatureVar + 0.02 * randn())

    // Uptime increases with simulated time
    e.uptimeHours += dtSec / 3600

    // Random spikes/alerts with decay
    if (!e.vibrationAlert && Math.random() < 0.01) {
      e.vibrationAlert = true
      eqAlertDecay[e.id] = 3 + Math.floor(Math.random() * 4) // 3–6 ticks
      e.vibrationRMS += 1.2 + 0.6 * Math.random()
    } else if (e.vibrationAlert) {
      eqAlertDecay[e.id] = (eqAlertDecay[e.id] || 0) - 1
      // During alert, keep RMS elevated and noisy
      e.vibrationRMS += 0.2 + 0.4 * Math.random()
      if (eqAlertDecay[e.id] <= 0) {
        e.vibrationAlert = false
      }
    }

    // Soft clamp to realistic range
    e.vibrationRMS = Math.min(6.5, Math.max(0.5, e.vibrationRMS))
    e.temperatureVar = Math.min(0.8, Math.max(0.05, e.temperatureVar))
  }

  // Periodically record model predictions based on current state
  simAccum += dtSec
  if (simAccum >= opts.monitorEverySimSeconds) {
    simAccum = 0
    try { sampleAndRecordPredictions() } catch { /* no-op */ }
  }

  if (listeners.size > 0) {
    const snapshot = cloneSnapshot()
    listeners.forEach(listener => {
      try {
        listener(snapshot)
      } catch (error) {
        console.error('Twin listener error', error)
      }
    })
  }
}

function startTimer() {
  if (timer !== undefined) return
  timer = window.setInterval(tick, opts.tickMs)
}

function stopTimer() {
  if (timer !== undefined) {
    window.clearInterval(timer)
    timer = undefined
  }
}

export function startDigitalTwin(partial?: Partial<TwinOptions>): TwinHandle {
  opts = { ...opts, ...partial }
  startTimer()
  return handle
}

export function getDigitalTwin(): TwinHandle | undefined {
  return handle.isRunning() ? handle : handle
}

const handle: TwinHandle = {
  start: () => startTimer(),
  stop: () => stopTimer(),
  isRunning: () => timer !== undefined,
  setSpeed: (simSecondsPerTick: number) => { opts.simSecondsPerTick = Math.max(1, simSecondsPerTick) },
  getSpeed: () => opts.simSecondsPerTick,
}
