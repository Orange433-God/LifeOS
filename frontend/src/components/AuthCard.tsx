import type { ReactNode } from 'react'
import { Logo } from './Logo'

interface AuthCardProps {
  title: string
  subtitle: string
  children: ReactNode
  footer?: ReactNode
}

/** 登录/注册页共用的毛玻璃卡片外壳 */
export function AuthCard({ title, subtitle, children, footer }: AuthCardProps) {
  return (
    <div className="app-background flex min-h-screen items-center justify-center px-4 py-10">
      <div className="glass-card w-full max-w-md p-8 shadow-glass-lg">
        <div className="flex flex-col items-center text-center">
          <Logo size="lg" />
          <h1 className="mt-5 text-2xl font-semibold text-warm-800">{title}</h1>
          <p className="mt-1.5 text-sm text-warm-500">{subtitle}</p>
        </div>
        <div className="mt-8">{children}</div>
        {footer && <div className="mt-6 text-center text-sm text-warm-500">{footer}</div>}
      </div>
    </div>
  )
}
