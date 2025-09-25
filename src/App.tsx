import { useState } from 'react'
import { useKV } from '@github/spark/hooks'
import { Sidebar } from './components/Sidebar'
import { Dashboard } from './components/Dashboard'
import { BatchMonitoring } from './components/BatchMonitoring'
import { QualityManagement } from './components/QualityManagement'
import { Analytics } from './components/Analytics'
import { AuditTrail } from './components/AuditTrail'
import { Toaster } from '@/components/ui/sonner'

export type NavigationItem = 'dashboard' | 'batches' | 'quality' | 'analytics' | 'audit'

function App() {
  const [activeTab, setActiveTab] = useKV<NavigationItem>('active-tab', 'dashboard')

  const renderContent = () => {
    switch (activeTab) {
      case 'dashboard':
        return <Dashboard />
      case 'batches':
        return <BatchMonitoring />
      case 'quality':
        return <QualityManagement />
      case 'analytics':
        return <Analytics />
      case 'audit':
        return <AuditTrail />
      default:
        return <Dashboard />
    }
  }

  return (
    <div className="flex h-screen bg-background">
      <Sidebar activeTab={activeTab || 'dashboard'} onTabChange={setActiveTab} />
      <main className="flex-1 overflow-hidden">
        {renderContent()}
      </main>
      <Toaster />
    </div>
  )
}

export default App