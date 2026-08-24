import type { Response } from 'express'
import { env } from '../config/env.js'

export interface CompanionChatPayload {
  userId: string
  message: string
  context: {
    nickname: string
    attributes: Record<string, number>
    recentRecords: string[]
  }
}

const AI_SERVICE_URL = env.aiServiceUrl.replace(/\/+$/, '')

/** 向客户端写入一个 SSE 事件（data: {...}\n\n） */
const emitEvent = (res: Response, event: unknown): boolean => {
  if (res.writableEnded) return false
  return res.write(`data: ${JSON.stringify(event)}\n\n`)
}

const errorEvent = (message: string) => ({
  type: 'error',
  payload: { success: false, data: null, message },
})

/**
 * 调用 Python AI 微服务（POST /api/ai/chat），并把其 SSE 事件原样转发给前端。
 * 事件协议与微服务一致：delta（打字机分块）/ done（完整结果）/ error（统一错误格式）。
 */
export const streamCompanionChat = async (res: Response, payload: CompanionChatPayload): Promise<void> => {
  res.setHeader('Content-Type', 'text/event-stream; charset=utf-8')
  res.setHeader('Cache-Control', 'no-cache')
  res.setHeader('Connection', 'keep-alive')
  res.setHeader('X-Accel-Buffering', 'no')
  res.flushHeaders()

  // 1. 连接 AI 微服务
  let upstream: globalThis.Response
  try {
    upstream = await fetch(`${AI_SERVICE_URL}/api/ai/chat`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    })
  } catch {
    // 微服务未启动 / 连接失败
    emitEvent(res, errorEvent('AI 伙伴服务暂不可用，请稍后再试'))
    res.end()
    return
  }

  if (!upstream.ok || !upstream.body) {
    emitEvent(res, errorEvent('AI 伙伴服务返回异常'))
    res.end()
    return
  }

  // 2. 逐块转发上游 SSE
  const reader = upstream.body.getReader()
  let clientClosed = false
  res.on('close', () => {
    clientClosed = true
    void reader.cancel().catch(() => undefined)
  })

  try {
    while (true) {
      const { done, value } = await reader.read()
      if (done || clientClosed) break
      if (res.writableEnded) break
      res.write(Buffer.from(value))
    }
    if (!res.writableEnded) res.end()
  } catch {
    emitEvent(res, errorEvent('AI 回复流中断，请重试'))
    if (!res.writableEnded) res.end()
  }
}
