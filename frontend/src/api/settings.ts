import { api, clearTokens } from '../lib/api'
import type { ApiResponse, MergedSettings, UserSettingsData } from '../lib/types'

// ===== 设置中心 API（token 由 axios 拦截器自动携带）=====

/** 上传自定义头像图片（multipart） */
export const uploadAvatar = async (file: File): Promise<{ avatarUrl: string }> => {
  const form = new FormData()
  form.append('avatar', file)
  const { data } = await api.post<ApiResponse<{ avatarUrl: string }>>('/profile/avatar/upload', form)
  if (!data.success || !data.data) throw new Error(data.message ?? '上传失败')
  return data.data
}

/** 恢复默认头像（清空自定义头像） */
export const resetAvatar = async (): Promise<void> => {
  const { data } = await api.delete<ApiResponse>('/profile/avatar')
  if (!data.success) throw new Error(data.message ?? '操作失败')
}

export const getSettings = async (): Promise<MergedSettings> => {
  const { data } = await api.get<ApiResponse<MergedSettings>>('/settings')
  if (!data.success || !data.data) throw new Error(data.message ?? '获取设置失败')
  return data.data
}

export const updateProfile = async (payload: {
  nickname?: string
  avatarStyle?: string
  birthdate?: string | null
  gender?: string | null
  bio?: string | null
}): Promise<void> => {
  const { data } = await api.put<ApiResponse>('/settings/profile', payload)
  if (!data.success) throw new Error(data.message ?? '保存失败')
}

export const updateNotification = async (payload: Partial<UserSettingsData>): Promise<void> => {
  const { data } = await api.put<ApiResponse>('/settings/notification', payload)
  if (!data.success) throw new Error(data.message ?? '保存失败')
}

export const updateAppearance = async (payload: Partial<UserSettingsData>): Promise<void> => {
  const { data } = await api.put<ApiResponse>('/settings/appearance', payload)
  if (!data.success) throw new Error(data.message ?? '保存失败')
}

export const updateGeneral = async (payload: Partial<UserSettingsData>): Promise<void> => {
  const { data } = await api.put<ApiResponse>('/settings/general', payload)
  if (!data.success) throw new Error(data.message ?? '保存失败')
}

export const resetSettings = async (): Promise<void> => {
  const { data } = await api.post<ApiResponse>('/settings/reset')
  if (!data.success) throw new Error(data.message ?? '重置失败')
}

/** 导出全部个人数据并触发浏览器下载 */
export const exportData = async (): Promise<void> => {
  const { data } = await api.get<ApiResponse<Record<string, unknown>>>('/settings/export')
  if (!data.success || !data.data) throw new Error(data.message ?? '导出失败')
  const blob = new Blob([JSON.stringify(data.data, null, 2)], { type: 'application/json' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = `lifeos-export-${new Date().toISOString().slice(0, 10)}.json`
  a.click()
  URL.revokeObjectURL(url)
}

export const clearData = async (scope: 'records' | 'goals' | 'all'): Promise<void> => {
  const { data } = await api.post<ApiResponse>('/settings/clear', { scope })
  if (!data.success) throw new Error(data.message ?? '清除失败')
}

/** 注销账户（需邮箱确认；成功后清空本地登录态） */
export const deleteAccount = async (confirm: string): Promise<void> => {
  const { data } = await api.delete<ApiResponse>('/settings/account', { data: { confirm } })
  if (!data.success) throw new Error(data.message ?? '注销失败')
  clearTokens()
}
