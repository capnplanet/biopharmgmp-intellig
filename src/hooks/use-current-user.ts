import { useKV } from '@github/spark/hooks'

export type CurrentUser = {
  id: string
  role: string
  ipAddress?: string
  sessionId?: string
}

const defaultUser: CurrentUser = {
  id: 'jane.doe@biopharm.com',
  role: 'Quality Analyst',
  ipAddress: '10.0.0.23',
  sessionId: `sess-${Math.random().toString(36).slice(2, 10)}`
}

export function useCurrentUser() {
  const [user, setUser] = useKV<CurrentUser>('current-user', defaultUser)
  return { user: user || defaultUser, setUser }
}
