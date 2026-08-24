import type { NextFunction, Request, Response } from 'express'
import { Prisma } from '@prisma/client'

/** 404：未匹配到任何路由 */
export const notFound = (req: Request, res: Response): void => {
  res.status(404).json({ success: false, message: `接口不存在：${req.method} ${req.path}` })
}

/** 统一错误处理：保证所有错误都以 { success: false, message } 返回 */
export const errorHandler = (err: unknown, req: Request, res: Response, _next: NextFunction): void => {
  // JSON 解析失败
  if (err instanceof SyntaxError && 'body' in err) {
    res.status(400).json({ success: false, message: '请求体不是合法的 JSON' })
    return
  }

  // Prisma 已知错误
  if (err instanceof Prisma.PrismaClientKnownRequestError) {
    if (err.code === 'P2002') {
      res.status(409).json({ success: false, message: '数据冲突：记录已存在' })
      return
    }
    if (err.code === 'P2025') {
      res.status(404).json({ success: false, message: '记录不存在' })
      return
    }
  }

  console.error('[LifeOS] 未处理异常:', err)
  res.status(500).json({ success: false, message: '服务器内部错误' })
}
