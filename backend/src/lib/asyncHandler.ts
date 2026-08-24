import type { NextFunction, Request, RequestHandler, Response } from 'express'

/** 包装 async 路由处理函数，把 Promise 异常交给统一错误中间件 */
export const asyncHandler =
  (fn: (req: Request, res: Response, next: NextFunction) => Promise<unknown>): RequestHandler =>
  (req, res, next) => {
    void Promise.resolve(fn(req, res, next)).catch(next)
  }
