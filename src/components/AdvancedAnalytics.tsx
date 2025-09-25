import React from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Badge } from '@/components/ui/badge'
import { Gauge, Wrench, Pulse, TrendUp, Warning, CheckCircle } from '@phosphor-icons/react'
import { batches, equipmentCalibration, equipmentTelemetry, getCPPCompliance } from '@/data/seed'
import { Tooltip, TooltipTrigger, TooltipContent } from '@/components/ui/tooltip'

const fmtPct = (n: number) => `${(n * 100).toFixed(0)}%`
const fmt = (n: number, digits = 1) => n.toFixed(digits)

export function AdvancedAnalytics() {
  const cppCompliance = batches.map(b => ({ id: b.id, compliance: getCPPCompliance(b) }))
  const avgCompliance = cppCompliance.reduce((a, b) => a + b.compliance, 0) / (cppCompliance.length || 1)

  const totalUptime = equipmentTelemetry.reduce((a, t) => a + t.uptimeHours, 0)
  const vibAlerts = equipmentTelemetry.filter(t => t.vibrationAlert)
  const overdueCal = equipmentCalibration.filter(c => c.status === 'overdue')
  const dueSoonCal = equipmentCalibration.filter(c => c.status === 'due-soon')

  return (
    <div className="p-6 space-y-6 overflow-auto h-full">
      <div>
        <h1 className="text-3xl font-bold">Production & Equipment Analytics</h1>
        <p className="text-muted-foreground">CPP compliance, calibration health, vibration monitoring, and process insights</p>
      </div>

      <Tabs defaultValue="production" className="w-full">
        <TabsList className="grid w-full grid-cols-2">
          <TabsTrigger value="production">Production Analytics</TabsTrigger>
          <TabsTrigger value="equipment">Equipment Analytics</TabsTrigger>
        </TabsList>

        <TabsContent value="production" className="space-y-6">
          <div className="grid gap-4 md:grid-cols-3">
            <Card>
              <CardHeader className="flex items-center justify-between">
                <Tooltip>
                  <TooltipTrigger asChild>
                    <CardTitle className="text-sm text-muted-foreground cursor-help">Average CPP Compliance</CardTitle>
                  </TooltipTrigger>
                  <TooltipContent>
                    Mean of per-batch CPP compliance across active batches. For each batch, compliance = (# CPPs within bounds) / (total CPPs: temperature, pressure, pH, volume).
                  </TooltipContent>
                </Tooltip>
                <CheckCircle className="h-4 w-4 text-success" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold font-mono">{fmtPct(avgCompliance)}</div>
                <div className="text-xs text-muted-foreground">Across active batches</div>
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="flex items-center justify-between">
                <Tooltip>
                  <TooltipTrigger asChild>
                    <CardTitle className="text-sm text-muted-foreground cursor-help">Batches In Spec</CardTitle>
                  </TooltipTrigger>
                  <TooltipContent>
                    Count of batches where compliance = 1.0 (all monitored CPPs within min–max bounds) over total batches displayed.
                  </TooltipContent>
                </Tooltip>
                <TrendUp className="h-4 w-4 text-primary" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold font-mono">{cppCompliance.filter(c => c.compliance === 1).length}/{batches.length}</div>
                <div className="text-xs text-muted-foreground">All CPPs within bounds</div>
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="flex items-center justify-between">
                <Tooltip>
                  <TooltipTrigger asChild>
                    <CardTitle className="text-sm text-muted-foreground cursor-help">Open Process Warnings</CardTitle>
                  </TooltipTrigger>
                  <TooltipContent>
                    Number of batches currently marked as "warning" status, indicating a potential CPP excursion or abnormal drift.
                  </TooltipContent>
                </Tooltip>
                <Warning className="h-4 w-4 text-warning" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold font-mono">{batches.filter(b => b.status === 'warning').length}</div>
                <div className="text-xs text-muted-foreground">Potential CPP deviations</div>
              </CardContent>
            </Card>
          </div>

          <Card>
            <CardHeader>
              <CardTitle>Batch CPP Overview</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {batches.map(b => (
                  <div key={b.id} className="p-3 border rounded-lg">
                    <div className="flex items-center justify-between">
                      <div>
                        <div className="font-mono font-medium">{b.id}</div>
                        <div className="text-sm text-muted-foreground">{b.product}</div>
                      </div>
                      <Badge className={getCPPCompliance(b) === 1 ? 'bg-success text-success-foreground' : 'bg-warning text-warning-foreground'}>
                        CPP: {fmtPct(getCPPCompliance(b))}
                      </Badge>
                    </div>
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-2 mt-2 text-sm">
                      <div>Temp: {fmt(b.parameters.temperature.current)}{b.parameters.temperature.unit} (Target {fmt(b.parameters.temperature.target)})</div>
                      <div>Press: {fmt(b.parameters.pressure.current)} {b.parameters.pressure.unit} (Target {fmt(b.parameters.pressure.target)})</div>
                      <div>pH: {fmt(b.parameters.pH.current)} (Target {fmt(b.parameters.pH.target)})</div>
                      <div>Vol: {fmt(b.parameters.volume.current)}{b.parameters.volume.unit} (Target {fmt(b.parameters.volume.target)})</div>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="equipment" className="space-y-6">
          <div className="grid gap-4 md:grid-cols-3">
            <Card>
              <CardHeader className="flex items-center justify-between">
                <Tooltip>
                  <TooltipTrigger asChild>
                    <CardTitle className="text-sm text-muted-foreground cursor-help">Total Uptime</CardTitle>
                  </TooltipTrigger>
                  <TooltipContent>
                    Sum of uptimeHours across all monitored equipment. Updated continuously by the digital twin simulation.
                  </TooltipContent>
                </Tooltip>
                <Gauge className="h-4 w-4 text-primary" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold font-mono">{fmt(totalUptime, 0)} h</div>
                <div className="text-xs text-muted-foreground">Across monitored equipment</div>
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="flex items-center justify-between">
                <Tooltip>
                  <TooltipTrigger asChild>
                    <CardTitle className="text-sm text-muted-foreground cursor-help">Vibration Alerts</CardTitle>
                  </TooltipTrigger>
                  <TooltipContent>
                    Count of equipment where vibrationAlert is true (elevated RMS or transient spike beyond threshold).
                  </TooltipContent>
                </Tooltip>
                <Pulse className="h-4 w-4 text-warning" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold font-mono">{vibAlerts.length}</div>
                <div className="text-xs text-muted-foreground">Threshold exceeded (RMS)</div>
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="flex items-center justify-between">
                <Tooltip>
                  <TooltipTrigger asChild>
                    <CardTitle className="text-sm text-muted-foreground cursor-help">Calibration Status</CardTitle>
                  </TooltipTrigger>
                  <TooltipContent>
                    Counts from equipmentCalibration: "overdue" where status === 'overdue'; "due soon" where status === 'due-soon'.
                  </TooltipContent>
                </Tooltip>
                <Wrench className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-sm">Overdue: <span className="font-mono font-medium">{overdueCal.length}</span></div>
                <div className="text-sm">Due soon: <span className="font-mono font-medium">{dueSoonCal.length}</span></div>
              </CardContent>
            </Card>
          </div>

          <Card>
            <CardHeader>
              <CardTitle>Equipment Telemetry</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {equipmentTelemetry.map(t => (
                  <div key={t.id} className="p-3 border rounded-lg flex items-center justify-between">
                    <div>
                      <div className="font-medium">{t.id}</div>
                      <div className="text-sm text-muted-foreground">Uptime: {fmt(t.uptimeHours, 0)} h</div>
                    </div>
                    <div className="grid grid-cols-3 gap-4 text-sm">
                      <div>Vibration: {fmt(t.vibrationRMS)} mm/s</div>
                      <div>Temp Var: {fmt(t.temperatureVar)} °C</div>
                      <div>
                        <Badge className={t.vibrationAlert ? 'bg-warning text-warning-foreground' : 'bg-success text-success-foreground'}>
                          {t.vibrationAlert ? 'Alert' : 'Normal'}
                        </Badge>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Calibration Schedule</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-2 text-sm">
                {equipmentCalibration.map(c => (
                  <div key={c.id} className="p-2 border rounded-md flex items-center justify-between">
                    <div>
                      <div className="font-medium">{c.name} ({c.id})</div>
                      <div className="text-muted-foreground">Last: {new Date(c.lastCalibration).toLocaleDateString()} • Next: {new Date(c.nextDue).toLocaleDateString()}</div>
                    </div>
                    <Badge className={
                      c.status === 'calibrated' ? 'bg-success text-success-foreground' :
                      c.status === 'due-soon' ? 'bg-warning text-warning-foreground' : 'bg-destructive text-destructive-foreground'
                    }>
                      {c.status}
                    </Badge>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  )
}

export default AdvancedAnalytics
