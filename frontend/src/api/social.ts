import { api } from '../lib/api'
import type {
  ApiResponse,
  FriendItem,
  PendingRequestItem,
  PrivacySettings,
  SearchUser,
  VisitRoomData,
  VisitStats,
} from '../lib/types'

// ===== 社交与好友 API（token 由 axios 拦截器自动携带）=====

export const sendFriendRequest = async (friendId: string): Promise<void> => {
  const { data } = await api.post<ApiResponse>('/friends/request', { friendId })
  if (!data.success) throw new Error(data.message ?? '发送请求失败')
}

export const handleFriendRequest = async (requestId: string, status: 'accepted' | 'rejected'): Promise<void> => {
  const { data } = await api.put<ApiResponse>(`/friends/request/${requestId}`, { status })
  if (!data.success) throw new Error(data.message ?? '操作失败')
}

export const getFriends = async (status = 'accepted'): Promise<FriendItem[]> => {
  const { data } = await api.get<ApiResponse<FriendItem[]>>('/friends', { params: { status } })
  if (!data.success) throw new Error(data.message ?? '获取好友失败')
  return data.data ?? []
}

export const getPendingRequests = async (): Promise<PendingRequestItem[]> => {
  const { data } = await api.get<ApiResponse<PendingRequestItem[]>>('/friends/pending')
  if (!data.success) throw new Error(data.message ?? '获取请求失败')
  return data.data ?? []
}

export const deleteFriend = async (friendshipId: string): Promise<void> => {
  const { data } = await api.delete<ApiResponse>(`/friends/${friendshipId}`)
  if (!data.success) throw new Error(data.message ?? '解除好友失败')
}

export const getPrivacy = async (): Promise<PrivacySettings> => {
  const { data } = await api.get<ApiResponse<PrivacySettings>>('/privacy')
  if (!data.success || !data.data) throw new Error(data.message ?? '获取隐私设置失败')
  return data.data
}

export const updatePrivacy = async (settings: Partial<PrivacySettings>): Promise<PrivacySettings> => {
  const { data } = await api.put<ApiResponse<PrivacySettings>>('/privacy', settings)
  if (!data.success || !data.data) throw new Error(data.message ?? '保存失败')
  return data.data
}

/** 访问他人房间（只读） */
export const visitRoom = async (userId: string): Promise<VisitRoomData> => {
  const { data } = await api.get<ApiResponse<VisitRoomData>>(`/visit/room/${userId}`)
  if (!data.success || !data.data) throw new Error(data.message ?? '无法访问该房间')
  return data.data
}

/** 记录一次房间访问（进入他人房间时静默调用） */
export const recordVisit = async (ownerId: string): Promise<void> => {
  try {
    await api.post('/visit/record', { ownerId })
  } catch {
    // 统计失败不影响访问体验
  }
}

export const searchUsers = async (keyword: string): Promise<SearchUser[]> => {
  const { data } = await api.get<ApiResponse<SearchUser[]>>('/search/users', { params: { q: keyword } })
  if (!data.success) throw new Error(data.message ?? '搜索失败')
  return data.data ?? []
}

export const getVisitStats = async (): Promise<VisitStats> => {
  const { data } = await api.get<ApiResponse<VisitStats>>('/visit/stats')
  if (!data.success || !data.data) throw new Error(data.message ?? '获取访问统计失败')
  return data.data
}
