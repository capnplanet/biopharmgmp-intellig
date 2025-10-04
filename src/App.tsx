import { useKV } from '@github/spark/hooks'
import { useEffect, useState } from 'react'
import { Sidebar } from './components/Sidebar'
import { Dashboard } from './components/Dashboard'
import { BatchMonitoring } from './components/BatchMonitoring'
import { QualityManagement } from './components/QualityManagement'
import { Analytics } from './components/Analytics'
import { AuditTrail } from './components/AuditTrail'
import { Toaster } from '@/components/ui/sonner'
import { AdvancedAnalytics } from '@/components/AdvancedAnalytics'
import { BatchDetails } from '@/components/BatchDetails'
import { BatchAnalytics } from '@/components/BatchAnalytics'
import { CapaReview } from '@/components/CapaReview'
import { CapaTimeline } from '@/components/CapaTimeline'
import { DeviationDetails } from '@/components/DeviationDetails'
import { ChangeControlDetails } from '@/components/ChangeControlDetails'
import { InvestigationWorkflow } from '@/components/InvestigationWorkflow'
import { startDigitalTwin } from '@/lib/digitalTwin'
import { AutomationBridge } from '@/components/AutomationBridge'
import { initializeQualityAutomation } from '@/lib/qualityAutomation'
import { Button } from '@/components/ui/button'
import { Slider } from '@/components/ui/slider'
import { Play, Pause } from '@phosphor-icons/react'

export type NavigationItem = 'dashboard' | 'batches' | 'quality' | 'analytics' | 'advanced-analytics' | 'audit'

function App() {
  const [activeTab, setActiveTab] = useKV<NavigationItem>('active-tab', 'dashboard')
  // lightweight route overlay for per-batch pages under the Batches tab
  const [route, setRoute] = useKV<string>('route', '')

  // Hash deep linking: #<tab>[/<route>]
  useEffect(() => {
    const parseHash = (hash: string): { tab: NavigationItem; r: string } => {
      const raw = (hash || '').replace(/^#/, '')
      if (!raw) return { tab: 'dashboard', r: '' }
      const parts = raw.split('/').filter(Boolean)
      const tab = (parts[0] as NavigationItem) || 'dashboard'
      const validTabs: NavigationItem[] = ['dashboard', 'batches', 'quality', 'analytics', 'advanced-analytics', 'audit']
      const safeTab: NavigationItem = validTabs.includes(tab) ? tab : 'dashboard'
      const r = parts.slice(1).join('/')
      // Only keep route for tabs that support overlays
      const safeRoute = safeTab === 'batches' || safeTab === 'quality' ? r : ''
      return { tab: safeTab, r: safeRoute }
    }

    const applyFromHash = () => {
      const { tab, r } = parseHash(window.location.hash)
      if (tab && tab !== (activeTab || 'dashboard')) setActiveTab(tab)
      if (r !== (route || '')) setRoute(r)
      if ((tab !== 'batches' && tab !== 'quality') && route) setRoute('')
    }

    // Initialize from current hash
    applyFromHash()
    // Respond to user changing the hash
    const onHashChange = () => applyFromHash()
    window.addEventListener('hashchange', onHashChange)
    return () => window.removeEventListener('hashchange', onHashChange)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  // Keep hash in sync with state
  useEffect(() => {
    const base = activeTab || 'dashboard'
    const suffix = (base === 'batches' || base === 'quality') && route ? `/${route}` : ''
    const nextHash = `#${base}${suffix}`
    if (window.location.hash !== nextHash) {
      // Avoid adding entries to history on every navigation to keep back button useful
      if (window.history && window.history.replaceState) {
        window.history.replaceState(null, '', nextHash)
      } else {
        window.location.hash = nextHash
      }
    }
  }, [activeTab, route])

  useEffect(() => {
    initializeQualityAutomation()
  }, [])

  const renderContent = () => {
    switch (activeTab) {
      case 'dashboard':
        return <Dashboard />
      case 'batches': {
        // If a batch sub-route is set, render its page instead of the list
        const safeRoute = route || ''
        if (safeRoute.startsWith('batch/')) {
          const parts = safeRoute.split('/').filter(Boolean)
          // Expected: batch/:id/view or batch/:id/analytics
          const [, batchId, subpage] = parts
          if (parts.length === 3 && batchId && subpage === 'view') {
            return <BatchDetails batchId={batchId} onBack={() => setRoute('')} />
          }
          if (parts.length === 3 && batchId && subpage === 'analytics') {
            return <BatchAnalytics batchId={batchId} onBack={() => setRoute('')} />
          }
        }
        return <BatchMonitoring />
      }
      case 'quality':
        // Render sub-pages for quality route overlays
        if ((route || '').startsWith('investigation/')) {
          const parts = (route || '').split('/').filter(Boolean)
          const [, investigationId] = parts
          if (investigationId) {
            return <InvestigationWorkflow id={investigationId} onBack={() => setRoute('')} />
          }
        }
        if ((route || '').startsWith('capa/')) {
          const parts = (route || '').split('/').filter(Boolean)
          // Expected: capa/:id/review or capa/:id/timeline
          const [, capaId, subpage] = parts
          if (parts.length === 3 && capaId && subpage === 'review') {
            return <CapaReview id={capaId} onBack={() => setRoute('')} />
          }
          if (parts.length === 3 && capaId && subpage === 'timeline') {
            return <CapaTimeline id={capaId} onBack={() => setRoute('')} />
          }
        }
        if ((route || '').startsWith('deviation/')) {
          const parts = (route || '').split('/').filter(Boolean)
          const [, devId] = parts
          if (devId) {
            return <DeviationDetails id={devId} onBack={() => setRoute('')} />
          }
        }
        if ((route || '').startsWith('cc/')) {
          const parts = (route || '').split('/').filter(Boolean)
          const [, ccId] = parts
          if (ccId) {
            return <ChangeControlDetails id={ccId} onBack={() => setRoute('')} />
          }
        }
        return <QualityManagement />
      case 'analytics':
        return <Analytics />
      case 'advanced-analytics':
        return <AdvancedAnalytics />
      case 'audit':
        return <AuditTrail />
      default:
        return <Dashboard />
    }
  }

  return (
    <div className="flex h-screen bg-background">
      <Sidebar activeTab={activeTab || 'dashboard'} onTabChange={(tab) => {
        // Leaving a sub-page clears the overlay route
        if (tab !== 'batches') setRoute('')
        setActiveTab(tab)
      }} />
      <main className="flex-1 overflow-hidden">
        <AutomationBridge />
        {renderContent()}
        {/* Digital Twin Controls (floating) */}
        <TwinControls />
      </main>
      <Toaster />
    </div>
  )
}

export default App

function TwinControls() {
  // Start twin on mount
  const [running, setRunning] = useState(true)
  const [speed, setSpeed] = useState(60)
  useEffect(() => {
    const twin = startDigitalTwin({ tickMs: 2000, simSecondsPerTick: speed, monitorEverySimSeconds: 30 })
    return () => twin.stop()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  // Update speed reactively
  useEffect(() => {
    const twin = startDigitalTwin()
    twin.setSpeed(speed)
  }, [speed])

  const toggle = () => {
    const twin = startDigitalTwin()
    if (running) {
      twin.stop()
      setRunning(false)
    } else {
      twin.start()
      setRunning(true)
    }
  }

  return (
    <div className="fixed bottom-4 right-4 z-50 bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60 border rounded-lg shadow p-3 w-[280px]">
      <div className="flex items-center justify-between mb-3">
        <div className="text-xs font-medium text-muted-foreground">Digital Twin</div>
        <Button variant="outline" size="icon" onClick={toggle} aria-label={running ? 'Pause twin' : 'Resume twin'}>
          {running ? <Pause className="h-4 w-4" /> : <Play className="h-4 w-4" />}
        </Button>
      </div>
      <div className="space-y-2">
        <div className="flex items-center justify-between text-xs text-muted-foreground">
          <span>Simulation speed</span>
          <span>{speed}s/tick</span>
        </div>
        <div className="px-1">
          <Slider min={5} max={600} step={5} value={[speed]} onValueChange={(v) => setSpeed(v[0] || 60)} />
        </div>
      </div>
    </div>
  )
}