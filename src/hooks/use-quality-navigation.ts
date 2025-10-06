import { useCallback } from 'react'
import { useKV } from '@github/spark/hooks'
import type { NavigationItem } from '@/App'

export type QualityRoute =
  | ''
  | 'deviation/new'
  | `deviation/${string}`
  | `investigation/${string}`
  | 'capa/new'
  | `capa/${string}`
  | `capa/${string}/${'review' | 'timeline'}`
  | 'cc/new'
  | `cc/${string}`
  | `archive/${string}`

const normalizeRoute = (path: string | undefined) => {
  if (!path) return ''
  const trimmed = path.replace(/^#/, '')
  const withoutTab = trimmed.startsWith('quality/') ? trimmed.slice('quality/'.length) : trimmed
  return withoutTab.replace(/^\/+|\/+$/g, '')
}

const normalizeHash = (path: string | undefined) => {
  const cleanRoute = normalizeRoute(path)
  return cleanRoute ? `#quality/${cleanRoute}` : '#quality'
}

export function useQualityNavigation() {
  const [, setRoute] = useKV<string>('route', '')
  const [, setActiveTab] = useKV<NavigationItem>('active-tab', 'dashboard')
  return useCallback(
    (path?: string) => {
      const target = normalizeRoute(path)
      setActiveTab('quality')
      setRoute(target)
      if (typeof window !== 'undefined' && window.location) {
        const nextHash = normalizeHash(target)
        if (window.location.hash !== nextHash) {
          try {
            window.history?.replaceState?.(null, '', nextHash)
          } catch {
            window.location.hash = nextHash
          }
        }
        // Force a hashchange event to trigger App re-render
        window.dispatchEvent(new HashChangeEvent('hashchange'))
      }
    },
    [setRoute, setActiveTab]
  )
}
