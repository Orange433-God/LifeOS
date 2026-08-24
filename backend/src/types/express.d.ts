declare global {
  namespace Express {
    interface Request {
      /** 由 requireAuth 中间件注入的当前用户 ID */
      userId?: string
    }
  }
}

export {}
