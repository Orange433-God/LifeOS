import type { NextFunction, Request, Response } from 'express'
import { verifyAccessToken } from '../lib/jwt.js'
import { fail } from '../lib/response.js'

/** 认证中间件：校验 Authorization: Bearer <accessToken>，通过后注入 req.userId */
export const requireAuth = (req: Request, res: Response, next: NextFunction): void => {
  const header = req.headers.authorization
  if (!header?.startsWith('Bearer ')) {
    fail(res, 401, '未登录或凭证缺失')
    return
  }

  const token = header.slice('Bearer '.length)
  try {
    const payload = verifyAccessToken(token)
    if (payload.type !== 'access') {
      fail(res, 401, '无效的访问凭证')
      return
    }
    req.userId = payload.sub
    next()
  } catch {
    fail(res, 401, '登录已过期，请重新登录')
  }
}
