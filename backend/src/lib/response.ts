import type { Response } from 'express'

/** 统一成功响应：{ success: true, data?, message? } */
export const ok = <T>(res: Response, data?: T, message?: string, status = 200): Response =>
  res.status(status).json({
    success: true,
    ...(data !== undefined ? { data } : {}),
    ...(message !== undefined ? { message } : {}),
  })

/** 统一失败响应：{ success: false, message } */
export const fail = (res: Response, status: number, message: string): Response =>
  res.status(status).json({ success: false, message })
