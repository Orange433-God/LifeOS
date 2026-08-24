import { api } from '../lib/api'
import type { ApiResponse, LifeRecord, QuickRecordResult } from '../lib/types'

// ===== 人生记录 API（token 由 axios 拦截器自动携带）=====

/** 一句话快速记录：AI 自动分类/打标签/提取情绪 */
export const quickRecord = async (content: string, recordedAt?: string): Promise<QuickRecordResult> => {
  const { data } = await api.post<ApiResponse<QuickRecordResult>>('/records/quick', {
    content,
    ...(recordedAt ? { recordedAt } : {}),
  })
  if (!data.success || !data.data) throw new Error(data.message ?? '记录失败')
  return data.data
}

/** 记录列表（可选时间范围，按 recordedAt 降序） */
export const getRecords = async (params?: {
  startDate?: string
  endDate?: string
  limit?: number
}): Promise<LifeRecord[]> => {
  const { data } = await api.get<ApiResponse<LifeRecord[]>>('/records', { params })
  if (!data.success) throw new Error(data.message ?? '获取记录失败')
  return data.data ?? []
}

/** 单条记录详情 */
export const getRecordById = async (id: string): Promise<LifeRecord> => {
  const { data } = await api.get<ApiResponse<LifeRecord>>(`/records/${id}`)
  if (!data.success || !data.data) throw new Error(data.message ?? '获取记录失败')
  return data.data
}

/** 最近 N 条记录（按 recordedAt 降序） */
export const getRecentRecords = async (limit = 10): Promise<LifeRecord[]> => {
  const { data } = await api.get<ApiResponse<LifeRecord[]>>('/records/recent', {
    params: { limit },
  })
  if (!data.success) throw new Error(data.message ?? '获取记录失败')
  return data.data ?? []
}

/** 删除一条记录 */
export const deleteRecord = async (id: string): Promise<void> => {
  const { data } = await api.delete<ApiResponse>(`/records/${id}`)
  if (!data.success) throw new Error(data.message ?? '删除失败')
}
