import { randomUUID } from 'node:crypto'
import jwt from 'jsonwebtoken'
import { env } from '../config/env.js'

export interface AccessTokenPayload {
  sub: string
  type: 'access'
}

export interface RefreshTokenPayload {
  sub: string
  type: 'refresh'
  /** 每次签发唯一：iat/exp 以秒为单位，同一秒内签名结果相同，需 jti 保证轮换后 token 必然不同 */
  jti: string
}

export const signAccessToken = (userId: string): string =>
  jwt.sign({ sub: userId, type: 'access' } satisfies AccessTokenPayload, env.jwtSecret, {
    expiresIn: env.accessTokenTtl,
  })

export const signRefreshToken = (userId: string): string =>
  jwt.sign(
    { sub: userId, type: 'refresh', jti: randomUUID() } satisfies RefreshTokenPayload,
    env.refreshSecret,
    { expiresIn: `${env.refreshTokenTtlDays}d` },
  )

export const verifyAccessToken = (token: string): AccessTokenPayload =>
  jwt.verify(token, env.jwtSecret) as AccessTokenPayload

export const verifyRefreshToken = (token: string): RefreshTokenPayload =>
  jwt.verify(token, env.refreshSecret) as RefreshTokenPayload

/** refresh token 生命周期（毫秒），与 Session.expiresAt 对齐 */
export const refreshTokenLifetimeMs = env.refreshTokenTtlDays * 24 * 60 * 60 * 1000
