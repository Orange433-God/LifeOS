import { Component, type ErrorInfo, type ReactNode } from 'react'

interface ErrorBoundaryProps {
  children: ReactNode
}

interface ErrorBoundaryState {
  hasError: boolean
}

/** 全局错误边界：捕获未处理的渲染错误 */
export class ErrorBoundary extends Component<ErrorBoundaryProps, ErrorBoundaryState> {
  state: ErrorBoundaryState = { hasError: false }

  static getDerivedStateFromError(): ErrorBoundaryState {
    return { hasError: true }
  }

  componentDidCatch(error: Error, info: ErrorInfo): void {
    console.error('[LifeOS] 渲染错误:', error, info.componentStack)
  }

  render(): ReactNode {
    if (this.state.hasError) {
      return (
        <div className="night-background flex min-h-screen flex-col items-center justify-center gap-4 px-6 text-center">
          <span className="text-4xl">💫</span>
          <h1 className="text-xl font-semibold text-white">页面遇到了一点小问题</h1>
          <p className="text-sm text-slate-400">别担心，你的数据是安全的</p>
          <button
            type="button"
            onClick={() => window.location.reload()}
            className="btn-gradient mt-2"
          >
            刷新页面
          </button>
        </div>
      )
    }
    return this.props.children
  }
}
