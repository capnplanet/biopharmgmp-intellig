import { useState, useEffect } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Tooltip, TooltipTrigger, TooltipContent } from '@/components/ui/tooltip'
import { Badge } from '@/components/ui/badge'
import { Progress } from '@/components/ui/progress'
import { 
  TestTube, 
  Gear, 
  Warning, 
  CheckCircle,
  Clock,
  TrendUp
} from '@phosphor-icons/react'

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

interface BatchStatus {
  id: string
  product: string
  stage: string
  progress: number
  status: 'running' | 'complete' | 'warning' | 'error'
  startTime: Date
}

interface EquipmentStatus {
  id: string
  name: string
  type: string
  status: 'online' | 'offline' | 'maintenance' | 'error'
  utilization: number
}

export function Dashboard() {
  const [activeBatches] = useState<BatchStatus[]>([
    {
      id: 'BTH-2024-001',
      product: 'Monoclonal Antibody X1',
      stage: 'Fermentation',
      progress: 78,
      status: 'running',
      startTime: new Date('2024-01-15T08:00:00Z')
    },
    {
      id: 'BTH-2024-002',
      product: 'Small Molecule API-Y',
      stage: 'Crystallization',
      progress: 45,
      status: 'running',
      startTime: new Date('2024-01-16T14:30:00Z')
    },
    {
      id: 'BTH-2024-003',
      product: 'Protein Therapeutic Z',
      stage: 'Purification',
      progress: 92,
      status: 'warning',
      startTime: new Date('2024-01-14T10:15:00Z')
    }
  ])

  const [equipment] = useState<EquipmentStatus[]>([
    { id: 'BIO-001', name: 'Bioreactor 1', type: 'Fermentation', status: 'online', utilization: 85 },
    { id: 'CHR-001', name: 'Chromatography Skid A', type: 'Purification', status: 'online', utilization: 67 },
    { id: 'DRY-001', name: 'Spray Dryer 1', type: 'Drying', status: 'maintenance', utilization: 0 },
    { id: 'MIX-001', name: 'High Shear Mixer', type: 'Blending', status: 'online', utilization: 45 }
  ])

  const [currentTime, setCurrentTime] = useState(new Date())

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
        <div className="text-right">
          <div className="text-sm text-muted-foreground">Current Time</div>
          <div className="text-lg font-mono">{currentTime.toLocaleTimeString()}</div>
        </div>
      </div>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Tooltip>
          <TooltipTrigger asChild>
            <div>
              <KPICard
                title="Active Batches"
                value={activeBatches.filter(b => b.status === 'running').length}
                change="+2 from yesterday"
                icon={TestTube}
              />
            </div>
          </TooltipTrigger>
          <TooltipContent>
            Count of batches with status === 'running'. Updated by the live digital twin.
          </TooltipContent>
        </Tooltip>
        <Tooltip>
          <TooltipTrigger asChild>
            <div>
              <KPICard
                title="Equipment Online"
                value={`${equipment.filter(e => e.status === 'online').length}/${equipment.length}`}
                change="98.5% uptime"
                icon={Gear}
              />
            </div>
          </TooltipTrigger>
          <TooltipContent>
            Online equipment over total equipment in this summary. Represents current availability.
          </TooltipContent>
        </Tooltip>
        <Tooltip>
          <TooltipTrigger asChild>
            <div>
              <KPICard
                title="Open Deviations"
                value="3"
                change="2 pending investigation"
                status="warning"
                icon={Warning}
              />
            </div>
          </TooltipTrigger>
          <TooltipContent>
            Number of deviation records currently open in the quality system (demo placeholder).
          </TooltipContent>
        </Tooltip>
        <Tooltip>
          <TooltipTrigger asChild>
            <div>
              <KPICard
                title="Quality Score"
                value="97.8%"
                change="+0.3% this week"
                icon={CheckCircle}
              />
            </div>
          </TooltipTrigger>
          <TooltipContent>
            Composite indicator (demo) aggregating CPP compliance and first pass yield. For illustration only.
          </TooltipContent>
        </Tooltip>
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
                <div key={item.id} className="flex items-center justify-between">
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
            <div className="flex items-center gap-3 p-3 bg-warning/10 rounded-lg">
              <Warning className="h-4 w-4 text-warning" />
              <div className="flex-1">
                <div className="font-medium">Temperature deviation detected</div>
                <div className="text-sm text-muted-foreground">
                  Bioreactor 1 - BTH-2024-003 exceeded 37.5°C limit
                </div>
              </div>
              <div className="text-sm text-muted-foreground font-mono">
                {new Date(Date.now() - 5 * 60 * 1000).toLocaleTimeString()}
              </div>
            </div>
            
            <div className="flex items-center gap-3 p-3 bg-success/10 rounded-lg">
              <CheckCircle className="h-4 w-4 text-success" />
              <div className="flex-1">
                <div className="font-medium">Batch completion</div>
                <div className="text-sm text-muted-foreground">
                  BTH-2024-000 - Small Molecule API-X completed successfully
                </div>
              </div>
              <div className="text-sm text-muted-foreground font-mono">
                {new Date(Date.now() - 15 * 60 * 1000).toLocaleTimeString()}
              </div>
            </div>

            <div className="flex items-center gap-3 p-3 bg-muted/50 rounded-lg">
              <Clock className="h-4 w-4 text-muted-foreground" />
              <div className="flex-1">
                <div className="font-medium">Scheduled maintenance</div>
                <div className="text-sm text-muted-foreground">
                  Spray Dryer 1 - Preventive maintenance started
                </div>
              </div>
              <div className="text-sm text-muted-foreground font-mono">
                {new Date(Date.now() - 45 * 60 * 1000).toLocaleTimeString()}
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}