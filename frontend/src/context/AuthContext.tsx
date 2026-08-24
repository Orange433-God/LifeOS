import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useState,
  type ReactNode,
} from 'react'
import { api, clearTokens, getAccessToken, getRefreshToken, setTokens } from '../lib/api'
import type { ApiResponse, AuthTokens, CreateProfileInput, ProfileBundle } from '../lib/types'

export type AuthState =
  | { status: 'loading' }
  | { status: 'guest' }
  /** profile 为 null 表示已登录但尚未创建资料 */
  | { status: 'authed'; profile: ProfileBundle | null }

interface AuthContextValue {
  state: AuthState
  register: (email: string, password: string) => Promise<void>
  login: (email: string, password: string) => Promise<void>
  logout: () => Promise<void>
  completeProfile: (input: CreateProfileInput) => Promise<void>
}

const AuthContext = createContext<AuthContextValue | null>(null)

const AUTH_EXPIRED_EVENT = 'lifeos:auth-expired'

export function AuthProvider({ children }: { children: ReactNode }) {
  const [state, setState] = useState<AuthState>({ status: 'loading' })

  const loadProfile = useCallback(async (): Promise<ProfileBundle | null> => {
    const { data } = await api.get<ApiResponse<ProfileBundle | null>>('/profile')
    if (!data.success) throw new Error(data.message ?? '获取资料失败')
    return data.data ?? null
  }, [])

  // 首次挂载：本地有 token 则拉取资料恢复登录态
  useEffect(() => {
    const init = async () => {
      if (!getAccessToken()) {
        setState({ status: 'guest' })
        return
      }
      try {
        const profile = await loadProfile()
        setState({ status: 'authed', profile })
      } catch {
        // 拦截器已尝试刷新，仍失败则视为未登录
        setState({ status: 'guest' })
      }
    }
    void init()

    const onExpired = () => {
      clearTokens()
      setState({ status: 'guest' })
    }
    window.addEventListener(AUTH_EXPIRED_EVENT, onExpired)
    return () => window.removeEventListener(AUTH_EXPIRED_EVENT, onExpired)
  }, [loadProfile])

  const applyTokensAndProfile = useCallback(
    async (tokens: AuthTokens) => {
      setTokens(tokens)
      const profile = await loadProfile()
      setState({ status: 'authed', profile })
    },
    [loadProfile],
  )

  const register = useCallback(
    async (email: string, password: string) => {
      const { data } = await api.post<ApiResponse<AuthTokens>>('/auth/register', { email, password })
      if (!data.success || !data.data) throw new Error(data.message ?? '注册失败')
      await applyTokensAndProfile(data.data)
    },
    [applyTokensAndProfile],
  )

  const login = useCallback(
    async (email: string, password: string) => {
      const { data } = await api.post<ApiResponse<AuthTokens>>('/auth/login', { email, password })
      if (!data.success || !data.data) throw new Error(data.message ?? '登录失败')
      await applyTokensAndProfile(data.data)
    },
    [applyTokensAndProfile],
  )

  const logout = useCallback(async () => {
    try {
      await api.post('/auth/logout', { refreshToken: getRefreshToken() })
    } catch {
      // 即使后端登出失败也清空本地登录态
    }
    clearTokens()
    setState({ status: 'guest' })
  }, [])

  const completeProfile = useCallback(async (input: CreateProfileInput) => {
    const { data } = await api.post<ApiResponse<ProfileBundle>>('/profile', input)
    if (!data.success || !data.data) throw new Error(data.message ?? '保存资料失败')
    setState({ status: 'authed', profile: data.data })
  }, [])

  return (
    <AuthContext.Provider value={{ state, register, login, logout, completeProfile }}>
      {children}
    </AuthContext.Provider>
  )
}

export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext)
  if (!ctx) throw new Error('useAuth 必须在 AuthProvider 内使用')
  return ctx
}
