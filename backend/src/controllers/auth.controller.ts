import type { Request, Response } from 'express'
import bcrypt from 'bcrypt'
import { prisma } from '../lib/prisma.js'
import { issueTokens } from '../lib/tokens.js'
import { ok, fail } from '../lib/response.js'
import {
  refreshTokenLifetimeMs,
  signAccessToken,
  signRefreshToken,
  verifyRefreshToken,
} from '../lib/jwt.js'

const SALT_ROUNDS = 10

const publicUser = (user: { id: string; email: string }) => ({ id: user.id, email: user.email })

/** POST /api/auth/register — 注册并自动登录（返回双 token） */
export const register = async (req: Request, res: Response) => {
  const { email, password } = req.body as { email: string; password: string }

  const existing = await prisma.user.findUnique({ where: { email } })
  if (existing) return fail(res, 409, '该邮箱已注册，请直接登录')

  const passwordHash = await bcrypt.hash(password, SALT_ROUNDS)
  const user = await prisma.user.create({ data: { email, passwordHash } })
  const tokens = await issueTokens(user.id)

  return ok(res, { user: publicUser(user), ...tokens }, '注册成功', 201)
}

/** POST /api/auth/login — 登录，返回双 token */
export const login = async (req: Request, res: Response) => {
  const { email, password } = req.body as { email: string; password: string }

  const user = await prisma.user.findUnique({ where: { email } })
  const valid = user !== null && (await bcrypt.compare(password, user.passwordHash))
  if (!valid) return fail(res, 401, '邮箱或密码错误')

  const tokens = await issueTokens(user.id)
  return ok(res, { user: publicUser(user), ...tokens }, '登录成功')
}

/** POST /api/auth/refresh — 校验 refresh token，轮换并返回新的双 token */
export const refresh = async (req: Request, res: Response) => {
  const { refreshToken } = req.body as { refreshToken: string }

  let payload
  try {
    payload = verifyRefreshToken(refreshToken)
  } catch {
    return fail(res, 401, '刷新凭证无效或已过期')
  }

  const session = await prisma.session.findUnique({ where: { refreshToken } })
  if (!session || session.userId !== payload.sub) return fail(res, 401, '刷新凭证无效或已过期')

  if (session.expiresAt.getTime() <= Date.now()) {
    await prisma.session.delete({ where: { id: session.id } }).catch(() => undefined)
    return fail(res, 401, '刷新凭证已过期，请重新登录')
  }

  // 轮换：旧 refresh token 立即失效，防止重放
  const nextRefreshToken = signRefreshToken(session.userId)
  await prisma.session.update({
    where: { id: session.id },
    data: {
      refreshToken: nextRefreshToken,
      expiresAt: new Date(Date.now() + refreshTokenLifetimeMs),
    },
  })

  return ok(res, { accessToken: signAccessToken(session.userId), refreshToken: nextRefreshToken })
}

/** POST /api/auth/logout — 删除会话（body 可携带 refreshToken，精确注销当前会话） */
export const logout = async (req: Request, res: Response) => {
  const userId = req.userId!
  const { refreshToken } = (req.body ?? {}) as { refreshToken?: string }

  if (refreshToken) {
    await prisma.session.deleteMany({ where: { userId, refreshToken } })
  } else {
    await prisma.session.deleteMany({ where: { userId } })
  }

  return ok(res, null, '已退出登录')
}
