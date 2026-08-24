import type { NextFunction, Request, Response } from 'express'
import { validationResult } from 'express-validator'
import { fail } from '../lib/response.js'

/** 校验中间件：收集 express-validator 结果，返回第一条错误信息 */
export const validate = (req: Request, res: Response, next: NextFunction): void => {
  const errors = validationResult(req)
  if (!errors.isEmpty()) {
    const first = errors.array()[0]
    if (first) {
      fail(res, 400, first.msg)
      return
    }
  }
  next()
}
