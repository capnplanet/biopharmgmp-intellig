import { useState, useEffect } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Progress } from '@/components/ui/progress'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { 
  TestTube, 
  Thermometer, 
  Gauge, 
  Drop,
  Eye,
  TrendUp,
  Warning
} from '@phosphor-icons/react'

interface BatchData {
  id: string
  product: string
  productType: 'small-molecule' | 'large-molecule'
  stage: string
  progress: number
  status: 'running' | 'complete' | 'warning' | 'error'
  startTime: Date
  equipment: string[]
  parameters: {
    temperature: { current: number; target: number; unit: string }
    pressure: { current: number; target: number; unit: string }
    pH: { current: number; target: number; unit: string }
    volume: { current: number; target: number; unit: string }
  }
  timeline: {
    stage: string
    startTime: Date
    endTime?: Date
    status: 'complete' | 'active' | 'pending'
  }[]
}

const mockBatches: BatchData[] = [
  {
    id: 'BTH-2024-001',
    product: 'Monoclonal Antibody X1',
    productType: 'large-molecule',
    stage: 'Fermentation',
    progress: 78,
    status: 'running',
    startTime: new Date('2024-01-15T08:00:00Z'),
    equipment: ['BIO-001', 'CHR-001', 'FIL-001'],
    parameters: {
      temperature: { current: 37.2, target: 37.0, unit: '°C' },
      pressure: { current: 1.2, target: 1.1, unit: 'bar' },
      pH: { current: 7.1, target: 7.0, unit: 'pH' },
      volume: { current: 1850, target: 2000, unit: 'L' }
    },
    timeline: [
      { stage: 'Media Preparation', startTime: new Date('2024-01-15T08:00:00Z'), endTime: new Date('2024-01-15T10:00:00Z'), status: 'complete' },
      { stage: 'Inoculation', startTime: new Date('2024-01-15T10:00:00Z'), endTime: new Date('2024-01-15T11:00:00Z'), status: 'complete' },
      { stage: 'Fermentation', startTime: new Date('2024-01-15T11:00:00Z'), status: 'active' },
      { stage: 'Harvest', startTime: new Date('2024-01-16T11:00:00Z'), status: 'pending' },
      { stage: 'Purification', startTime: new Date('2024-01-16T15:00:00Z'), status: 'pending' }
    ]
  },
  {
    id: 'BTH-2024-002',
    product: 'Small Molecule API-Y',
    productType: 'small-molecule',
    stage: 'Crystallization',
    progress: 45,
    status: 'running',
    startTime: new Date('2024-01-16T14:30:00Z'),
    equipment: ['REA-001', 'CRY-001', 'DRY-002'],
    parameters: {
      temperature: { current: 25.1, target: 25.0, unit: '°C' },
      pressure: { current: 0.95, target: 1.0, unit: 'bar' },
      pH: { current: 3.2, target: 3.0, unit: 'pH' },
      volume: { current: 500, target: 500, unit: 'L' }
    },
    timeline: [
      { stage: 'Synthesis', startTime: new Date('2024-01-16T14:30:00Z'), endTime: new Date('2024-01-16T18:30:00Z'), status: 'complete' },
      { stage: 'Crystallization', startTime: new Date('2024-01-16T18:30:00Z'), status: 'active' },
      { stage: 'Filtration', startTime: new Date('2024-01-17T06:30:00Z'), status: 'pending' },
      { stage: 'Drying', startTime: new Date('2024-01-17T10:30:00Z'), status: 'pending' }
    ]
  }
]

function ParameterCard({ label, current, target, unit, icon: Icon }: {
  label: string
  current: number
  target: number
  unit: string
  icon: React.ComponentType<{ className?: string }>
}) {
  const deviation = Math.abs(current - target)
  const maxDeviation = target * 0.1
  const status = deviation > maxDeviation ? 'warning' : 'normal'
  
  return (
    <Card>
      <CardContent className="p-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Icon className={`h-4 w-4 ${status === 'warning' ? 'text-warning' : 'text-muted-foreground'}`} />
            <span className="text-sm font-medium">{label}</span>
          </div>
          {status === 'warning' && (
            <Warning className="h-4 w-4 text-warning" />
          )}
        </div>
        <div className="mt-2">
          <div className="text-2xl font-mono font-bold">
            {current.toFixed(1)}{unit}
          </div>
          <div className="text-sm text-muted-foreground">
            Target: {target.toFixed(1)}{unit}
          </div>
        </div>
      </CardContent>
    </Card>
  )
}

function BatchTimeline({ timeline }: { timeline: BatchData['timeline'] }) {
  return (
    <div className="space-y-4">
      {timeline.map((item, index) => (
        <div key={index} className="flex items-center gap-4">
          <div className="flex flex-col items-center">
            <div className={`w-3 h-3 rounded-full ${
              item.status === 'complete' ? 'bg-success' :
              item.status === 'active' ? 'bg-primary' : 'bg-muted'
            }`} />
            {index < timeline.length - 1 && (
              <div className="w-px h-8 bg-border mt-2" />
            )}
          </div>
          <div className="flex-1">
            <div className="font-medium">{item.stage}</div>
            <div className="text-sm text-muted-foreground">
              Started: {item.startTime.toLocaleString()}
              {item.endTime && (
                <span> • Completed: {item.endTime.toLocaleString()}</span>
              )}
            </div>
          </div>
          <Badge variant={
            item.status === 'complete' ? 'default' :
            item.status === 'active' ? 'secondary' : 'outline'
          }>
            {item.status}
          </Badge>
        </div>
      ))}
    </div>
  )
}

export function BatchMonitoring() {
  const [selectedBatch, setSelectedBatch] = useState<BatchData>(mockBatches[0])
  const [, setCurrentTime] = useState(new Date())

  useEffect(() => {
    const timer = setInterval(() => setCurrentTime(new Date()), 30000)
    return () => clearInterval(timer)
  }, [])

  return (
    <div className="p-6 space-y-6 overflow-auto h-full">
      <div>
        <h1 className="text-3xl font-bold">Batch Monitoring</h1>
        <p className="text-muted-foreground">Real-time monitoring of manufacturing batches and equipment</p>
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        <Card className="lg:col-span-1">
          <CardHeader>
            <CardTitle>Active Batches</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {mockBatches.map((batch) => (
              <div
                key={batch.id}
                className={`p-3 rounded-lg border cursor-pointer transition-colors ${
                  selectedBatch.id === batch.id ? 'bg-primary/10 border-primary' : 'hover:bg-muted/50'
                }`}
                onClick={() => setSelectedBatch(batch)}
              >
                <div className="flex items-center justify-between">
                  <div>
                    <div className="font-medium font-mono">{batch.id}</div>
                    <div className="text-sm text-muted-foreground">{batch.product}</div>
                  </div>
                  <Badge variant={batch.productType === 'large-molecule' ? 'default' : 'secondary'}>
                    {batch.productType === 'large-molecule' ? 'Biologic' : 'Small Mol'}
                  </Badge>
                </div>
                <div className="mt-2">
                  <div className="flex justify-between text-sm mb-1">
                    <span>{batch.stage}</span>
                    <span>{batch.progress}%</span>
                  </div>
                  <Progress value={batch.progress} className="h-2" />
                </div>
              </div>
            ))}
          </CardContent>
        </Card>

        <div className="lg:col-span-2 space-y-6">
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle className="flex items-center gap-2">
                    <TestTube className="h-5 w-5" />
                    {selectedBatch.id} - {selectedBatch.product}
                  </CardTitle>
                  <p className="text-sm text-muted-foreground mt-1">
                    Started: {selectedBatch.startTime.toLocaleString()}
                  </p>
                </div>
                <div className="flex gap-2">
                  <Button variant="outline" size="sm">
                    <Eye className="h-4 w-4 mr-2" />
                    View Details
                  </Button>
                  <Button variant="outline" size="sm">
                    <TrendUp className="h-4 w-4 mr-2" />
                    Analytics
                  </Button>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              <Tabs defaultValue="parameters" className="w-full">
                <TabsList className="grid w-full grid-cols-3">
                  <TabsTrigger value="parameters">Parameters</TabsTrigger>
                  <TabsTrigger value="timeline">Timeline</TabsTrigger>
                  <TabsTrigger value="equipment">Equipment</TabsTrigger>
                </TabsList>
                
                <TabsContent value="parameters" className="mt-6">
                  <div className="grid gap-4 md:grid-cols-2">
                    <ParameterCard
                      label="Temperature"
                      current={selectedBatch.parameters.temperature.current}
                      target={selectedBatch.parameters.temperature.target}
                      unit={selectedBatch.parameters.temperature.unit}
                      icon={Thermometer}
                    />
                    <ParameterCard
                      label="Pressure"
                      current={selectedBatch.parameters.pressure.current}
                      target={selectedBatch.parameters.pressure.target}
                      unit={selectedBatch.parameters.pressure.unit}
                      icon={Gauge}
                    />
                    <ParameterCard
                      label="pH Level"
                      current={selectedBatch.parameters.pH.current}
                      target={selectedBatch.parameters.pH.target}
                      unit={selectedBatch.parameters.pH.unit}
                      icon={Drop}
                    />
                    <ParameterCard
                      label="Volume"
                      current={selectedBatch.parameters.volume.current}
                      target={selectedBatch.parameters.volume.target}
                      unit={selectedBatch.parameters.volume.unit}
                      icon={TestTube}
                    />
                  </div>
                </TabsContent>
                
                <TabsContent value="timeline" className="mt-6">
                  <BatchTimeline timeline={selectedBatch.timeline} />
                </TabsContent>
                
                <TabsContent value="equipment" className="mt-6">
                  <div className="space-y-3">
                    {selectedBatch.equipment.map((equipId, index) => (
                      <div key={equipId} className="flex items-center justify-between p-3 border rounded-lg">
                        <div>
                          <div className="font-medium">{equipId}</div>
                          <div className="text-sm text-muted-foreground">
                            {selectedBatch.productType === 'large-molecule' 
                              ? ['Bioreactor', 'Chromatography Skid', 'Filter'][index] || 'Equipment'
                              : ['Reactor', 'Crystallizer', 'Dryer'][index] || 'Equipment'
                            }
                          </div>
                        </div>
                        <Badge className="bg-success text-success-foreground">
                          Online
                        </Badge>
                      </div>
                    ))}
                  </div>
                </TabsContent>
              </Tabs>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  )
}