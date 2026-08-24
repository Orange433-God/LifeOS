import type { ReactNode } from 'react'
import { Navigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'

/** 加载中：登录态恢复期间的转场 */
export function LoadingScreen() {
  return (
    <div className="app-background flex min-h-screen items-center justify-center">
      <div className="h-10 w-10 animate-spin rounded-full border-4 border-mist-200 border-t-mist-500" />
    </div>
  )
}

/** 仅需登录（不要求资料），用于 /profile-setup */
export function RequireAuth({ children }: { children: ReactNode }) {
  const { state } = useAuth()
  if (state.status === 'loading') return <LoadingScreen />
  if (state.status === 'guest') return <Navigate to="/login" replace />
  return <>{children}</>
}

/** 登录 + 已创建资料，用于首页 / */
export function RequireProfile({ children }: { children: ReactNode }) {
  const { state } = useAuth()
  if (state.status === 'loading') return <LoadingScreen />
  if (state.status === 'guest') return <Navigate to="/login" replace />
  // 登录后未完成资料 → 强制进入资料页
  if (state.profile === null) return <Navigate to="/profile-setup" replace />
  return <>{children}</>
}

/** 登录 + 未创建资料，用于 /profile-setup（已完成资料则直接回首页） */
export function RequireNoProfile({ children }: { children: ReactNode }) {
  const { state } = useAuth()
  if (state.status === 'loading') return <LoadingScreen />
  if (state.status === 'guest') return <Navigate to="/login" replace />
  if (state.profile !== null) return <Navigate to="/" replace />
  return <>{children}</>
}

/** 仅未登录用户可见，用于 /login、/register */
export function GuestOnly({ children }: { children: ReactNode }) {
  const { state } = useAuth()
  if (state.status === 'loading') return <LoadingScreen />
  if (state.status === 'authed') {
    return <Navigate to={state.profile ? '/' : '/profile-setup'} replace />
  }
  return <>{children}</>
}
