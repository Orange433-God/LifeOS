import { api } from '../lib/api'
import type { ApiResponse, GrowthEvent, GrowthPeriod, GrowthSummary, GrowthTrends } from '../lib/types'

// ===== 成长分析 API（token 由 axios 拦截器自动携带）=====

/** 人生轨迹事件（记录/完成目标/首次测评 三源合并） */
export const getTimeline = async (limit = 20): Promise<GrowthEvent[]> => {
  const { data } = await api.get<ApiResponse<{ events: GrowthEvent[] }>>('/growth/timeline', {
    params: { limit },
  })
  if (!data.success || !data.data) throw new Error(data.message ?? '获取轨迹失败')
  return data.data.events
}

/** 属性趋势（按周期聚合；数据点不足时返回空数组） */
export const getTrends = async (period: GrowthPeriod): Promise<GrowthTrends> => {
  const { data } = await api.get<ApiResponse<GrowthTrends>>('/growth/trends', {
    params: { period },
  })
  if (!data.success || !data.data) throw new Error(data.message ?? '获取趋势失败')
  return data.data
}

/** AI 人生阶段总结 */
export const getSummary = async (period: GrowthPeriod): Promise<GrowthSummary> => {
  const { data } = await api.get<ApiResponse<GrowthSummary>>('/growth/summary', {
    params: { period },
  })
  if (!data.success || !data.data) throw new Error(data.message ?? '获取总结失败')
  return data.data
}
