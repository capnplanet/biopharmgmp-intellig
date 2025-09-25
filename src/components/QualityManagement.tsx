import React, { useState } from 'react'
import { useKV } from '@github/spark/hooks'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog'
import { Textarea } from '@/components/ui/textarea'
import { Label } from '@/components/ui/label'
import { 
  Warning, 
  MagnifyingGlass, 
  CheckCircle, 
  Clock,
  Plus,
  FileText,
  Robot
} from '@phosphor-icons/react'
import { toast } from 'sonner'

type WindowSpark = {
  llmPrompt: (strings: TemplateStringsArray, ...expr: unknown[]) => unknown
  llm: (prompt: unknown, model: string) => Promise<string>
}

const getSpark = (): WindowSpark | undefined => {
  // Safely access window.spark without introducing 'any' types
  const w = window as unknown as { spark?: WindowSpark }
  return w.spark
}

interface Deviation {
  id: string
  title: string
  description: string
  severity: 'low' | 'medium' | 'high' | 'critical'
  status: 'open' | 'investigating' | 'resolved' | 'closed'
  batchId: string
  reportedBy: string
  reportedDate: Date
  assignedTo?: string
  rootCause?: string
  correctiveActions?: string[]
  effectivenessCheck?: {
    dueDate: Date
    status: 'pending' | 'complete'
    result?: string
  }
}

interface CAPA {
  id: string
  title: string
  description: string
  type: 'corrective' | 'preventive'
  priority: 'low' | 'medium' | 'high'
  status: 'draft' | 'approved' | 'implementing' | 'complete'
  dueDate: Date
  assignedTo: string
  relatedDeviations: string[]
  actions: {
    id: string
    description: string
    responsible: string
    dueDate: Date
    status: 'pending' | 'complete'
  }[]
}

const mockDeviations: Deviation[] = [
  {
    id: 'DEV-2024-001',
    title: 'Temperature Excursion in Bioreactor',
    description: 'Temperature exceeded upper control limit of 37.5°C, reaching 38.2°C for 15 minutes during fermentation phase.',
    severity: 'high',
    status: 'investigating',
    batchId: 'BTH-2024-003',
    reportedBy: 'Sarah Chen',
    reportedDate: new Date('2024-01-16T09:30:00Z'),
    assignedTo: 'Quality Team A'
  },
  {
    id: 'DEV-2024-002',
    title: 'Documentation Discrepancy',
    description: 'Batch record shows conflicting pH values between manual recording and automated system.',
    severity: 'medium',
    status: 'open',
    batchId: 'BTH-2024-002',
    reportedBy: 'Mike Rodriguez',
    reportedDate: new Date('2024-01-16T14:15:00Z')
  },
  {
    id: 'DEV-2024-003',
    title: 'Raw Material Out of Spec',
    description: 'Incoming raw material lot RM-240115-A failed moisture content specification (5.2% vs 5.0% max).',
    severity: 'critical',
    status: 'resolved',
    batchId: 'BTH-2024-001',
    reportedBy: 'Quality Control',
    reportedDate: new Date('2024-01-15T11:20:00Z'),
    assignedTo: 'Quality Team B',
    rootCause: 'Supplier storage conditions not maintained during transport',
    correctiveActions: [
      'Reject affected lot and source replacement material',
      'Contact supplier to review transport procedures',
      'Implement additional incoming inspection for this material'
    ],
    effectivenessCheck: {
      dueDate: new Date('2024-02-15T00:00:00Z'),
      status: 'pending'
    }
  }
]

const mockCAPAs: CAPA[] = [
  {
    id: 'CAPA-2024-001',
    title: 'Bioreactor Temperature Control System Upgrade',
    description: 'Implement enhanced temperature control system to prevent future excursions',
    type: 'preventive',
    priority: 'high',
    status: 'approved',
    dueDate: new Date('2024-03-01T00:00:00Z'),
    assignedTo: 'Engineering Team',
    relatedDeviations: ['DEV-2024-001'],
    actions: [
      {
        id: 'ACT-001',
        description: 'Procure upgraded temperature control hardware',
        responsible: 'Procurement',
        dueDate: new Date('2024-02-01T00:00:00Z'),
        status: 'pending'
      },
      {
        id: 'ACT-002',
        description: 'Install and validate new control system',
        responsible: 'Engineering',
        dueDate: new Date('2024-02-15T00:00:00Z'),
        status: 'pending'
      }
    ]
  }
]

export function QualityManagement() {
  const [deviations, setDeviations] = useKV<Deviation[]>('deviations', mockDeviations)
  const [capas, setCAPAs] = useKV<CAPA[]>('capas', mockCAPAs)
  const [, setSelectedDeviation] = useState<Deviation | null>(null)
  const [investigationNotes, setInvestigationNotes] = useState('')
  const [isAIAssistantOpen, setIsAIAssistantOpen] = useState(false)
  const [aiAnalysis, setAiAnalysis] = useState('')

  const formatDate = (d: Date | string | undefined) => {
    if (!d) return ''
    const dt = d instanceof Date ? d : new Date(d)
    return isNaN(dt.getTime()) ? '' : dt.toLocaleDateString()
  }

  // Hydrate date fields if they were persisted as strings
  React.useEffect(() => {
    const normalizeDeviation = (d: Deviation): Deviation => ({
      ...d,
      reportedDate: new Date(d.reportedDate as unknown as string),
      effectivenessCheck: d.effectivenessCheck
        ? {
            ...d.effectivenessCheck,
            dueDate: new Date(d.effectivenessCheck.dueDate as unknown as string),
          }
        : undefined,
    })

    const normalizeCAPA = (c: CAPA): CAPA => ({
      ...c,
      dueDate: new Date(c.dueDate as unknown as string),
      actions: c.actions.map(a => ({
        ...a,
        dueDate: new Date(a.dueDate as unknown as string),
      }))
    })

    if (deviations && deviations.length > 0 && typeof deviations[0].reportedDate !== 'object') {
      setDeviations((deviations || []).map(normalizeDeviation))
    }
    if (capas && capas.length > 0 && typeof capas[0].dueDate !== 'object') {
      setCAPAs((capas || []).map(normalizeCAPA))
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const getSeverityColor = (severity: string) => {
    const colors = {
      low: 'bg-blue-100 text-blue-800',
      medium: 'bg-yellow-100 text-yellow-800', 
      high: 'bg-orange-100 text-orange-800',
      critical: 'bg-red-100 text-red-800'
    }
    return colors[severity as keyof typeof colors] || colors.low
  }

  const getStatusColor = (status: string) => {
    const colors = {
      open: 'bg-gray-100 text-gray-800',
      investigating: 'bg-blue-100 text-blue-800',
      resolved: 'bg-green-100 text-green-800',
      closed: 'bg-gray-100 text-gray-800',
      draft: 'bg-gray-100 text-gray-800',
      approved: 'bg-blue-100 text-blue-800',
      implementing: 'bg-yellow-100 text-yellow-800',
      complete: 'bg-green-100 text-green-800'
    }
    return colors[status as keyof typeof colors] || colors.open
  }

  const generateAIAnalysis = async (deviation: Deviation) => {
    setIsAIAssistantOpen(true)
    setAiAnalysis('Analyzing deviation data and batch records...')
    
    try {
  const spark = getSpark()
  const llmPrompt = spark?.llmPrompt
  if (!llmPrompt || !spark?.llm) throw new Error('AI helpers not available')
      const prompt = llmPrompt`
        You are a pharmaceutical quality expert AI assistant. Analyze this deviation:
        
        Title: ${deviation.title}
        Description: ${deviation.description}
        Batch ID: ${deviation.batchId}
        Severity: ${deviation.severity}
        
        Based on typical pharmaceutical manufacturing processes and GMP guidelines, provide:
        1. Potential root causes (list 3-5 most likely causes)
        2. Investigation steps to confirm root cause
        3. Immediate containment actions
        4. Recommended corrective and preventive actions
        5. Risk assessment for product quality impact
        
        Ground your analysis in pharmaceutical industry best practices and regulatory guidelines.
        Be specific and actionable. Avoid generic responses.
      `
  const analysis = await spark.llm(prompt, 'gpt-4o')
      setAiAnalysis(analysis)
    } catch {
      setAiAnalysis('Error generating analysis. Please try again.')
      toast.error('Failed to generate AI analysis')
    }
  }

  const updateDeviationStatus = (deviationId: string, newStatus: Deviation['status']) => {
    setDeviations(currentDeviations => 
      (currentDeviations || []).map(dev => 
        dev.id === deviationId 
          ? { ...dev, status: newStatus }
          : dev
      )
    )
    toast.success(`Deviation ${deviationId} status updated to ${newStatus}`)
  }

  return (
    <div className="p-6 space-y-6 overflow-auto h-full">
      <div>
        <h1 className="text-3xl font-bold">Quality Management System</h1>
        <p className="text-muted-foreground">Manage deviations, investigations, CAPAs, and change controls</p>
      </div>

      <Tabs defaultValue="deviations" className="w-full">
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="deviations">Deviations</TabsTrigger>
          <TabsTrigger value="investigations">Investigations</TabsTrigger>
          <TabsTrigger value="capa">CAPA</TabsTrigger>
          <TabsTrigger value="change-control">Change Control</TabsTrigger>
        </TabsList>

        <TabsContent value="deviations" className="space-y-6">
          <div className="flex justify-between items-center">
            <div className="grid gap-4 md:grid-cols-4">
              <Card>
                <CardContent className="p-4">
                  <div className="text-2xl font-bold text-red-600">{(deviations || []).filter(d => d.status === 'open').length}</div>
                  <div className="text-sm text-muted-foreground">Open</div>
                </CardContent>
              </Card>
              <Card>
                <CardContent className="p-4">
                  <div className="text-2xl font-bold text-blue-600">{(deviations || []).filter(d => d.status === 'investigating').length}</div>
                  <div className="text-sm text-muted-foreground">Investigating</div>
                </CardContent>
              </Card>
              <Card>
                <CardContent className="p-4">
                  <div className="text-2xl font-bold text-green-600">{(deviations || []).filter(d => d.status === 'resolved').length}</div>
                  <div className="text-sm text-muted-foreground">Resolved</div>
                </CardContent>
              </Card>
              <Card>
                <CardContent className="p-4">
                  <div className="text-2xl font-bold text-orange-600">{(deviations || []).filter(d => d.severity === 'critical').length}</div>
                  <div className="text-sm text-muted-foreground">Critical</div>
                </CardContent>
              </Card>
            </div>
            <Button>
              <Plus className="h-4 w-4 mr-2" />
              New Deviation
            </Button>
          </div>

          <div className="grid gap-4">
            {(deviations || []).map((deviation) => (
              <Card key={deviation.id} className="cursor-pointer hover:shadow-md transition-shadow">
                <CardContent className="p-6">
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <div className="flex items-center gap-3 mb-2">
                        <span className="font-mono font-medium">{deviation.id}</span>
                        <Badge className={getSeverityColor(deviation.severity)}>
                          {deviation.severity}
                        </Badge>
                        <Badge className={getStatusColor(deviation.status)}>
                          {deviation.status}
                        </Badge>
                      </div>
                      <h3 className="font-semibold mb-2">{deviation.title}</h3>
                      <p className="text-sm text-muted-foreground mb-3">{deviation.description}</p>
                      <div className="flex items-center gap-4 text-sm text-muted-foreground">
                        <span>Batch: {deviation.batchId}</span>
                        <span>Reported by: {deviation.reportedBy}</span>
                        <span>Date: {formatDate(deviation.reportedDate)}</span>
                      </div>
                    </div>
                    <div className="flex gap-2">
                      <Dialog>
                        <DialogTrigger asChild>
                          <Button variant="outline" size="sm" onClick={() => setSelectedDeviation(deviation)}>
                            <MagnifyingGlass className="h-4 w-4 mr-2" />
                            Investigate
                          </Button>
                        </DialogTrigger>
                        <DialogContent className="max-w-4xl">
                          <DialogHeader>
                            <DialogTitle>Deviation Investigation - {deviation.id}</DialogTitle>
                          </DialogHeader>
                          <div className="space-y-6">
                            <div className="grid gap-4">
                              <div>
                                <Label>Title</Label>
                                <div className="font-medium">{deviation.title}</div>
                              </div>
                              <div>
                                <Label>Description</Label>
                                <div>{deviation.description}</div>
                              </div>
                              <div className="grid grid-cols-3 gap-4">
                                <div>
                                  <Label>Severity</Label>
                                  <Badge className={getSeverityColor(deviation.severity)}>
                                    {deviation.severity}
                                  </Badge>
                                </div>
                                <div>
                                  <Label>Status</Label>
                                  <Badge className={getStatusColor(deviation.status)}>
                                    {deviation.status}
                                  </Badge>
                                </div>
                                <div>
                                  <Label>Batch ID</Label>
                                  <div className="font-mono">{deviation.batchId}</div>
                                </div>
                              </div>
                            </div>
                            
                            <div className="space-y-4">
                              <div className="flex gap-2">
                                <Button 
                                  onClick={() => generateAIAnalysis(deviation)}
                                  className="flex items-center gap-2"
                                >
                                  <Robot className="h-4 w-4" />
                                  AI Root Cause Analysis
                                </Button>
                                <Button 
                                  variant="outline"
                                  onClick={() => updateDeviationStatus(deviation.id, 'investigating')}
                                >
                                  Start Investigation
                                </Button>
                                <Button 
                                  variant="outline"
                                  onClick={() => updateDeviationStatus(deviation.id, 'resolved')}
                                >
                                  Mark Resolved
                                </Button>
                              </div>
                              
                              <div>
                                <Label htmlFor="investigation-notes">Investigation Notes</Label>
                                <Textarea
                                  id="investigation-notes"
                                  placeholder="Enter investigation findings, data analysis, and conclusions..."
                                  value={investigationNotes}
                                  onChange={(e) => setInvestigationNotes(e.target.value)}
                                  className="min-h-32"
                                />
                              </div>
                            </div>
                          </div>
                        </DialogContent>
                      </Dialog>
                      
                      {deviation.severity === 'high' || deviation.severity === 'critical' ? (
                        <Button variant="destructive" size="sm" className="pulse-critical">
                          <Warning className="h-4 w-4 mr-2" />
                          Urgent
                        </Button>
                      ) : null}
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </TabsContent>

        <TabsContent value="investigations" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <MagnifyingGlass className="h-5 w-5" />
                Active Investigations
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {(deviations || []).filter(d => d.status === 'investigating').map(deviation => (
                  <div key={deviation.id} className="flex items-center justify-between p-4 border rounded-lg">
                    <div>
                      <div className="font-medium">{deviation.id} - {deviation.title}</div>
                      <div className="text-sm text-muted-foreground">
                        Assigned to: {deviation.assignedTo || 'Unassigned'}
                      </div>
                    </div>
                    <div className="flex gap-2">
                      <Button variant="outline" size="sm">
                        <FileText className="h-4 w-4 mr-2" />
                        View Progress
                      </Button>
                      <Button 
                        size="sm"
                        onClick={() => generateAIAnalysis(deviation)}
                      >
                        <Robot className="h-4 w-4 mr-2" />
                        AI Assist
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="capa" className="space-y-6">
          <div className="flex justify-between items-center">
            <div className="grid gap-4 md:grid-cols-4">
              <Card>
                <CardContent className="p-4">
                  <div className="text-2xl font-bold text-blue-600">{(capas || []).filter(c => c.status === 'draft').length}</div>
                  <div className="text-sm text-muted-foreground">Draft</div>
                </CardContent>
              </Card>
              <Card>
                <CardContent className="p-4">
                  <div className="text-2xl font-bold text-green-600">{(capas || []).filter(c => c.status === 'approved').length}</div>
                  <div className="text-sm text-muted-foreground">Approved</div>
                </CardContent>
              </Card>
              <Card>
                <CardContent className="p-4">
                  <div className="text-2xl font-bold text-yellow-600">{(capas || []).filter(c => c.status === 'implementing').length}</div>
                  <div className="text-sm text-muted-foreground">Implementing</div>
                </CardContent>
              </Card>
              <Card>
                <CardContent className="p-4">
                  <div className="text-2xl font-bold text-purple-600">{(capas || []).filter(c => c.status === 'complete').length}</div>
                  <div className="text-sm text-muted-foreground">Complete</div>
                </CardContent>
              </Card>
            </div>
            <Button>
              <Plus className="h-4 w-4 mr-2" />
              New CAPA
            </Button>
          </div>

          <div className="space-y-4">
            {(capas || []).map((capa) => (
              <Card key={capa.id}>
                <CardContent className="p-6">
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <div className="flex items-center gap-3 mb-2">
                        <span className="font-mono font-medium">{capa.id}</span>
                        <Badge variant={capa.type === 'corrective' ? 'default' : 'secondary'}>
                          {capa.type}
                        </Badge>
                        <Badge className={getStatusColor(capa.status)}>
                          {capa.status}
                        </Badge>
                        <Badge variant="outline">
                          {capa.priority} priority
                        </Badge>
                      </div>
                      <h3 className="font-semibold mb-2">{capa.title}</h3>
                      <p className="text-sm text-muted-foreground mb-3">{capa.description}</p>
                      <div className="flex items-center gap-4 text-sm text-muted-foreground">
                        <span>Due: {formatDate(capa.dueDate)}</span>
                        <span>Assigned to: {capa.assignedTo}</span>
                        <span>Actions: {capa.actions.length}</span>
                      </div>
                    </div>
                    <div className="flex gap-2">
                      <Button variant="outline" size="sm">
                        <CheckCircle className="h-4 w-4 mr-2" />
                        Review
                      </Button>
                      <Button variant="outline" size="sm">
                        <Clock className="h-4 w-4 mr-2" />
                        Timeline
                      </Button>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </TabsContent>

        <TabsContent value="change-control" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Change Control</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-center py-12 text-muted-foreground">
                <FileText className="h-12 w-12 mx-auto mb-4 opacity-50" />
                <p>Change control management coming soon...</p>
                <Button className="mt-4">
                  <Plus className="h-4 w-4 mr-2" />
                  Create Change Request
                </Button>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      <Dialog open={isAIAssistantOpen} onOpenChange={setIsAIAssistantOpen}>
        <DialogContent className="max-w-4xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Robot className="h-5 w-5" />
              AI Root Cause Analysis Assistant
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="p-4 bg-muted rounded-lg">
              <h4 className="font-medium mb-2">Analysis Results:</h4>
              <div className="whitespace-pre-wrap text-sm">
                {aiAnalysis}
              </div>
            </div>
            <div className="flex justify-end gap-2">
              <Button variant="outline" onClick={() => setIsAIAssistantOpen(false)}>
                Close
              </Button>
              <Button onClick={() => {
                navigator.clipboard.writeText(aiAnalysis)
                toast.success('Analysis copied to clipboard')
              }}>
                Copy Analysis
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  )
}