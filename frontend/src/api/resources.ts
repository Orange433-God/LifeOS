import { api } from '../lib/api'
import type {
  ApiResponse,
  ResourceCategoryCount,
  ResourceItem,
  ResourceListResult,
  ResourceShare,
  ResourceStats,
  ResourceType,
  SharedResourceView,
  StorageUsage,
  TagCount,
} from '../lib/types'

// ===== 资源中心 API（token 由 axios 拦截器自动携带）=====

export const getResources = async (params?: {
  type?: ResourceType | ''
  category?: string
  keyword?: string
  sort?: 'latest' | 'popular' | 'trending'
  page?: number
  limit?: number
  /** '1' 时仅返回当前用户收藏的资源 */
  collected?: string
}): Promise<ResourceListResult> => {
  // 空筛选值不传参（后端校验器不接受空字符串 type=）
  const cleanParams = Object.fromEntries(
    Object.entries(params ?? {}).filter(([, v]) => v !== undefined && v !== ''),
  )
  const { data } = await api.get<ApiResponse<ResourceListResult>>('/resources', { params: cleanParams })
  if (!data.success || !data.data) throw new Error(data.message ?? '获取资源失败')
  return data.data
}

export const getResource = async (id: string): Promise<ResourceItem> => {
  const { data } = await api.get<ApiResponse<ResourceItem>>(`/resources/${id}`)
  if (!data.success || !data.data) throw new Error(data.message ?? '获取资源失败')
  return data.data
}

/** multipart 上传（含文件或链接） */
export const uploadResource = async (form: FormData): Promise<ResourceItem> => {
  const { data } = await api.post<ApiResponse<ResourceItem>>('/resources', form)
  if (!data.success || !data.data) throw new Error(data.message ?? '上传失败')
  return data.data
}

export const updateResource = async (id: string, payload: { name?: string; description?: string; tags?: string[]; isPublic?: boolean }): Promise<void> => {
  const { data } = await api.put<ApiResponse>(`/resources/${id}`, payload)
  if (!data.success) throw new Error(data.message ?? '更新失败')
}

export const deleteResource = async (id: string): Promise<void> => {
  const { data } = await api.delete<ApiResponse>(`/resources/${id}`)
  if (!data.success) throw new Error(data.message ?? '删除失败')
}

export const toggleCollect = async (id: string): Promise<boolean> => {
  const { data } = await api.post<ApiResponse<{ collected: boolean }>>(`/resources/${id}/collect`)
  if (!data.success || !data.data) throw new Error(data.message ?? '操作失败')
  return data.data.collected
}

/** 记录下载并返回下载地址 */
export const downloadResource = async (id: string): Promise<string> => {
  const { data } = await api.post<ApiResponse<{ downloadUrl: string | null }>>(`/resources/${id}/download`)
  if (!data.success || !data.data) throw new Error(data.message ?? '下载失败')
  if (!data.data.downloadUrl) throw new Error('该资源没有可下载的文件')
  return data.data.downloadUrl
}

export const getStats = async (): Promise<ResourceStats> => {
  const { data } = await api.get<ApiResponse<ResourceStats>>('/resources/stats')
  if (!data.success || !data.data) throw new Error(data.message ?? '获取统计失败')
  return data.data
}

export const getRecommended = async (): Promise<ResourceItem[]> => {
  const { data } = await api.get<ApiResponse<ResourceItem[]>>('/resources/recommended')
  if (!data.success) throw new Error(data.message ?? '获取推荐失败')
  return data.data ?? []
}

export const getCategories = async (): Promise<ResourceCategoryCount[]> => {
  const { data } = await api.get<ApiResponse<ResourceCategoryCount[]>>('/resources/categories')
  if (!data.success) throw new Error(data.message ?? '获取分类失败')
  return data.data ?? []
}

export const getStorageUsage = async (): Promise<StorageUsage> => {
  const { data } = await api.get<ApiResponse<StorageUsage>>('/storage/usage')
  if (!data.success || !data.data) throw new Error(data.message ?? '获取用量失败')
  return data.data
}

export const cleanupStorage = async (): Promise<{ removedCount: number; freedBytes: number }> => {
  const { data } = await api.delete<ApiResponse<{ removedCount: number; freedBytes: number }>>('/storage/cleanup')
  if (!data.success || !data.data) throw new Error(data.message ?? '清理失败')
  return data.data
}

// ===== 扩展：关联 / 分享 / 标签 / 批量 =====

export const getRelatedResources = async (targetType: 'goal' | 'record', targetId: string): Promise<ResourceItem[]> => {
  const { data } = await api.get<ApiResponse<ResourceItem[]>>('/resources/related', {
    params: { targetType, targetId },
  })
  if (!data.success) throw new Error(data.message ?? '获取关联资源失败')
  return data.data ?? []
}

export const linkResource = async (id: string, targetType: 'goal' | 'record', targetId: string): Promise<void> => {
  const { data } = await api.post<ApiResponse>(`/resources/${id}/link`, { targetType, targetId })
  if (!data.success) throw new Error(data.message ?? '关联失败')
}

export const unlinkResource = async (id: string, targetType: 'goal' | 'record', targetId: string): Promise<void> => {
  const { data } = await api.delete<ApiResponse>(`/resources/${id}/unlink`, { data: { targetType, targetId } })
  if (!data.success) throw new Error(data.message ?? '解除关联失败')
}

export const shareResource = async (id: string): Promise<ResourceShare> => {
  const { data } = await api.get<ApiResponse<ResourceShare>>(`/resources/${id}/share`)
  if (!data.success || !data.data) throw new Error(data.message ?? '生成分享链接失败')
  return data.data
}

/** 公开分享（无需登录） */
export const getSharedResource = async (token: string): Promise<SharedResourceView> => {
  const { data } = await api.get<ApiResponse<SharedResourceView>>(`/resources/shared/${token}`)
  if (!data.success || !data.data) throw new Error(data.message ?? '分享链接不存在或已过期')
  return data.data
}

export const getResourceTags = async (): Promise<TagCount[]> => {
  const { data } = await api.get<ApiResponse<TagCount[]>>('/resources/tags')
  if (!data.success) throw new Error(data.message ?? '获取标签失败')
  return data.data ?? []
}

export const batchDelete = async (resourceIds: string[]): Promise<number> => {
  const { data } = await api.post<ApiResponse<{ deleted: number }>>('/resources/batch/delete', { resourceIds })
  if (!data.success || !data.data) throw new Error(data.message ?? '批量删除失败')
  return data.data.deleted
}

export const batchMove = async (resourceIds: string[], targetCategory: string): Promise<number> => {
  const { data } = await api.post<ApiResponse<{ moved: number }>>('/resources/batch/move', { resourceIds, targetCategory })
  if (!data.success || !data.data) throw new Error(data.message ?? '批量移动失败')
  return data.data.moved
}
