import { useEffect, useMemo, useState } from 'react'
import { useKV } from '@github/spark/hooks'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { AUDIT_EVENT_IDS, BATCH_IDS, CAPA_IDS, CHANGE_CONTROL_IDS, DEVIATION_IDS } from '@/data/identifiers'
import { daysAgo } from '@/lib/timeframe'
import {
  FileText,
  Download,
  MagnifyingGlass,
  Calendar,
  User,
  Gear,
  Shield,
  FlowArrow,
  Brain,
  Compass,
  FingerprintSimple,
  CopySimple,
  Package
} from '@phosphor-icons/react'
import { toast } from 'sonner'
import type { AuditEvent, AuditOutcome } from '@/hooks/use-audit'
import { ChartContainer, ChartLegendInline, ChartTooltip, ChartTooltipContent, type ChartConfig } from '@/components/ui/chart'
import { exportAuditEventsCSV, exportAuditEventsJSON, tryExportAuditEvents } from '@/utils/auditExport'
import { BarChart, Bar, CartesianGrid, XAxis, YAxis, Cell } from 'recharts'
import { useAuditLogger } from '@/hooks/use-audit'

const mockAuditEvents: AuditEvent[] = [
  {
    id: AUDIT_EVENT_IDS.deviationCreated,
    timestamp: daysAgo(0, 9.5),
    userId: 'sarah.chen@company.com',
    userRole: 'Quality Analyst',
    action: 'Deviation Created',
    module: 'quality',
    details: `Created deviation ${DEVIATION_IDS.temperatureExcursion} for temperature excursion in ${BATCH_IDS.warning}`,
    recordId: DEVIATION_IDS.temperatureExcursion,
    ipAddress: '192.168.1.142',
    sessionId: 'sess-a8b9c0d1e2f3',
    outcome: 'success',
    digitalSignature: 'SHA256:e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855'
  },
  {
    id: AUDIT_EVENT_IDS.batchParameterUpdated,
    timestamp: daysAgo(0, 9.75),
    userId: 'mike.rodriguez@company.com',
    userRole: 'Production Operator',
    action: 'Batch Parameter Updated',
    module: 'batch',
    details: `Updated temperature setpoint from 36.8°C to 37.0°C for ${BATCH_IDS.smallMolecule}`,
    recordId: BATCH_IDS.smallMolecule,
    ipAddress: '192.168.1.98',
    sessionId: 'sess-f4g5h6i7j8k9',
    outcome: 'success',
    digitalSignature: 'SHA256:d7a8fbb307d7809469ca9abcb0082e4f8d5651e46d3cdb762d02d0bf37c9e592'
  },
  {
    id: AUDIT_EVENT_IDS.equipmentStatusChange,
    timestamp: daysAgo(0, 8.25),
    userId: 'system@company.com',
    userRole: 'System',
    action: 'Equipment Status Change',
    module: 'equipment',
    details: 'Bioreactor BIO-002 status changed from RUNNING to WARNING due to temperature deviation',
    recordId: 'BIO-002',
    ipAddress: '192.168.1.1',
    sessionId: 'sess-system-001',
    outcome: 'warning'
  },
  {
    id: AUDIT_EVENT_IDS.capaApproved,
    timestamp: daysAgo(0, 15.5),
    userId: 'dr.jennifer.lee@company.com',
    userRole: 'Quality Manager',
    action: 'CAPA Approved',
    module: 'capa',
    details: `Approved ${CAPA_IDS.temperatureControlUpgrade} for bioreactor temperature control system upgrade`,
    recordId: CAPA_IDS.temperatureControlUpgrade,
    ipAddress: '192.168.1.75',
    sessionId: 'sess-1a2b3c4d5e6f',
    outcome: 'success',
    digitalSignature: 'SHA256:9f86d081884c7d659a2feaa0c55ad015a3bf4f1b2b0b822cd15d6c15b0f00a08'
  },
  {
    id: AUDIT_EVENT_IDS.loginFailed,
    timestamp: daysAgo(0, 14.3),
    userId: 'tom.wilson@company.com',
    userRole: 'Manufacturing Supervisor',
    action: 'Login Failed',
    module: 'system',
    details: 'Failed login attempt - invalid credentials',
    ipAddress: '192.168.1.200',
    sessionId: 'sess-failed-001',
    outcome: 'failure'
  },
  {
    id: AUDIT_EVENT_IDS.deviationResolved,
    timestamp: daysAgo(0, 11.75),
    userId: 'qa.signer@biopharm.com',
    userRole: 'Quality Approver',
    action: 'Deviation Resolved',
    module: 'workflow',
    details: `Resolution approved for deviation ${DEVIATION_IDS.temperatureExcursion} with e-signature`,
    recordId: DEVIATION_IDS.temperatureExcursion,
    ipAddress: '192.168.1.150',
    sessionId: 'sess-workflow-001',
    outcome: 'success',
    digitalSignature: 'SHA256:c0ffee2543cdeedfadebabe1234567890abcdef1234567890abcdef12345678'
  },
  {
    id: AUDIT_EVENT_IDS.aiAnalysisGenerated,
    timestamp: daysAgo(0, 11),
    userId: 'sarah.chen@company.com',
    userRole: 'Quality Analyst',
    action: 'AI Analysis Generated',
    module: 'ai',
    details: `Generated AI-assisted root cause analysis for ${DEVIATION_IDS.temperatureExcursion}`,
    recordId: DEVIATION_IDS.temperatureExcursion,
    ipAddress: '192.168.1.142',
    sessionId: 'sess-ai-001',
    outcome: 'success'
  },
  {
    id: AUDIT_EVENT_IDS.navigation,
    timestamp: daysAgo(0, 10.08),
    userId: 'sarah.chen@company.com',
    userRole: 'Quality Analyst',
    action: 'Tab Navigated',
    module: 'navigation',
    details: 'Switched from Deviations to CAPA tab',
    ipAddress: '192.168.1.142',
    sessionId: 'sess-a8b9c0d1e2f3',
    outcome: 'success'
  },
  {
    id: AUDIT_EVENT_IDS.changeControlCreated,
    timestamp: daysAgo(0, 16.5),
    userId: 'dr.jennifer.lee@company.com',
    userRole: 'Quality Manager',
    action: 'Change Control Created',
    module: 'change-control',
    details: `Created change control ${CHANGE_CONTROL_IDS.pidRetune} for PID retune`,
    recordId: CHANGE_CONTROL_IDS.pidRetune,
    ipAddress: '192.168.1.75',
    sessionId: 'sess-1a2b3c4d5e6f',
    outcome: 'success'
  }
]

const modulePalette: Record<AuditEvent['module'], string> = {
  batch: '#6366F1',
  quality: '#0EA5E9',
  equipment: '#8B5CF6',
  system: '#64748B',
  deviation: '#F97316',
  capa: '#EC4899',
  workflow: '#22C55E',
  navigation: '#14B8A6',
  ai: '#06B6D4',
  'change-control': '#F59E0B'
}

export function AuditTrail() {
  const { log } = useAuditLogger()
  const [auditEvents, setAuditEvents] = useKV<AuditEvent[]>('audit-events', mockAuditEvents)
  const [filteredEvents, setFilteredEvents] = useState<AuditEvent[]>(auditEvents || [])
  const [searchTerm, setSearchTerm] = useState('')
  const [selectedModule, setSelectedModule] = useState<string>('all')
  const [selectedOutcome, setSelectedOutcome] = useState<string>('all')
  const [dateRange, setDateRange] = useState({ start: '', end: '' })
  const aiCountTotal = useMemo(() => (auditEvents || []).filter(e => e.module === 'ai').length, [auditEvents])

  const stats = useMemo(() => {
    const totals: Record<AuditOutcome, number> = {
      success: 0,
      failure: 0,
      warning: 0
    }
    let signed = 0
    let aiEvents = 0
    let workflowEvents = 0
    const modules = new Set<AuditEvent['module']>()

    for (const event of filteredEvents) {
      modules.add(event.module)
      if (event.digitalSignature) signed += 1
      if (event.module === 'ai') aiEvents += 1
      if (event.module === 'workflow') workflowEvents += 1
      totals[event.outcome] = (totals[event.outcome] || 0) + 1
    }

    return {
      total: filteredEvents.length,
      signed,
      moduleCount: modules.size,
      aiEvents,
      workflowEvents,
      outcomes: totals,
    }
  }, [filteredEvents])

  const signedPercent = stats.total > 0 ? Math.round((stats.signed / stats.total) * 100) : 0

  const moduleBreakdown = useMemo(() => {
    const counts = new Map<AuditEvent['module'], number>()
    for (const event of filteredEvents) {
      counts.set(event.module, (counts.get(event.module) || 0) + 1)
    }
    return Array.from(counts.entries())
      .map(([module, count]) => ({
        module,
        count,
        color: modulePalette[module] || '#94A3B8',
      }))
      .sort((a, b) => b.count - a.count)
  }, [filteredEvents])

  const moduleChartConfig = useMemo<ChartConfig>(() => {
    return moduleBreakdown.reduce((acc, item) => {
      acc[item.module] = {
        label: item.module.replace('-', ' '),
        color: item.color,
      }
      return acc
    }, {} as ChartConfig)
  }, [moduleBreakdown])

  const moduleLegendItems = useMemo(
    () =>
      moduleBreakdown.map((item) => ({
        key: item.module,
        label: item.module.replace('-', ' '),
        color: item.color,
      })),
    [moduleBreakdown]
  )

  const summaryCards = useMemo(
    () => [
      {
        label: 'Events',
        value: stats.total,
        hint: 'records in scope',
        Icon: FileText,
        accent: 'text-primary',
      },
      {
        label: 'Signed actions',
        value: stats.signed,
        hint: `${signedPercent}% with electronic signature`,
        Icon: FingerprintSimple,
        accent: 'text-emerald-600',
      },
      {
        label: 'Modules',
        value: stats.moduleCount,
        hint: 'unique functional areas touched',
        Icon: Compass,
        accent: 'text-sky-600',
      },
      {
        label: 'Workflow events',
        value: stats.workflowEvents,
        hint: `${stats.aiEvents} AI assist${stats.aiEvents === 1 ? '' : 's'}`,
        Icon: FlowArrow,
        accent: 'text-amber-600',
      },
    ],
    [signedPercent, stats.aiEvents, stats.moduleCount, stats.signed, stats.total, stats.workflowEvents]
  )

  const copyHash = async (hash: string) => {
    try {
      await navigator.clipboard.writeText(hash)
      toast.success('Signature hash copied to clipboard')
    } catch (error) {
      console.error(error)
      toast.error('Unable to copy signature hash')
    }
  }

  // hydrate timestamps if persisted as strings
  useEffect(() => {
    if (!auditEvents?.length) return
    if (typeof (auditEvents[0].timestamp as unknown) === 'string') {
      const hydrated = (auditEvents || []).map(e => ({ ...e, timestamp: new Date(e.timestamp as unknown as string) }))
      setAuditEvents(hydrated)
      setFilteredEvents(hydrated)
      return
    }
    setFilteredEvents(auditEvents)
  }, [auditEvents, setAuditEvents])

  const handleSearch = () => {
    let filtered = auditEvents || []

    if (searchTerm) {
      filtered = filtered.filter(event => 
        event.action.toLowerCase().includes(searchTerm.toLowerCase()) ||
        event.details.toLowerCase().includes(searchTerm.toLowerCase()) ||
        event.userId.toLowerCase().includes(searchTerm.toLowerCase())
      )
    }

    if (selectedModule !== 'all') {
      filtered = filtered.filter(event => event.module === selectedModule)
    }

    if (selectedOutcome !== 'all') {
      filtered = filtered.filter(event => event.outcome === selectedOutcome)
    }

    if (dateRange.start) {
      filtered = filtered.filter(event => 
        new Date(event.timestamp) >= new Date(dateRange.start)
      )
    }

    if (dateRange.end) {
      filtered = filtered.filter(event => 
        new Date(event.timestamp) <= new Date(dateRange.end)
      )
    }

    setFilteredEvents(filtered)
  }

  const clearFilters = () => {
    setSearchTerm('')
    setSelectedModule('all')
    setSelectedOutcome('all')
    setDateRange({ start: '', end: '' })
    setFilteredEvents(auditEvents || [])
  }

  const exportFiltered = (format: 'csv' | 'json') => {
    try {
      if (!filteredEvents.length) {
        toast.error('No filtered events to export')
        return
      }
      if (format === 'csv') {
        exportAuditEventsCSV(filteredEvents, { fileName: 'audit-trail-filtered.csv' })
      } else {
        exportAuditEventsJSON(filteredEvents, { fileName: 'audit-trail-filtered.json' })
      }
      toast.success(`Filtered audit events exported as ${format.toUpperCase()}`)
    } catch (error) {
      console.error(error)
      toast.error('Failed to export filtered audit events')
    }
  }

  const exportAll = (format: 'csv' | 'json') => {
    try {
      const events = auditEvents || []
      if (!events.length) {
        toast.error('No audit events available to export')
        return
      }
      tryExportAuditEvents(format, events)
      toast.success(`Full audit log exported as ${format.toUpperCase()}`)
    } catch (error) {
      console.error(error)
      toast.error('Failed to export full audit log')
    }
  }

  const getOutcomeBadge = (outcome: string) => {
    const colors = {
      success: 'bg-success text-success-foreground',
      failure: 'bg-destructive text-destructive-foreground',
      warning: 'bg-warning text-warning-foreground'
    }
    return colors[outcome as keyof typeof colors] || 'bg-muted text-muted-foreground'
  }

  const getModuleIcon = (module: string) => {
    const icons = {
      batch: FileText,
      quality: Shield,
      equipment: Gear,
      system: User,
      deviation: Shield,
      capa: FileText,
      workflow: FlowArrow,
      navigation: Compass,
      ai: Brain,
      'change-control': Gear
    }
    return icons[module as keyof typeof icons] || FileText
  }

  return (
    <div className="p-6 space-y-6 overflow-auto h-full">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold">Audit Trail</h1>
          <p className="text-muted-foreground">Complete audit trail with 21 CFR Part 11 compliance and digital signatures</p>
        </div>
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            onClick={() => {
              log('Open AI Audit', 'navigation', 'Navigate to AI audit trail')
              window.location.hash = '#audit/ai'
            }}
          >
            <Brain className="h-4 w-4 mr-2" /> AI Audit Trail
            {aiCountTotal > 0 && (
              <Badge variant="secondary" className="ml-2 text-[10px] uppercase">{aiCountTotal}</Badge>
            )}
          </Button>
        </div>
      </div>

      <Tabs defaultValue="events" className="w-full">
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="events">Audit Events</TabsTrigger>
          <TabsTrigger value="compliance">Compliance Report</TabsTrigger>
          <TabsTrigger value="export">Export & Archive</TabsTrigger>
        </TabsList>

        <TabsContent value="events" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Audit Trail Filters</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid gap-4 md:grid-cols-6">
                <div className="md:col-span-2">
                  <Label htmlFor="search">Search</Label>
                  <div className="relative">
                    <MagnifyingGlass className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                    <Input
                      id="search"
                      placeholder="Search actions, users, details..."
                      value={searchTerm}
                      onChange={(e) => setSearchTerm(e.target.value)}
                      className="pl-9"
                    />
                  </div>
                </div>
                
                <div>
                  <Label htmlFor="module">Module</Label>
                  <select
                    id="module"
                    value={selectedModule}
                    onChange={(e) => setSelectedModule(e.target.value)}
                    className="w-full p-2 border rounded-md text-sm bg-background"
                  >
                    <option value="all">All Modules</option>
                    <option value="batch">Batch</option>
                    <option value="quality">Quality</option>
                    <option value="equipment">Equipment</option>
                    <option value="system">System</option>
                    <option value="deviation">Deviation</option>
                    <option value="workflow">Workflow</option>
                    <option value="navigation">Navigation</option>
                    <option value="ai">AI Assistance</option>
                    <option value="change-control">Change Control</option>
                    <option value="capa">CAPA</option>
                  </select>
                </div>

                <div>
                  <Label htmlFor="outcome">Outcome</Label>
                  <select
                    id="outcome"
                    value={selectedOutcome}
                    onChange={(e) => setSelectedOutcome(e.target.value)}
                    className="w-full p-2 border rounded-md text-sm bg-background"
                  >
                    <option value="all">All Outcomes</option>
                    <option value="success">Success</option>
                    <option value="failure">Failure</option>
                    <option value="warning">Warning</option>
                  </select>
                </div>

                <div>
                  <Label htmlFor="start-date">Start Date</Label>
                  <Input
                    id="start-date"
                    type="date"
                    value={dateRange.start}
                    onChange={(e) => setDateRange(prev => ({ ...prev, start: e.target.value }))}
                  />
                </div>

                <div>
                  <Label htmlFor="end-date">End Date</Label>
                  <Input
                    id="end-date"
                    type="date"
                    value={dateRange.end}
                    onChange={(e) => setDateRange(prev => ({ ...prev, end: e.target.value }))}
                  />
                </div>
              </div>

              <div className="flex gap-2 mt-4">
                <Button onClick={handleSearch}>
                  <MagnifyingGlass className="h-4 w-4 mr-2" />
                  Apply Filters
                </Button>
                <Button variant="outline" onClick={clearFilters}>
                  Clear Filters
                </Button>
              </div>
            </CardContent>
          </Card>

            <Card>
              <CardHeader>
                <CardTitle>At-a-Glance Metrics</CardTitle>
                <p className="text-sm text-muted-foreground">Statistics update automatically with your filters.</p>
              </CardHeader>
              <CardContent>
                {stats.total === 0 ? (
                  <div className="rounded-md border border-dashed p-6 text-center text-sm text-muted-foreground">
                    No audit entries match the current filters.
                  </div>
                ) : (
                  <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
                    {summaryCards.map(({ label, value, hint, Icon, accent }) => (
                      <div key={label} className="rounded-xl border bg-muted/40 p-4 shadow-sm">
                        <div className="flex items-center justify-between">
                          <span className="text-sm font-medium text-muted-foreground">{label}</span>
                          <Icon className={`h-5 w-5 ${accent}`} />
                        </div>
                        <div className="mt-2 text-3xl font-semibold">{value.toLocaleString()}</div>
                        <div className="mt-1 text-xs text-muted-foreground">{hint}</div>
                      </div>
                    ))}
                  </div>
                )}
                {stats.total > 0 && (
                  <div className="mt-4 flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
                    <span className="font-medium uppercase tracking-wide">Outcomes</span>
                    <Badge variant="outline">Success: {stats.outcomes.success}</Badge>
                    <Badge variant="outline">Warnings: {stats.outcomes.warning}</Badge>
                    <Badge variant="outline">Failures: {stats.outcomes.failure}</Badge>
                    <span className="ml-auto text-muted-foreground/70">
                      Signed coverage: {signedPercent}%
                    </span>
                  </div>
                )}
              </CardContent>
            </Card>

            {moduleBreakdown.length > 0 && (
              <Card>
                <CardHeader>
                  <CardTitle>Events by Module</CardTitle>
                </CardHeader>
                <CardContent>
                  <ChartContainer
                    className="h-64"
                    config={moduleChartConfig}
                  >
                    <BarChart data={moduleBreakdown} margin={{ left: 12, right: 12, top: 8, bottom: 0 }}>
                      <CartesianGrid vertical={false} strokeDasharray="3 3" />
                      <XAxis dataKey="module" axisLine={false} tickLine={false} tickFormatter={(value) => value.replace('-', ' ')} />
                      <YAxis allowDecimals={false} width={32} tickLine={false} axisLine={false} />
                      <ChartTooltip content={<ChartTooltipContent />} />
                      <Bar dataKey="count" radius={[6, 6, 0, 0]}>
                        {moduleBreakdown.map((item) => (
                          <Cell key={item.module} fill={item.color} />
                        ))}
                      </Bar>
                    </BarChart>
                  </ChartContainer>
                  <ChartLegendInline className="mt-3" align="left" items={moduleLegendItems} />
                </CardContent>
              </Card>
            )}

          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle>Audit Events ({filteredEvents.length})</CardTitle>
                <div className="flex flex-wrap gap-2">
                  <Button variant="outline" size="sm" onClick={() => exportFiltered('csv')}>
                    <Download className="h-4 w-4 mr-2" />
                    Export Filtered CSV
                  </Button>
                  <Button variant="outline" size="sm" onClick={() => exportFiltered('json')}>
                    <Download className="h-4 w-4 mr-2" />
                    Export Filtered JSON
                  </Button>
                  <Button variant="outline" size="sm" onClick={() => exportAll('csv')}>
                    <Download className="h-4 w-4 mr-2" />
                    Export Full CSV
                  </Button>
                  <Button variant="outline" size="sm" onClick={() => exportAll('json')}>
                    <Download className="h-4 w-4 mr-2" />
                    Export Full JSON
                  </Button>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {filteredEvents.map((event) => {
                  const ModuleIcon = getModuleIcon(event.module)
                  return (
                    <div key={event.id} className="p-4 border rounded-lg hover:bg-muted/50 transition-colors">
                      <div className="flex items-start justify-between">
                        <div className="flex items-start gap-3 flex-1">
                          <ModuleIcon className="h-5 w-5 text-muted-foreground mt-0.5" />
                          <div className="flex-1">
                            <div className="flex items-center gap-3 mb-2">
                              <span className="font-mono text-sm font-medium">{event.id}</span>
                              <Badge className={getOutcomeBadge(event.outcome)}>
                                {event.outcome}
                              </Badge>
                              <Badge variant="outline">
                                {event.module}
                              </Badge>
                              {event.digitalSignature && (
                                <Badge variant="secondary" className="uppercase text-[10px] tracking-wide">
                                  Signed
                                </Badge>
                              )}
                            </div>
                            <div className="font-medium">{event.action}</div>
                            <div className="text-sm text-muted-foreground mb-2">{event.details}</div>
                            <div className="grid grid-cols-2 md:grid-cols-4 gap-2 text-xs text-muted-foreground">
                              <div>
                                <User className="h-3 w-3 inline mr-1" />
                                {event.userId}
                              </div>
                              <div>
                                <Calendar className="h-3 w-3 inline mr-1" />
                                {event.timestamp.toLocaleString()}
                              </div>
                              <div>IP: {event.ipAddress}</div>
                              <div>Session: {event.sessionId.slice(-8)}</div>
                            </div>
                            {event.digitalSignature && (
                              <div className="mt-2 flex flex-wrap items-center gap-2 text-xs font-mono text-muted-foreground">
                                <span className="break-all">Signature Hash: {event.digitalSignature}</span>
                                <Button
                                  variant="ghost"
                                  size="icon"
                                  className="h-7 w-7"
                                  onClick={() => copyHash(event.digitalSignature!)}
                                >
                                  <CopySimple className="h-3.5 w-3.5" />
                                </Button>
                              </div>
                            )}
                          </div>
                        </div>
                      </div>
                    </div>
                  )
                })}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="compliance" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>21 CFR Part 11 Compliance Summary</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid gap-4 md:grid-cols-3">
                <div className="p-4 border rounded-lg">
                  <div className="text-2xl font-bold text-green-600">100%</div>
                  <div className="text-sm text-muted-foreground">Events with Digital Signatures</div>
                </div>
                <div className="p-4 border rounded-lg">
                  <div className="text-2xl font-bold text-green-600">0</div>
                  <div className="text-sm text-muted-foreground">Data Integrity Violations</div>
                </div>
                <div className="p-4 border rounded-lg">
                  <div className="text-2xl font-bold text-blue-600">99.8%</div>
                  <div className="text-sm text-muted-foreground">System Availability</div>
                </div>
              </div>

              <div className="mt-6 space-y-4">
                <div className="p-4 bg-green-50 border border-green-200 rounded-lg">
                  <h4 className="font-medium text-green-900 mb-2">Compliance Status: COMPLIANT</h4>
                  <ul className="text-sm text-green-800 space-y-1">
                    <li>✓ All electronic records contain digital signatures</li>
                    <li>✓ Audit trail is computer generated and time-stamped</li>
                    <li>✓ Records are protected from unauthorized access</li>
                    <li>✓ System validates user identities before access</li>
                    <li>✓ Electronic signatures are unique to each individual</li>
                  </ul>
                </div>

                <div className="p-4 border rounded-lg">
                  <h4 className="font-medium mb-2">Recent Compliance Activities:</h4>
                  <div className="space-y-2 text-sm">
                    <div>• System validation completed: {daysAgo(90).toISOString().slice(0, 10)}</div>
                    <div>• User access review completed: {daysAgo(20).toISOString().slice(0, 10)}</div>
                    <div>• Backup verification successful: {daysAgo(19).toISOString().slice(0, 10)}</div>
                    <div>• Security patch deployment: {daysAgo(25).toISOString().slice(0, 10)}</div>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="export" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Export & Archive Options</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-6">
                <div className="grid gap-4 md:grid-cols-2">
                  <div className="p-4 border rounded-lg">
                    <h3 className="font-medium mb-2">Quick Export</h3>
                    <p className="text-sm text-muted-foreground mb-4">
                      Export current filtered audit events for offline analysis
                    </p>
                    <div className="flex gap-2">
                      <Button variant="outline" onClick={() => exportFiltered('csv')}>
                        <Download className="h-4 w-4 mr-2" />
                        CSV Export
                      </Button>
                      <Button variant="outline" onClick={() => exportFiltered('json')}>
                        <Download className="h-4 w-4 mr-2" />
                        JSON Export
                      </Button>
                      <Button variant="outline" onClick={() => { window.location.hash = '#audit/evidence' }}>
                        <Package className="h-4 w-4 mr-2" />
                        Evidence Bundle
                      </Button>
                    </div>
                  </div>

                  <div className="p-4 border rounded-lg">
                    <h3 className="font-medium mb-2">Archive Management</h3>
                    <p className="text-sm text-muted-foreground mb-4">
                      Create regulatory-compliant archives for long-term storage
                    </p>
                    <Button
                      variant="outline"
                      onClick={() => {
                        log('Navigate Archive Library', 'navigation', 'User opened archive library from audit trail', {
                          recordId: 'archive-library',
                        })
                        window.location.hash = '#quality/archive'
                      }}
                    >
                      <FileText className="h-4 w-4 mr-2" />
                      Open Archive Library
                    </Button>
                  </div>
                </div>

                <div className="p-4 bg-blue-50 rounded-lg">
                  <h4 className="font-medium mb-2">Export Information:</h4>
                  <ul className="text-sm text-blue-800 space-y-1">
                    <li>• All exports include complete audit metadata</li>
                    <li>• Digital signatures are preserved in exported data</li>
                    <li>• Export activities are automatically logged</li>
                    <li>• Files are timestamped and include data integrity checksums</li>
                  </ul>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  )
}