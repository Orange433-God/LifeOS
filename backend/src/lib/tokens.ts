import { prisma } from './prisma.js'
import { refreshTokenLifetimeMs, signAccessToken, signRefreshToken } from './jwt.js'

export interface TokenPair {
  accessToken: string
  refreshToken: string
}

/** 为用户签发一对 token，并把 refresh token 落库到 Session 表 */
export const issueTokens = async (userId: string): Promise<TokenPair> => {
  const refreshToken = signRefreshToken(userId)
  await prisma.session.create({
    data: {
      userId,
      refreshToken,
      expiresAt: new Date(Date.now() + refreshTokenLifetimeMs),
    },
  })
  return { accessToken: signAccessToken(userId), refreshToken }
}
