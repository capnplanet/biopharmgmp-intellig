import { useEffect, useMemo, useState } from 'react'
import { batches as seedBatches, type BatchData } from '@/data/seed'
import { subscribeToTwin } from '@/lib/digitalTwin'

type BatchProgressInfo = {
  id: string
  progress: number
  status: BatchData['status']
  stage: string
  startTime: Date
  equipment: string[]
  timeline: BatchData['timeline']
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
  equipment: batch.equipment.slice(),
  timeline: batch.timeline.map(item => ({
    ...item,
    startTime: item.startTime instanceof Date ? new Date(item.startTime) : new Date(item.startTime),
    endTime: item.endTime ? (item.endTime instanceof Date ? new Date(item.endTime) : new Date(item.endTime)) : undefined,
  })),
})

export function useProductionBatches() {
  const [currentBatches, setCurrentBatches] = useState<BatchData[]>(() => seedBatches.map(cloneBatch))

  useEffect(() => {
    const unsubscribe = subscribeToTwin(snapshot => {
      setCurrentBatches(snapshot.batches.map(cloneBatch))
    })
    return () => {
      unsubscribe()
    }
  }, [])

  return currentBatches
}

export function useBatchProgressIndex() {
  const batches = useProductionBatches()

  return useMemo(() => {
    const index: Record<string, BatchProgressInfo> = {}
    batches.forEach(batch => {
      index[batch.id] = {
        id: batch.id,
        progress: batch.progress,
        status: batch.status,
        stage: batch.stage,
        startTime: batch.startTime,
        equipment: batch.equipment.slice(),
        timeline: batch.timeline.map(item => ({ ...item })),
      }
    })
    return index
  }, [batches])
}
