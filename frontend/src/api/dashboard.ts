import { api } from '../lib/api'
import type { ApiResponse, DashboardHistory, DashboardOverview } from '../lib/types'

// ===== 人生大盘 API（token 由 axios 拦截器自动携带）=====

/** 大盘全景：当前/初始属性 + 变化 + 近期记录 + 进行中目标 + AI 阶段总结 */
export const getOverview = async (): Promise<DashboardOverview> => {
  const { data } = await api.get<ApiResponse<DashboardOverview>>('/dashboard/overview')
  if (!data.success || !data.data) throw new Error(data.message ?? '获取大盘数据失败')
  return data.data
}

/** 最近 N 天属性快照（缺失日期已由后端前向填充） */
export const getHistory = async (days = 30): Promise<DashboardHistory> => {
  const { data } = await api.get<ApiResponse<DashboardHistory>>('/dashboard/history', {
    params: { days },
  })
  if (!data.success || !data.data) throw new Error(data.message ?? '获取趋势数据失败')
  return data.data
}
