import { useKV } from '@github/spark/hooks'
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

export type NavigationItem = 'dashboard' | 'batches' | 'quality' | 'analytics' | 'advanced-analytics' | 'audit'

function App() {
  const [activeTab, setActiveTab] = useKV<NavigationItem>('active-tab', 'dashboard')
  // lightweight route overlay for per-batch pages under the Batches tab
  const [route, setRoute] = useKV<string>('route', '')

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
        {renderContent()}
      </main>
      <Toaster />
    </div>
  )
}

export default App