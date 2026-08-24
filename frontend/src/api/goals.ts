import { api } from '../lib/api'
import type {
  ApiResponse,
  BreakdownResult,
  CreateGoalInput,
  Goal,
  GoalStatus,
  ActionMutationResult,
} from '../lib/types'

// ===== 目标与行动 API（token 由 axios 拦截器自动携带）=====

export const createGoal = async (data: CreateGoalInput): Promise<Goal> => {
  const { data: res } = await api.post<ApiResponse<Goal>>('/goals', data)
  if (!res.success || !res.data) throw new Error(res.message ?? '创建目标失败')
  return res.data
}

/** status 为空时后端默认返回未完成（active + paused）；'all' 返回全部状态 */
export const getGoals = async (status?: GoalStatus | 'all' | ''): Promise<Goal[]> => {
  const { data } = await api.get<ApiResponse<Goal[]>>('/goals', {
    params: status ? { status } : {},
  })
  if (!data.success) throw new Error(data.message ?? '获取目标失败')
  return data.data ?? []
}

export const getGoalById = async (id: string): Promise<Goal> => {
  const { data } = await api.get<ApiResponse<Goal>>(`/goals/${id}`)
  if (!data.success || !data.data) throw new Error(data.message ?? '获取目标失败')
  return data.data
}

export const updateGoal = async (id: string, data: Partial<CreateGoalInput> & { status?: GoalStatus }): Promise<Goal> => {
  const { data: res } = await api.put<ApiResponse<Goal>>(`/goals/${id}`, data)
  if (!res.success || !res.data) throw new Error(res.message ?? '更新目标失败')
  return res.data
}

export const deleteGoal = async (id: string): Promise<void> => {
  const { data } = await api.delete<ApiResponse>(`/goals/${id}`)
  if (!data.success) throw new Error(data.message ?? '删除目标失败')
}

export const createAction = async (goalId: string, content: string, dueDate?: string): Promise<ActionMutationResult> => {
  const { data } = await api.post<ApiResponse<ActionMutationResult>>(`/goals/${goalId}/actions`, {
    content,
    ...(dueDate ? { dueDate } : {}),
  })
  if (!data.success || !data.data) throw new Error(data.message ?? '添加行动失败')
  return data.data
}

export const toggleAction = async (id: string): Promise<ActionMutationResult> => {
  const { data } = await api.put<ApiResponse<ActionMutationResult>>(`/actions/${id}/toggle`)
  if (!data.success || !data.data) throw new Error(data.message ?? '操作失败')
  return data.data
}

export const deleteAction = async (id: string): Promise<ActionMutationResult> => {
  const { data } = await api.delete<ApiResponse<ActionMutationResult>>(`/actions/${id}`)
  if (!data.success || !data.data) throw new Error(data.message ?? '删除行动失败')
  return data.data
}

export const breakdownGoal = async (goalTitle: string, goalDescription?: string, category?: string): Promise<BreakdownResult> => {
  const { data } = await api.post<ApiResponse<BreakdownResult>>('/goals/breakdown', {
    goalTitle,
    ...(goalDescription ? { goalDescription } : {}),
    ...(category ? { category } : {}),
  })
  if (!data.success || !data.data) throw new Error(data.message ?? 'AI 拆解失败')
  return data.data
}
