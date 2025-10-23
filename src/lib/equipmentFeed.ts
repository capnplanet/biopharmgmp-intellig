import { startDigitalTwin, subscribeToTwin, type TwinHandle, type TwinOptions, type TwinSnapshot } from '@/lib/digitalTwin'

type SubscribeFn = (listener: (snapshot: TwinSnapshot) => void) => () => void

type EquipmentFeed = {
  subscribe: SubscribeFn
  start?: (options?: Partial<TwinOptions>) => void
  stop?: () => void
  setSpeed?: (speed: number) => void
  getSpeed?: () => number
}

let twinHandle: TwinHandle | null = null

const ensureTwinHandle = (options?: Partial<TwinOptions>) => {
  if (!twinHandle || options) {
    twinHandle = startDigitalTwin(options)
  }
  return twinHandle
}

const defaultFeed: EquipmentFeed = {
  subscribe: (listener) => subscribeToTwin(listener),
  start: (options?: Partial<TwinOptions>) => {
    const handle = ensureTwinHandle(options)
    handle.start()
  },
  stop: () => {
    if (!twinHandle) {
      twinHandle = startDigitalTwin()
    }
    twinHandle.stop()
  },
  setSpeed: (speed: number) => {
    const handle = ensureTwinHandle()
    handle.setSpeed(speed)
  },
  getSpeed: () => {
    const handle = ensureTwinHandle()
    return handle.getSpeed()
  },
}

let activeFeed: EquipmentFeed = { ...defaultFeed }
let usingCustomFeed = false

export function registerEquipmentFeed(feed: EquipmentFeed) {
  activeFeed = {
    subscribe: feed.subscribe,
    start: feed.start ?? defaultFeed.start,
    stop: feed.stop ?? defaultFeed.stop,
    setSpeed: feed.setSpeed ?? defaultFeed.setSpeed,
    getSpeed: feed.getSpeed ?? defaultFeed.getSpeed,
  }
  usingCustomFeed = true
}

export function resetEquipmentFeed() {
  activeFeed = { ...defaultFeed }
  usingCustomFeed = false
}

export function subscribeToEquipmentFeed(listener: (snapshot: TwinSnapshot) => void) {
  return activeFeed.subscribe(listener)
}

export function ensureEquipmentFeed(options?: Partial<TwinOptions>) {
  activeFeed.start?.(options)
}

export function stopEquipmentFeed() {
  activeFeed.stop?.()
}

export function getEquipmentFeedController() {
  return activeFeed
}

export function isUsingCustomEquipmentFeed() {
  return usingCustomFeed
}
