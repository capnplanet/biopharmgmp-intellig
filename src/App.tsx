import { useKV } from '@github/spark/hooks'
import { type PointerEvent as ReactPointerEvent, useCallback, useEffect, useRef, useState } from 'react'
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
import { ChangeControlCreationWizard } from '@/components/ChangeControlCreationWizard'
import { ArchiveView } from '@/components/ArchiveView'
import { InvestigationWorkflow } from '@/components/InvestigationWorkflow'
import { startDigitalTwin } from '@/lib/digitalTwin'
import { AutomationBridge } from '@/components/AutomationBridge'
import { initializeQualityAutomation } from '@/lib/qualityAutomation'
import { Button } from '@/components/ui/button'
import { Slider } from '@/components/ui/slider'
import { Play, Pause, Minus, ArrowsOutSimple } from '@phosphor-icons/react'
import { DeviationCreationWizard } from '@/components/DeviationCreationWizard'
import { CapaCreationWizard } from '@/components/CapaCreationWizard'
import { cn } from '@/lib/utils'
import { OperationsAssistantPage } from '@/components/OperationsAssistantPage'

export type NavigationItem = 'dashboard' | 'batches' | 'quality' | 'analytics' | 'advanced-analytics' | 'audit' | 'assistant'

const normalizeQualityRoute = (value: string | undefined) => {
  if (!value) return ''
  const trimmed = value.replace(/^#/, '')
  const withoutTab = trimmed.startsWith('quality/') ? trimmed.slice('quality/'.length) : trimmed
  return withoutTab.replace(/^\/+|\/+$/g, '')
}

function App() {
  const [activeTabKV, setActiveTabKV] = useKV<NavigationItem>('active-tab', 'dashboard')
  const [routeKV, setRouteKV] = useKV<string>('route', '')

  const [activeTab, setActiveTabState] = useState<NavigationItem>(activeTabKV ?? 'dashboard')
  const [route, setRouteState] = useState<string>(routeKV ?? '')

  useEffect(() => {
    const next = activeTabKV ?? 'dashboard'
    if (next !== activeTab) setActiveTabState(next)
  }, [activeTabKV, activeTab])

  useEffect(() => {
    const next = routeKV ?? ''
    if (next !== route) setRouteState(next)
  }, [routeKV, route])

  const setActiveTab = useCallback((tab: NavigationItem) => {
    setActiveTabState(tab)
    setActiveTabKV(tab)
  }, [setActiveTabKV])

  const setRoute = useCallback((value: string) => {
    setRouteState(value)
    setRouteKV(value)
  }, [setRouteKV])

  // Hash deep linking: #<tab>[/<route>]
  useEffect(() => {
    const parseHash = (hash: string): { tab: NavigationItem; r: string } => {
      const raw = (hash || '').replace(/^#/, '')
      if (!raw) return { tab: 'dashboard', r: '' }
      const parts = raw.split('/').filter(Boolean)
      const tab = (parts[0] as NavigationItem) || 'dashboard'
  const validTabs: NavigationItem[] = ['dashboard', 'batches', 'quality', 'analytics', 'advanced-analytics', 'audit', 'assistant']
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
      case 'quality': {
        const qualityRoute = normalizeQualityRoute(route)
        // Render sub-pages for quality route overlays
        if (qualityRoute === 'deviation/new') {
          return <DeviationCreationWizard onCancel={() => setRoute('')} />
        }
        if (qualityRoute.startsWith('investigation/')) {
          const parts = qualityRoute.split('/').filter(Boolean)
          const [, investigationId] = parts
          if (investigationId) {
            return <InvestigationWorkflow id={investigationId} onBack={() => setRoute('')} />
          }
        }
        if (qualityRoute === 'capa/new') {
          return <CapaCreationWizard onCancel={() => setRoute('')} />
        }
        if (qualityRoute.startsWith('capa/')) {
          const parts = qualityRoute.split('/').filter(Boolean)
          // Expected: capa/:id/review or capa/:id/timeline
          const [, capaId, subpage] = parts
          if (parts.length === 3 && capaId && subpage === 'review') {
            return <CapaReview id={capaId} onBack={() => setRoute('')} />
          }
          if (parts.length === 3 && capaId && subpage === 'timeline') {
            return <CapaTimeline id={capaId} onBack={() => setRoute('')} />
          }
        }
        if (qualityRoute.startsWith('deviation/')) {
          const parts = qualityRoute.split('/').filter(Boolean)
          const [, devId] = parts
          if (devId) {
            return <DeviationDetails id={devId} onBack={() => setRoute('')} />
          }
        }
        if (qualityRoute.startsWith('archive')) {
          const parts = qualityRoute.split('/').filter(Boolean)
          const batchId = parts.length >= 2 ? parts[1] : undefined
          return <ArchiveView batchId={batchId} onBack={() => setRoute('')} />
        }
        if (qualityRoute === 'cc/new') {
          return <ChangeControlCreationWizard onCancel={() => setRoute('')} />
        }
        if (qualityRoute.startsWith('cc/')) {
          const parts = qualityRoute.split('/').filter(Boolean)
          const [, ccId] = parts
          if (ccId) {
            return <ChangeControlDetails id={ccId} onBack={() => setRoute('')} />
          }
        }
        return <QualityManagement />
      }
      case 'analytics':
        return <Analytics />
      case 'advanced-analytics':
        return <AdvancedAnalytics />
      case 'audit':
        return <AuditTrail />
      case 'assistant':
        return <OperationsAssistantPage />
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
  const [isMinimized, setIsMinimized] = useState(false)
  const [position, setPosition] = useState({ x: 16, y: 16 })
  const [isDragging, setIsDragging] = useState(false)
  const panelRef = useRef<HTMLDivElement | null>(null)
  const dragOffsetRef = useRef({ x: 0, y: 0 })
  const isDraggingRef = useRef(false)
  const initializedRef = useRef(false)

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

  const clampPosition = useCallback((x: number, y: number) => {
    if (typeof window === 'undefined') return { x, y }
    const panel = panelRef.current
    const margin = 12
    const width = panel?.offsetWidth ?? 280
    const height = panel?.offsetHeight ?? (isMinimized ? 48 : 180)
    const maxX = Math.max(margin, window.innerWidth - width - margin)
    const maxY = Math.max(margin, window.innerHeight - height - margin)
    return {
      x: Math.min(Math.max(margin, x), maxX),
      y: Math.min(Math.max(margin, y), maxY)
    }
  }, [isMinimized])

  useEffect(() => {
    if (typeof window === 'undefined') return
    if (initializedRef.current) return
    const frame = window.requestAnimationFrame(() => {
      const panel = panelRef.current
      if (!panel) return
      const rect = panel.getBoundingClientRect()
      const margin = 16
      const desiredX = window.innerWidth - rect.width - margin
      const desiredY = window.innerHeight - rect.height - margin
      setPosition(clampPosition(desiredX, desiredY))
      initializedRef.current = true
    })
    return () => window.cancelAnimationFrame(frame)
  }, [clampPosition])

  useEffect(() => {
    if (typeof window === 'undefined') return
    const handleResize = () => {
      setPosition((prev) => {
        const next = clampPosition(prev.x, prev.y)
        if (prev.x === next.x && prev.y === next.y) return prev
        return next
      })
    }
    window.addEventListener('resize', handleResize)
    return () => window.removeEventListener('resize', handleResize)
  }, [clampPosition])

  useEffect(() => {
    setPosition((prev) => {
      const next = clampPosition(prev.x, prev.y)
      if (prev.x === next.x && prev.y === next.y) return prev
      return next
    })
  }, [isMinimized, clampPosition])

  const handlePointerDown = useCallback((event: ReactPointerEvent<HTMLElement>) => {
    if (event.button !== 0) return
    if ((event.target as HTMLElement).closest('[data-no-drag]')) return
    const panel = panelRef.current
    if (!panel) return
    const rect = panel.getBoundingClientRect()
    dragOffsetRef.current = {
      x: event.clientX - rect.left,
      y: event.clientY - rect.top
    }
    isDraggingRef.current = true
    setIsDragging(true)
    try {
      event.currentTarget.setPointerCapture(event.pointerId)
    } catch {
      // Pointer capture may not be supported
    }
    event.preventDefault()
  }, [])

  const handlePointerMove = useCallback((event: ReactPointerEvent<HTMLElement>) => {
    if (!isDraggingRef.current) return
    const { x, y } = clampPosition(event.clientX - dragOffsetRef.current.x, event.clientY - dragOffsetRef.current.y)
    setPosition((prev) => (prev.x === x && prev.y === y ? prev : { x, y }))
    event.preventDefault()
  }, [clampPosition])

  const endDrag = useCallback((event: ReactPointerEvent<HTMLElement>) => {
    if (!isDraggingRef.current) return
    isDraggingRef.current = false
    setIsDragging(false)
    try {
      event.currentTarget.releasePointerCapture(event.pointerId)
    } catch {
      // ignore
    }
    event.preventDefault()
  }, [])

  const dragHandleEvents = {
    onPointerDown: handlePointerDown,
    onPointerMove: handlePointerMove,
    onPointerUp: endDrag,
    onPointerCancel: endDrag
  }

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
    <div
      ref={panelRef}
      className="fixed top-0 left-0 z-50 select-none"
      style={{ transform: `translate3d(${position.x}px, ${position.y}px, 0)` }}
    >
      {isMinimized ? (
        <div
          className={cn(
            'bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60 border rounded-lg shadow px-3 py-2 flex items-center gap-2 min-w-[200px]',
            isDragging ? 'cursor-grabbing' : 'cursor-grab'
          )}
          {...dragHandleEvents}
        >
          <div className="flex items-center gap-2 text-xs text-muted-foreground">
            <span className="font-medium text-foreground">Digital Twin</span>
            <span
              className={cn('inline-flex h-2.5 w-2.5 rounded-full', running ? 'bg-success' : 'bg-muted-foreground/60')}
              aria-hidden
            />
            <span>{running ? 'Running' : 'Paused'}</span>
          </div>
          <div className="ml-auto flex items-center gap-1">
            <Button
              data-no-drag
              variant="ghost"
              size="icon"
              onClick={toggle}
              aria-label={running ? 'Pause twin' : 'Resume twin'}
            >
              {running ? <Pause className="h-4 w-4" /> : <Play className="h-4 w-4" />}
            </Button>
            <Button
              data-no-drag
              variant="outline"
              size="icon"
              onClick={() => setIsMinimized(false)}
              aria-label="Expand twin controls"
            >
              <ArrowsOutSimple className="h-4 w-4" />
            </Button>
          </div>
        </div>
      ) : (
        <div className="bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60 border rounded-lg shadow p-3 w-[280px]">
          <div
            className={cn('flex items-center justify-between mb-3', isDragging ? 'cursor-grabbing' : 'cursor-grab')}
            {...dragHandleEvents}
          >
            <div className="text-xs font-medium text-muted-foreground">Digital Twin</div>
            <div className="flex items-center gap-2">
              <Button
                data-no-drag
                variant="ghost"
                size="icon"
                onClick={() => setIsMinimized(true)}
                aria-label="Minimize twin controls"
              >
                <Minus className="h-4 w-4" />
              </Button>
              <Button
                data-no-drag
                variant="outline"
                size="icon"
                onClick={toggle}
                aria-label={running ? 'Pause twin' : 'Resume twin'}
              >
                {running ? <Pause className="h-4 w-4" /> : <Play className="h-4 w-4" />}
              </Button>
            </div>
          </div>
          <div className="space-y-2">
            <div className="flex items-center justify-between text-xs text-muted-foreground">
              <span>Simulation speed</span>
              <span>{speed}s/tick</span>
            </div>
            <div className="px-1" data-no-drag>
              <Slider min={5} max={600} step={5} value={[speed]} onValueChange={(v) => setSpeed(v[0] || 60)} />
            </div>
          </div>
        </div>
      )}
    </div>
  )
}