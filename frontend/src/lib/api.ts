import axios, { AxiosError, type InternalAxiosRequestConfig } from 'axios'
import type { ApiResponse, AuthTokens } from './types'
import { IS_DEMO } from './demoMode'
import { demoAdapter } from './demoAdapter'

const ACCESS_TOKEN_KEY = 'lifeos.accessToken'
const REFRESH_TOKEN_KEY = 'lifeos.refreshToken'

export const getAccessToken = (): string | null => localStorage.getItem(ACCESS_TOKEN_KEY)
export const getRefreshToken = (): string | null => localStorage.getItem(REFRESH_TOKEN_KEY)

export const setTokens = (tokens: AuthTokens): void => {
  localStorage.setItem(ACCESS_TOKEN_KEY, tokens.accessToken)
  localStorage.setItem(REFRESH_TOKEN_KEY, tokens.refreshToken)
}

export const clearTokens = (): void => {
  localStorage.removeItem(ACCESS_TOKEN_KEY)
  localStorage.removeItem(REFRESH_TOKEN_KEY)
}

/** axios 实例：请求自动携带 access token；401 自动刷新一次并重放 */
export const api = axios.create({
  baseURL: '/api',
  timeout: 15000,
  ...(IS_DEMO ? { adapter: demoAdapter } : {}),
})

api.interceptors.request.use((config) => {
  const token = getAccessToken()
  if (token) config.headers.Authorization = `Bearer ${token}`
  return config
})

/** 并发 401 时共享同一次刷新请求，避免刷新风暴 */
let refreshPromise: Promise<string | null> | null = null

const refreshAccessToken = async (): Promise<string | null> => {
  const refreshToken = getRefreshToken()
  if (!refreshToken) return null
  try {
    // 直接用裸 axios，避免进入本拦截器造成递归
    const { data } = await axios.post<ApiResponse<AuthTokens>>('/api/auth/refresh', { refreshToken })
    if (!data.success || !data.data) return null
    setTokens(data.data)
    return data.data.accessToken
  } catch {
    clearTokens()
    return null
  }
}

/** 供 fetch 类流式请求复用：确保拿到新鲜 access token（并发共享同一次刷新） */
export const ensureFreshAccessToken = (): Promise<string | null> => {
  refreshPromise ??= refreshAccessToken().finally(() => {
    refreshPromise = null
  })
  return refreshPromise
}

type RetriableConfig = InternalAxiosRequestConfig & { _retried?: boolean }

api.interceptors.response.use(
  (response) => response,
  async (error: AxiosError) => {
    const config = error.config as RetriableConfig | undefined
    // 登录/注册/刷新接口本身的 401 属于业务失败（密码错误等），不触发刷新
    const isCredentialRoute =
      config?.url?.includes('/auth/login') ||
      config?.url?.includes('/auth/register') ||
      config?.url?.includes('/auth/refresh')

    if (error.response?.status === 401 && config && !config._retried && !isCredentialRoute) {
      config._retried = true
      refreshPromise ??= refreshAccessToken().finally(() => {
        refreshPromise = null
      })
      const newToken = await refreshPromise
      if (newToken) {
        config.headers.Authorization = `Bearer ${newToken}`
        return api(config)
      }
      // 刷新失败：广播事件，由 AuthProvider 清空登录态并跳转登录页
      window.dispatchEvent(new Event('lifeos:auth-expired'))
    }
    return Promise.reject(error)
  },
)

/** 从异常中提取后端返回的 message（统一响应格式） */
export const getErrorMessage = (err: unknown, fallback = '请求失败，请稍后重试'): string => {
  if (axios.isAxiosError(err)) {
    const message = (err.response?.data as ApiResponse | undefined)?.message
    if (message) return message
  }
  return err instanceof Error && err.message ? err.message : fallback
}
