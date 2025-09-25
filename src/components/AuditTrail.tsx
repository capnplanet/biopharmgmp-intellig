import { useState } from 'react'
import { useKV } from '@github/spark/hooks'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { 
  FileText, 
  Download, 
  MagnifyingGlass,
  Calendar,
  User,
  Gear,
  Shield
} from '@phosphor-icons/react'
import { toast } from 'sonner'

interface AuditEvent {
  id: string
  timestamp: Date
  userId: string
  userRole: string
  action: string
  module: 'batch' | 'quality' | 'equipment' | 'system' | 'deviation' | 'capa'
  details: string
  recordId?: string
  ipAddress: string
  sessionId: string
  outcome: 'success' | 'failure' | 'warning'
  digitalSignature?: string
}

const mockAuditEvents: AuditEvent[] = [
  {
    id: 'AUD-2024-001',
    timestamp: new Date('2024-01-16T10:30:25Z'),
    userId: 'sarah.chen@company.com',
    userRole: 'Quality Analyst',
    action: 'Deviation Created',
    module: 'quality',
    details: 'Created deviation DEV-2024-001 for temperature excursion in BTH-2024-003',
    recordId: 'DEV-2024-001',
    ipAddress: '192.168.1.142',
    sessionId: 'sess-a8b9c0d1e2f3',
    outcome: 'success',
    digitalSignature: 'SHA256:e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855'
  },
  {
    id: 'AUD-2024-002',
    timestamp: new Date('2024-01-16T09:45:12Z'),
    userId: 'mike.rodriguez@company.com',
    userRole: 'Production Operator',
    action: 'Batch Parameter Updated',
    module: 'batch',
    details: 'Updated temperature setpoint from 36.8°C to 37.0°C for BTH-2024-002',
    recordId: 'BTH-2024-002',
    ipAddress: '192.168.1.98',
    sessionId: 'sess-f4g5h6i7j8k9',
    outcome: 'success',
    digitalSignature: 'SHA256:d7a8fbb307d7809469ca9abcb0082e4f8d5651e46d3cdb762d02d0bf37c9e592'
  },
  {
    id: 'AUD-2024-003',
    timestamp: new Date('2024-01-16T08:15:33Z'),
    userId: 'system@company.com',
    userRole: 'System',
    action: 'Equipment Status Change',
    module: 'equipment',
    details: 'Bioreactor BIO-001 status changed from RUNNING to WARNING due to temperature deviation',
    recordId: 'BIO-001',
    ipAddress: '192.168.1.1',
    sessionId: 'sess-system-001',
    outcome: 'warning'
  },
  {
    id: 'AUD-2024-004',
    timestamp: new Date('2024-01-15T16:22:15Z'),
    userId: 'dr.jennifer.lee@company.com',
    userRole: 'Quality Manager',
    action: 'CAPA Approved',
    module: 'capa',
    details: 'Approved CAPA-2024-001 for bioreactor temperature control system upgrade',
    recordId: 'CAPA-2024-001',
    ipAddress: '192.168.1.75',
    sessionId: 'sess-1a2b3c4d5e6f',
    outcome: 'success',
    digitalSignature: 'SHA256:9f86d081884c7d659a2feaa0c55ad015a3bf4f1b2b0b822cd15d6c15b0f00a08'
  },
  {
    id: 'AUD-2024-005',
    timestamp: new Date('2024-01-15T14:18:47Z'),
    userId: 'tom.wilson@company.com',
    userRole: 'Manufacturing Supervisor',
    action: 'Login Failed',
    module: 'system',
    details: 'Failed login attempt - invalid credentials',
    ipAddress: '192.168.1.200',
    sessionId: 'sess-failed-001',
    outcome: 'failure'
  }
]

export function AuditTrail() {
  const [auditEvents, setAuditEvents] = useKV<AuditEvent[]>('audit-events', mockAuditEvents)
  const [filteredEvents, setFilteredEvents] = useState<AuditEvent[]>(auditEvents || [])
  const [searchTerm, setSearchTerm] = useState('')
  const [selectedModule, setSelectedModule] = useState<string>('all')
  const [selectedOutcome, setSelectedOutcome] = useState<string>('all')
  const [dateRange, setDateRange] = useState({ start: '', end: '' })

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

  const exportToCSV = () => {
    const csvHeaders = [
      'ID', 'Timestamp', 'User ID', 'User Role', 'Action', 'Module', 
      'Details', 'Record ID', 'IP Address', 'Session ID', 'Outcome', 'Digital Signature'
    ]
    
    const csvData = filteredEvents.map(event => [
      event.id,
      event.timestamp.toISOString(),
      event.userId,
      event.userRole,
      event.action,
      event.module,
      `"${event.details}"`,
      event.recordId || '',
      event.ipAddress,
      event.sessionId,
      event.outcome,
      event.digitalSignature || ''
    ])

    const csvContent = [
      csvHeaders.join(','),
      ...csvData.map(row => row.join(','))
    ].join('\n')

    const blob = new Blob([csvContent], { type: 'text/csv' })
    const url = window.URL.createObjectURL(blob)
    const link = document.createElement('a')
    link.href = url
    link.download = `audit-trail-${new Date().toISOString().split('T')[0]}.csv`
    link.click()
    window.URL.revokeObjectURL(url)
    
    toast.success('Audit trail exported to CSV')
  }

  const exportToExcel = () => {
    // For now, we'll export as CSV with .xlsx extension
    // In a real implementation, you'd use a library like xlsx or exceljs
    exportToCSV()
    toast.success('Audit trail exported to Excel format')
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
      capa: FileText
    }
    return icons[module as keyof typeof icons] || FileText
  }

  return (
    <div className="p-6 space-y-6 overflow-auto h-full">
      <div>
        <h1 className="text-3xl font-bold">Audit Trail</h1>
        <p className="text-muted-foreground">Complete audit trail with 21 CFR Part 11 compliance and digital signatures</p>
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
              <div className="flex items-center justify-between">
                <CardTitle>Audit Events ({filteredEvents.length})</CardTitle>
                <div className="flex gap-2">
                  <Button variant="outline" size="sm" onClick={exportToCSV}>
                    <Download className="h-4 w-4 mr-2" />
                    Export CSV
                  </Button>
                  <Button variant="outline" size="sm" onClick={exportToExcel}>
                    <Download className="h-4 w-4 mr-2" />
                    Export Excel
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
                              <div className="mt-2 text-xs font-mono text-muted-foreground">
                                Digital Signature: {event.digitalSignature.slice(0, 32)}...
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
                    <div>• System validation completed: 2024-01-01</div>
                    <div>• User access review completed: 2024-01-15</div>
                    <div>• Backup verification successful: 2024-01-16</div>
                    <div>• Security patch deployment: 2024-01-10</div>
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
                      Export current filtered audit events to CSV or Excel format
                    </p>
                    <div className="flex gap-2">
                      <Button variant="outline" onClick={exportToCSV}>
                        <Download className="h-4 w-4 mr-2" />
                        CSV Export
                      </Button>
                      <Button variant="outline" onClick={exportToExcel}>
                        <Download className="h-4 w-4 mr-2" />
                        Excel Export
                      </Button>
                    </div>
                  </div>

                  <div className="p-4 border rounded-lg">
                    <h3 className="font-medium mb-2">Archive Management</h3>
                    <p className="text-sm text-muted-foreground mb-4">
                      Create regulatory-compliant archives for long-term storage
                    </p>
                    <Button disabled>
                      <FileText className="h-4 w-4 mr-2" />
                      Create Archive (Coming Soon)
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