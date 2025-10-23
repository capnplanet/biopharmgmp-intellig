import { NavigationItem } from '../App'
import { Button } from '@/components/ui/button'
import { 
  House, 
  TestTube, 
  ShieldCheck, 
  ChartLine, 
  FileText,
  Atom
} from '@phosphor-icons/react'
import { useAuditLogger } from '@/hooks/use-audit'
import { useKV } from '@github/spark/hooks'
import type { AuditEvent } from '@/hooks/use-audit'

interface SidebarProps {
  activeTab: NavigationItem
  onTabChange: (tab: NavigationItem) => void
}

const navigationItems = [
  { id: 'dashboard' as const, label: 'Dashboard', icon: House },
  { id: 'batches' as const, label: 'Batch Monitoring', icon: TestTube },
  { id: 'quality' as const, label: 'Quality Management', icon: ShieldCheck },
  { id: 'analytics' as const, label: 'Analytics', icon: ChartLine },
  { id: 'advanced-analytics' as const, label: 'Advanced Analytics', icon: ChartLine },
  { id: 'audit' as const, label: 'Audit Trail', icon: FileText },
  { id: 'assistant' as const, label: 'Operations Copilot', icon: Atom },
]

export function Sidebar({ activeTab, onTabChange }: SidebarProps) {
  const { log } = useAuditLogger()
  const [events = []] = useKV<AuditEvent[]>('audit-events', [])
  const aiCount = (events || []).filter(e => e.module === 'ai').length
  return (
    <div className="w-64 bg-card border-r border-border flex flex-col">
      <div className="p-6 border-b border-border">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 bg-primary rounded-lg flex items-center justify-center">
            <Atom className="w-5 h-5 text-primary-foreground" />
          </div>
          <div>
            <h1 className="text-lg font-semibold text-foreground">BioPharm AI</h1>
            <p className="text-xs text-muted-foreground">GMP Manufacturing Oversight</p>
          </div>
        </div>
      </div>
      
      <nav className="flex-1 p-4">
        <div className="space-y-2">
          {navigationItems.map((item) => {
            const Icon = item.icon
            return (
              <Button
                key={item.id}
                variant={activeTab === item.id ? 'default' : 'ghost'}
                className="w-full justify-start gap-3 h-12"
                onClick={() => { onTabChange(item.id); log('Navigate', 'system', `Tab change to ${item.id}`) }}
              >
                <Icon className="w-5 h-5" />
                <span className="flex-1 text-left">{item.label}</span>
                {item.id === 'audit' && aiCount > 0 && (
                  <span className="ml-auto inline-flex items-center justify-center rounded-full bg-cyan-600 text-white text-[10px] font-semibold min-w-[20px] h-5 px-1">
                    {aiCount}
                  </span>
                )}
              </Button>
            )
          })}
        </div>
      </nav>
      
      <div className="p-4 border-t border-border">
        <div className="text-xs text-muted-foreground">
          <div>System Status: <span className="text-success font-medium">Operational</span></div>
          <div>Last Update: {new Date().toLocaleTimeString()}</div>
        </div>
      </div>
    </div>
  )
}