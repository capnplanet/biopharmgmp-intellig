import { useState, useEffect, useMemo, useCallback } from 'react'
import { useKV } from '@github/spark/hooks'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Tooltip, TooltipTrigger, TooltipContent } from '@/components/ui/tooltip'
import { Badge } from '@/components/ui/badge'
import { Progress } from '@/components/ui/progress'
import { Button } from '@/components/ui/button'
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu'
import {
  ChartContainer,
  ChartLegendInline,
  ChartTooltip,
  ChartTooltipContent,
  type ChartConfig,
} from '@/components/ui/chart'
import { 
  TestTube, 
  Gear, 
  Warning, 
  CheckCircle,
  Clock,
  TrendUp,
  Info,
  XCircle,
  DownloadSimple
} from '@phosphor-icons/react'
import { formatDistanceToNow } from 'date-fns'
import { useAlerts } from '@/hooks/use-alerts'
import type { AlertSeverity } from '@/types/alerts'
import { ensureEquipmentFeed, subscribeToEquipmentFeed } from '@/lib/equipmentFeed'
import { batches as seedBatches, equipmentTelemetry as seedEquipmentTelemetry, getCPPCompliance } from '@/data/seed'
import { deriveDisplayData, getEquipmentMeta } from '@/data/equipmentCatalog'
import type { BatchData, EquipmentTelemetry } from '@/data/seed'
import type { AutomationSuggestion } from '@/types/automation'
import type { CAPA, ChangeControl, Deviation, Investigation } from '@/types/quality'
import { Area, Bar, BarChart, CartesianGrid, ComposedChart, Line, XAxis, YAxis } from 'recharts'

interface KPICardProps {
  title: string
  value: string | number
  change?: string
  status?: 'normal' | 'warning' | 'critical'
  icon: React.ComponentType<{ className?: string }>
}

function KPICard({ title, value, change, status = 'normal', icon: Icon }: KPICardProps) {
  const statusColors = {
    normal: 'text-success',
    warning: 'text-warning',
    critical: 'text-destructive'
  }

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
        <CardTitle className="text-sm font-medium text-muted-foreground">
          {title}
        </CardTitle>
        <Icon className={`h-4 w-4 ${statusColors[status]}`} />
      </CardHeader>
      <CardContent>
        <div className="text-2xl font-bold font-mono">{value}</div>
        {change && (
          <p className="text-xs text-muted-foreground">
            {change}
          </p>
        )}
      </CardContent>
    </Card>
  )
}

type EquipmentDisplayStatus = 'online' | 'offline' | 'maintenance' | 'warning' | 'error'

type EquipmentSnapshot = {
  id: string
  name: string
  type: string
  status: EquipmentDisplayStatus
  utilization: number
  vibrationRMS: number
}

type TwinHistoryPoint = {
  timestamp: string
  activeBatches: number
  runningBatches: number
  warningBatches: number
  cppCompliance: number
}

export function Dashboard() {
  const [batchState, setBatchState] = useState<BatchData[]>(seedBatches)
  const [equipmentTelemetryState, setEquipmentTelemetryState] = useState<EquipmentTelemetry[]>(seedEquipmentTelemetry)
  const [twinHistory, setTwinHistory] = useState<TwinHistoryPoint[]>([])
  const [currentTime, setCurrentTime] = useState(new Date())
  const { alerts } = useAlerts()
  const [deviations = []] = useKV<Deviation[]>('deviations', [])
  const [automationQueue = []] = useKV<AutomationSuggestion[]>('automation-queue', [])
  const [capas = []] = useKV<CAPA[]>('capas', [])
  const [changeControls = []] = useKV<ChangeControl[]>('change-controls', [])
  const [investigations = []] = useKV<Investigation[]>('investigations', [])

  const recentAlerts = useMemo(() => {
    return [...(alerts ?? [])]
      .sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime())
      .slice(0, 6)
  }, [alerts])

  const activeBatches = useMemo(() => batchState.filter(batch => batch.status === 'running' || batch.status === 'warning'), [batchState])

  const equipment = useMemo<EquipmentSnapshot[]>(() => {
    return equipmentTelemetryState.map(item => {
      const summary = deriveDisplayData(item)
      const meta = summary.meta ?? getEquipmentMeta(item.id)
      const label = meta ? `${meta.classification} • ${meta.processArea}` : 'Equipment'
      let status: EquipmentDisplayStatus = summary.status
      if (summary.status === 'online' && item.vibrationAlert) {
        status = 'warning'
      }
      return {
        id: item.id,
        name: meta?.name ?? item.id,
        type: label,
        status,
        utilization: summary.utilization,
        vibrationRMS: Number(item.vibrationRMS.toFixed(2)),
      }
    })
  }, [equipmentTelemetryState])

  const warningBatchCount = useMemo(() => batchState.filter(batch => batch.status === 'warning').length, [batchState])
  const averageCompliance = useMemo(() => {
    if (!batchState.length) return 0
    const value = batchState.reduce((acc, batch) => acc + getCPPCompliance(batch), 0) / batchState.length
    return Number((value * 100).toFixed(1))
  }, [batchState])
  const onlineEquipment = useMemo(() => equipment.filter(item => item.status === 'online').length, [equipment])
  const equipmentWarningCount = useMemo(() => equipment.filter(item => item.status === 'warning').length, [equipment])
  const meanVibration = useMemo(() => {
    if (!equipment.length) return 0
    const avg = equipment.reduce((acc, item) => acc + item.vibrationRMS, 0) / equipment.length
    return Number(avg.toFixed(2))
  }, [equipment])
  const openDeviationCount = useMemo(
    () => deviations.filter(dev => dev.status === 'open' || dev.status === 'investigating').length,
    [deviations]
  )
  const criticalDeviationCount = useMemo(
    () => deviations.filter(dev => dev.severity === 'critical' && dev.status !== 'closed').length,
    [deviations]
  )
  const automationPending = useMemo(
    () => automationQueue.filter(item => item.status === 'pending').length,
    [automationQueue]
  )
  const automationResolved = useMemo(
    () => automationQueue.filter(item => item.status === 'accepted').length,
    [automationQueue]
  )
  const capaActive = useMemo(
    () => capas.filter(item => item.status !== 'complete').length,
    [capas]
  )
  const activeChangeControls = useMemo(
    () => changeControls.filter(item => item.status !== 'closed').length,
    [changeControls]
  )
  const activeInvestigationCount = useMemo(
    () => investigations.filter(item => item.status !== 'closed').length,
    [investigations]
  )

  const twinSeries = useMemo(() => {
    const source = twinHistory.length
      ? twinHistory
      : [{
          timestamp: new Date().toISOString(),
          activeBatches: activeBatches.length,
          runningBatches: Math.max(activeBatches.length - warningBatchCount, 0),
          warningBatches: warningBatchCount,
          cppCompliance: averageCompliance,
        }]
    return source.map(point => {
      const running = Math.max(point.runningBatches, 0)
      const warnings = Math.max(point.warningBatches, 0)
      const total = Math.max(point.activeBatches, running + warnings)
      return {
        time: new Date(point.timestamp).toLocaleTimeString(),
        running,
        warnings,
        total,
        compliance: Number(point.cppCompliance.toFixed(2)),
      }
    })
  }, [twinHistory, activeBatches.length, warningBatchCount, averageCompliance])

  const deviationSeverityData = useMemo(() => {
    const buckets: Record<'low' | 'medium' | 'high' | 'critical', number> = {
      low: 0,
      medium: 0,
      high: 0,
      critical: 0,
    }
    deviations.forEach(dev => {
      if (dev.status === 'closed') return
      buckets[dev.severity] += 1
    })
    return Object.entries(buckets).map(([severity, count]) => ({
      severity,
      label: `${severity.charAt(0).toUpperCase()}${severity.slice(1)}`,
      count,
    }))
  }, [deviations])

  const capaStatusData = useMemo(() => {
    const buckets: Record<string, number> = {}
    capas.forEach(capa => {
      buckets[capa.status] = (buckets[capa.status] ?? 0) + 1
    })
    return Object.entries(buckets).map(([status, count]) => ({
      status,
      label: status.replace(/-/g, ' ').replace(/\b\w/g, (char) => char.toUpperCase()),
      count,
    }))
  }, [capas])

  const twinChartConfig: ChartConfig = {
    running: { label: 'Running Batches', color: '#2563eb' },
    warnings: { label: 'Warning Batches', color: '#f59e0b' },
    total: { label: 'Total Active Batches', color: '#0f172a' },
    compliance: { label: 'CPP Compliance %', color: '#16a34a' },
  }

  const deviationChartConfig: ChartConfig = {
    count: { label: 'Open Deviations', color: '#9333ea' },
  }

  const capaChartConfig: ChartConfig = {
    count: { label: 'CAPA Records', color: '#0ea5e9' },
  }

  const hasDeviationData = useMemo(() => deviationSeverityData.some(item => item.count > 0), [deviationSeverityData])
  const hasCapaData = useMemo(() => capaStatusData.some(item => item.count > 0), [capaStatusData])

  const exportSummary = useMemo(() => ({
    activeBatches: activeBatches.length,
    warningBatches: warningBatchCount,
    averageCppCompliance: averageCompliance,
    onlineEquipment,
    equipmentWarnings: equipmentWarningCount,
    meanVibrationRms: meanVibration,
    openDeviations: openDeviationCount,
    criticalDeviations: criticalDeviationCount,
    automationPending,
    automationAccepted: automationResolved,
    capaActive,
    changeControlsActive: activeChangeControls,
    investigationsActive: activeInvestigationCount,
  }), [
    activeBatches.length,
    warningBatchCount,
    averageCompliance,
    onlineEquipment,
    equipmentWarningCount,
    meanVibration,
    openDeviationCount,
    criticalDeviationCount,
    automationPending,
    automationResolved,
    capaActive,
    activeChangeControls,
    activeInvestigationCount,
  ])

  const exportDataset = useMemo(() => ({
    timeSeries: twinHistory,
    deviationSeverity: deviationSeverityData,
    capaStatus: capaStatusData,
  }), [twinHistory, deviationSeverityData, capaStatusData])

  const handleExport = useCallback((format: 'json' | 'csv') => {
    const timestamp = new Date().toISOString()
    if (format === 'json') {
      const jsonPayload = {
        generatedAt: timestamp,
        summary: exportSummary,
        dataset: exportDataset,
      }
      const blob = new Blob([JSON.stringify(jsonPayload, null, 2)], { type: 'application/json' })
      const url = URL.createObjectURL(blob)
      const link = document.createElement('a')
      link.href = url
      link.download = `dashboard-metrics-${timestamp}.json`
      document.body.appendChild(link)
      link.click()
      document.body.removeChild(link)
      URL.revokeObjectURL(url)
      return
    }

    const csvLines: string[] = []
    csvLines.push('Metric,Value')
    for (const [metric, value] of Object.entries(exportSummary)) {
      csvLines.push(`${metric},${value}`)
    }
    csvLines.push('')
    csvLines.push('Timestamp,Active Batches,Running Batches,Warning Batches,CPP Compliance')
    if (exportDataset.timeSeries.length === 0) {
      csvLines.push(`${new Date().toISOString()},${activeBatches.length},${Math.max(activeBatches.length - warningBatchCount, 0)},${warningBatchCount},${averageCompliance}`)
    } else {
      exportDataset.timeSeries.forEach(point => {
        csvLines.push(`${point.timestamp},${point.activeBatches},${point.runningBatches},${point.warningBatches},${point.cppCompliance}`)
      })
    }
    csvLines.push('')
    csvLines.push('Deviation Severity,Count')
    exportDataset.deviationSeverity.forEach(item => {
      csvLines.push(`${item.severity},${item.count}`)
    })
    csvLines.push('')
    csvLines.push('CAPA Status,Count')
    exportDataset.capaStatus.forEach(item => {
      csvLines.push(`${item.status},${item.count}`)
    })

    const blob = new Blob([csvLines.join('\n')], { type: 'text/csv' })
    const url = URL.createObjectURL(blob)
    const link = document.createElement('a')
    link.href = url
    link.download = `dashboard-metrics-${timestamp}.csv`
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
    URL.revokeObjectURL(url)
  }, [
    exportSummary,
    exportDataset,
    activeBatches.length,
    warningBatchCount,
    averageCompliance,
  ])

  const severityStyles: Record<AlertSeverity, { container: string; iconClass: string; Icon: React.ComponentType<{ className?: string }> }> = {
    info: { container: 'bg-primary/10', iconClass: 'text-primary', Icon: Info },
    success: { container: 'bg-success/10', iconClass: 'text-success', Icon: CheckCircle },
    warning: { container: 'bg-warning/10', iconClass: 'text-warning', Icon: Warning },
    error: { container: 'bg-destructive/10', iconClass: 'text-destructive', Icon: XCircle }
  }

  useEffect(() => {
    ensureEquipmentFeed()
    const unsubscribe = subscribeToEquipmentFeed(snapshot => {
      setBatchState(snapshot.batches)
      setEquipmentTelemetryState(snapshot.equipmentTelemetry)
      const runningCount = snapshot.batches.filter(batch => batch.status === 'running').length
      const warningCount = snapshot.batches.filter(batch => batch.status === 'warning').length
      const activeCount = runningCount + warningCount
      const compliance = snapshot.batches.length
        ? snapshot.batches.reduce((acc, batch) => acc + getCPPCompliance(batch), 0) / snapshot.batches.length
        : 0
      const point: TwinHistoryPoint = {
        timestamp: snapshot.timestamp.toISOString(),
        activeBatches: activeCount,
        runningBatches: runningCount,
        warningBatches: warningCount,
        cppCompliance: Number((compliance * 100).toFixed(2)),
      }
      setTwinHistory(prev => [...prev.slice(-47), point])
    })
    return () => {
      unsubscribe()
    }
  }, [])

  useEffect(() => {
    const timer = setInterval(() => setCurrentTime(new Date()), 1000)
    return () => clearInterval(timer)
  }, [])

  const getStatusBadge = (status: string) => {
    const variants = {
      running: 'bg-success text-success-foreground',
      complete: 'bg-primary text-primary-foreground',
      warning: 'bg-warning text-warning-foreground',
      error: 'bg-destructive text-destructive-foreground',
      online: 'bg-success text-success-foreground',
      offline: 'bg-muted text-muted-foreground',
      maintenance: 'bg-warning text-warning-foreground'
    }
    
    return variants[status as keyof typeof variants] || variants.offline
  }

  return (
    <div className="p-6 space-y-6 overflow-auto h-full">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Manufacturing Dashboard</h1>
          <p className="text-muted-foreground">Real-time overview of GMP manufacturing operations</p>
        </div>
        <div className="flex flex-col items-end gap-2">
          <div className="text-right">
            <div className="text-sm text-muted-foreground">Current Time</div>
            <div className="text-lg font-mono">{currentTime.toLocaleTimeString()}</div>
          </div>
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="outline" size="sm" className="flex items-center gap-2">
                <DownloadSimple className="h-4 w-4" />
                Export KPIs
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-40">
              <DropdownMenuItem
                onSelect={(event) => {
                  event.preventDefault()
                  handleExport('json')
                }}
              >
                Export JSON
              </DropdownMenuItem>
              <DropdownMenuItem
                onSelect={(event) => {
                  event.preventDefault()
                  handleExport('csv')
                }}
              >
                Export CSV
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Tooltip>
          <TooltipTrigger asChild>
            <div>
              <KPICard
                title="Active Batches"
                value={activeBatches.length}
                change={`${warningBatchCount} with active warnings`}
                status={warningBatchCount > 0 ? 'warning' : 'normal'}
                icon={TestTube}
              />
            </div>
          </TooltipTrigger>
          <TooltipContent>
            Batches currently running or flagged with warnings based on digital twin telemetry.
          </TooltipContent>
        </Tooltip>
        <Tooltip>
          <TooltipTrigger asChild>
            <div>
              <KPICard
                title="Equipment Online"
                value={`${onlineEquipment}/${equipment.length}`}
                change={`Avg vibration ${meanVibration} mm/s`}
                status={equipmentWarningCount > 0 ? 'warning' : onlineEquipment === 0 ? 'critical' : 'normal'}
                icon={Gear}
              />
            </div>
          </TooltipTrigger>
          <TooltipContent>
            Equipment availability vs total catalog. Mean vibration derived from last twin snapshot.
          </TooltipContent>
        </Tooltip>
        <Tooltip>
          <TooltipTrigger asChild>
            <div>
              <KPICard
                title="Open Deviations"
                value={openDeviationCount}
                change={`${criticalDeviationCount} critical`}
                status={criticalDeviationCount > 0 ? 'critical' : openDeviationCount > 0 ? 'warning' : 'normal'}
                icon={Warning}
              />
            </div>
          </TooltipTrigger>
          <TooltipContent>
            Open or investigating deviations synchronized with the quality management workspace.
          </TooltipContent>
        </Tooltip>
        <Tooltip>
          <TooltipTrigger asChild>
            <div>
              <KPICard
                title="Automation Backlog"
                value={automationPending}
                change={`${automationResolved} approved in review`}
                status={automationPending > 3 ? 'critical' : automationPending > 0 ? 'warning' : 'normal'}
                icon={Clock}
              />
            </div>
          </TooltipTrigger>
          <TooltipContent>
            Pending automation suggestions awaiting quality disposition vs accepted recommendations.
          </TooltipContent>
        </Tooltip>
        <Tooltip>
          <TooltipTrigger asChild>
            <div>
              <KPICard
                title="CPP Compliance"
                value={`${averageCompliance.toFixed(1)}%`}
                change={`${activeInvestigationCount} active investigations`}
                status={averageCompliance < 92 ? 'critical' : averageCompliance < 97 ? 'warning' : 'normal'}
                icon={CheckCircle}
              />
            </div>
          </TooltipTrigger>
          <TooltipContent>
            Average percentage of critical process parameters within bounds across live batches.
          </TooltipContent>
        </Tooltip>
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <TrendUp className="h-5 w-5" />
              Production Pulse
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <ChartContainer className="h-64" config={twinChartConfig}>
              <ComposedChart data={twinSeries} margin={{ left: 8, right: 16, top: 8, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} />
                <XAxis dataKey="time" tickLine={false} axisLine={false} minTickGap={32} />
                <YAxis yAxisId="left" tickLine={false} axisLine={false} allowDecimals={false} width={40} />
                <YAxis yAxisId="right" orientation="right" tickLine={false} axisLine={false} domain={[0, 100]} width={40} />
                <ChartTooltip
                  content={
                    <ChartTooltipContent
                      labelFormatter={(_label, payload) => {
                        const totalActive = (payload?.find(item => item.dataKey === 'total')?.value ?? payload?.[0]?.payload?.total ?? 0) as number
                        return (
                          <div className="flex items-center justify-between gap-4">
                            <span>Production Pulse</span>
                            <span className="text-muted-foreground">Total active {totalActive}</span>
                          </div>
                        )
                      }}
                      formatter={(value, name, item) => {
                        if (item?.dataKey === 'compliance') {
                          return <span>{Number(value).toFixed(1)}%</span>
                        }
                        return <span>{Number(value).toFixed(0)}</span>
                      }}
                    />
                  }
                />
                <Area
                  yAxisId="left"
                  type="monotone"
                  dataKey="running"
                  name="Running Batches"
                  fill="var(--color-running)"
                  stroke="var(--color-running)"
                  fillOpacity={0.2}
                  strokeWidth={2}
                  stackId="batches"
                />
                <Area
                  yAxisId="left"
                  type="monotone"
                  dataKey="warnings"
                  name="Warning Batches"
                  fill="var(--color-warnings)"
                  stroke="var(--color-warnings)"
                  fillOpacity={0.35}
                  strokeDasharray="4 3"
                  stackId="batches"
                />
                <Line
                  yAxisId="left"
                  type="monotone"
                  dataKey="total"
                  name="Total Active Batches"
                  stroke="var(--color-total)"
                  strokeWidth={2}
                  dot={false}
                  strokeDasharray="5 2"
                />
                <Line
                  yAxisId="right"
                  type="monotone"
                  dataKey="compliance"
                  name="CPP Compliance %"
                  stroke="var(--color-compliance)"
                  strokeWidth={2}
                  dot={false}
                />
              </ComposedChart>
            </ChartContainer>
            <ChartLegendInline
              align="left"
              items={[
                { key: 'running', label: 'Running Batches', color: '#2563eb' },
                { key: 'warnings', label: 'Warning Batches', color: '#f59e0b', dashed: true },
                { key: 'total', label: 'Total Active Batches', color: '#0f172a', dashed: true },
                { key: 'compliance', label: 'CPP Compliance %', color: '#16a34a' },
              ]}
            />
            <p className="text-xs text-muted-foreground">
              The solid line tracks the total number of active batches. Variations in the stacked areas indicate shifts between running and warning states, ensuring the chart only changes when production activity actually does.
            </p>
            <div className="grid grid-cols-3 gap-4 text-sm">
              <div>
                <div className="text-xs uppercase text-muted-foreground">Active</div>
                <div className="text-lg font-semibold font-mono">{activeBatches.length}</div>
              </div>
              <div>
                <div className="text-xs uppercase text-muted-foreground">Warnings</div>
                <div className="text-lg font-semibold font-mono">{warningBatchCount}</div>
              </div>
              <div>
                <div className="text-xs uppercase text-muted-foreground">Avg CPP %</div>
                <div className="text-lg font-semibold font-mono">{averageCompliance.toFixed(1)}%</div>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Warning className="h-5 w-5 text-warning" />
              Quality Oversight
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-6">
            <div>
              <div className="flex items-center justify-between mb-2">
                <h4 className="text-sm font-medium text-muted-foreground">Deviation Severity Mix</h4>
                <Badge variant="outline">{openDeviationCount} open</Badge>
              </div>
              {hasDeviationData ? (
                <ChartContainer className="h-52" config={deviationChartConfig}>
                  <BarChart data={deviationSeverityData} margin={{ left: 8, right: 16, top: 8, bottom: 0 }}>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} />
                    <XAxis dataKey="label" axisLine={false} tickLine={false} />
                    <YAxis allowDecimals={false} axisLine={false} tickLine={false} width={36} />
                    <ChartTooltip
                      content={
                        <ChartTooltipContent
                          formatter={(value, _name, item) => (
                            <span>{`${value} ${item?.payload?.severity ?? ''}`}</span>
                          )}
                        />
                      }
                    />
                    <Bar dataKey="count" radius={[6, 6, 0, 0]} fill="var(--color-count)" />
                  </BarChart>
                </ChartContainer>
              ) : (
                <div className="h-52 flex items-center justify-center text-sm text-muted-foreground bg-muted/40 rounded-lg">
                  No open deviations at this time.
                </div>
              )}
            </div>
            <div>
              <div className="flex items-center justify-between mb-2">
                <h4 className="text-sm font-medium text-muted-foreground">CAPA Status Load</h4>
                <Badge variant="outline">{capaActive} active</Badge>
              </div>
              {hasCapaData ? (
                <ChartContainer className="h-52" config={capaChartConfig}>
                  <BarChart data={capaStatusData} margin={{ left: 8, right: 16, top: 8, bottom: 0 }}>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} />
                    <XAxis dataKey="label" axisLine={false} tickLine={false} interval={0} angle={-20} textAnchor="end" height={60} />
                    <YAxis allowDecimals={false} axisLine={false} tickLine={false} width={36} />
                    <ChartTooltip
                      content={
                        <ChartTooltipContent
                          formatter={(value, _name, item) => (
                            <span>{`${value} ${item?.payload?.status ?? ''}`}</span>
                          )}
                        />
                      }
                    />
                    <Bar dataKey="count" radius={[6, 6, 0, 0]} fill="var(--color-count)" />
                  </BarChart>
                </ChartContainer>
              ) : (
                <div className="h-52 flex items-center justify-center text-sm text-muted-foreground bg-muted/40 rounded-lg">
                  No CAPA workload recorded.
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-6 md:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <TestTube className="h-5 w-5" />
              Active Batch Monitoring
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {activeBatches.map((batch) => (
                <div key={batch.id} className="space-y-2">
                  <div className="flex items-center justify-between">
                    <div>
                      <div className="font-medium font-mono">{batch.id}</div>
                      <div className="text-sm text-muted-foreground">{batch.product}</div>
                    </div>
                    <Badge className={getStatusBadge(batch.status)}>
                      {batch.status}
                    </Badge>
                  </div>
                  <div className="flex items-center justify-between text-sm">
                    <span>{batch.stage}</span>
                    <span>{batch.progress.toFixed(2)}%</span>
                  </div>
                  <Progress value={batch.progress} className="h-2" />
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Gear className="h-5 w-5" />
              Equipment Status
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {equipment.map((item) => (
                <div
                  key={item.id}
                  className="flex items-center justify-between rounded-md hover:bg-muted/50 cursor-pointer p-2"
                  onClick={() => { window.location.hash = `#dashboard/equipment/${item.id}` }}
                  role="button"
                  aria-label={`View details for ${item.name}`}
                >
                  <div>
                    <div className="font-medium">{item.name}</div>
                    <div className="text-sm text-muted-foreground">{item.type}</div>
                  </div>
                  <div className="text-right">
                    <Badge className={getStatusBadge(item.status)}>
                      {item.status}
                    </Badge>
                    <div className="text-sm text-muted-foreground font-mono">
                      {item.utilization}% util
                    </div>
                    <div className="text-xs text-muted-foreground font-mono">
                      {item.vibrationRMS} mm/s RMS
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <TrendUp className="h-5 w-5" />
            Recent Alerts & Notifications
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {recentAlerts.length === 0 ? (
              <div className="flex items-center gap-3 p-3 bg-muted/40 rounded-lg text-sm text-muted-foreground">
                <Clock className="h-4 w-4" />
                <span>No alerts yet. Activity across the platform will appear here in real time.</span>
              </div>
            ) : (
              recentAlerts.map((alert) => {
                const style = severityStyles[alert.severity] ?? severityStyles.info
                const Icon = style.Icon
                return (
                  <div key={alert.id} className={`flex items-center gap-3 p-3 rounded-lg ${style.container}`}>
                    <Icon className={`h-4 w-4 ${style.iconClass}`} />
                    <div className="flex-1">
                      <div className="font-medium">{alert.title}</div>
                      <div className="text-sm text-muted-foreground">{alert.description}</div>
                    </div>
                    <div className="text-xs text-muted-foreground whitespace-nowrap">
                      {formatDistanceToNow(new Date(alert.timestamp), { addSuffix: true })}
                    </div>
                  </div>
                )
              })
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  )
}