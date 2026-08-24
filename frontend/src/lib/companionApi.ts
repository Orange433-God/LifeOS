import { ensureFreshAccessToken, getAccessToken } from './api'
import type { ApiResponse } from './types'

// ===== AI 伙伴对话流式接口（fetch + ReadableStream，不经 axios 拦截器）=====

export interface CompanionChatDone {
  reply: string
  memoryUpdate?: { mood?: string; keyPoint?: string }
  suggestedAction?: string
}

interface StreamCallbacks {
  /** 打字机分块 */
  onDelta: (content: string) => void
  /** 完整结果（统一格式 data 部分） */
  onDone: (data: CompanionChatDone) => void
  onError: (message: string) => void
}

const postChat = (token: string, message: string) =>
  fetch('/api/companion/chat', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
    body: JSON.stringify({ message }),
  })

/** SSE 事件协议与后端一致：delta / done / error */
interface SseEvent {
  type: 'delta' | 'done' | 'error'
  content?: string
  payload?: { success?: boolean; data?: CompanionChatDone; message?: string }
}

/**
 * 调用 Node 后端 /api/companion/chat（SSE 透传 Python 微服务），逐事件回调。
 * 401 时复用 axios 的刷新逻辑换新 token 后重试一次。
 */
export const streamCompanionChat = async (message: string, callbacks: StreamCallbacks): Promise<void> => {
  let token = getAccessToken()
  let response = await postChat(token ?? '', message)

  if (response.status === 401) {
    const fresh = await ensureFreshAccessToken()
    if (fresh) {
      token = fresh
      response = await postChat(token, message)
    } else {
      window.dispatchEvent(new Event('lifeos:auth-expired'))
      callbacks.onError('登录已过期，请重新登录')
      return
    }
  }

  if (!response.ok) {
    let messageText = '请求失败，请稍后重试'
    try {
      const body = (await response.json()) as ApiResponse
      messageText = body.message ?? messageText
    } catch {
      // 非 JSON 错误体，使用默认文案
    }
    callbacks.onError(messageText)
    return
  }

  if (!response.body) {
    callbacks.onError('响应无内容')
    return
  }

  // 逐块读取并按 \n\n 切分 SSE 事件
  const reader = response.body.getReader()
  const decoder = new TextDecoder()
  let buffer = ''

  try {
    while (true) {
      const { done, value } = await reader.read()
      if (done) break
      buffer += decoder.decode(value, { stream: true })

      let boundary: number
      while ((boundary = buffer.indexOf('\n\n')) !== -1) {
        const rawEvent = buffer.slice(0, boundary)
        buffer = buffer.slice(boundary + 2)

        const dataLine = rawEvent.split('\n').find((line) => line.startsWith('data:'))
        if (!dataLine) continue
        try {
          const event = JSON.parse(dataLine.slice(6).trim()) as SseEvent
          if (event.type === 'delta' && event.content) {
            callbacks.onDelta(event.content)
          } else if (event.type === 'done') {
            callbacks.onDone(event.payload?.data ?? { reply: '' })
          } else if (event.type === 'error') {
            callbacks.onError(event.payload?.message ?? 'AI 服务异常')
          }
        } catch {
          // 忽略无法解析的事件行
        }
      }
    }
  } finally {
    reader.releaseLock()
  }
}
