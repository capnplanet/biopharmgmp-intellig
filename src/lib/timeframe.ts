const MS_IN_MINUTE = 60 * 1000
const MS_IN_HOUR = 60 * MS_IN_MINUTE
const MS_IN_DAY = 24 * MS_IN_HOUR

const anchorNow = new Date()
const startOfTodayUtc = new Date(Date.UTC(anchorNow.getUTCFullYear(), anchorNow.getUTCMonth(), anchorNow.getUTCDate()))

export const now = () => new Date(anchorNow.getTime())
export const startOfToday = () => new Date(startOfTodayUtc.getTime())

export const minutesFromNow = (minutes: number) => new Date(anchorNow.getTime() + minutes * MS_IN_MINUTE)
export const hoursFromNow = (hours: number) => new Date(anchorNow.getTime() + hours * MS_IN_HOUR)

export const hoursFromToday = (hours: number) => new Date(startOfTodayUtc.getTime() + hours * MS_IN_HOUR)
export const daysFromToday = (days: number, hours = 0) => new Date(startOfTodayUtc.getTime() + days * MS_IN_DAY + hours * MS_IN_HOUR)
export const daysAgo = (days: number, hours = 0) => daysFromToday(-days, hours)
export const daysAhead = (days: number, hours = 0) => daysFromToday(days, hours)

export const calendarYear = startOfTodayUtc.getUTCFullYear()
export const previousYear = calendarYear - 1
export const nextYear = calendarYear + 1

export const formatDate = (date: Date) => date.toISOString().slice(0, 10)
