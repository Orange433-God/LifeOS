import type { Request, Response } from 'express'
import { prisma } from '../lib/prisma.js'
import { ok } from '../lib/response.js'

/** GET /api/search/global?q= — 全局搜索（资源/记录/目标 分组） */
export const globalSearch = async (req: Request, res: Response) => {
  const userId = req.userId!
  const q = ((req.query.q as string | undefined) ?? '').trim()
  if (!q) return ok(res, { resources: [], records: [], goals: [] })

  const [resources, records, goals] = await Promise.all([
    prisma.resource.findMany({
      where: { userId, OR: [{ name: { contains: q } }, { description: { contains: q } }] },
      orderBy: { uploadedAt: 'desc' },
      take: 5,
      select: { id: true, name: true, type: true, category: true },
    }),
    prisma.lifeRecord.findMany({
      where: { userId, OR: [{ title: { contains: q } }, { rawContent: { contains: q } }] },
      orderBy: { recordedAt: 'desc' },
      take: 5,
      select: { id: true, title: true, type: true, recordedAt: true },
    }),
    prisma.goal.findMany({
      where: { userId, title: { contains: q } },
      orderBy: { createdAt: 'desc' },
      take: 5,
      select: { id: true, title: true, progress: true, status: true },
    }),
  ])

  return ok(res, { resources, records, goals })
}

/** GET /api/search/users?q= — 按昵称搜索用户（仅返回 allowSearch 未关闭的用户） */
export const searchUsers = async (req: Request, res: Response) => {
  const userId = req.userId!
  const q = ((req.query.q as string | undefined) ?? '').trim()
  if (!q) return ok(res, [])

  const profiles = await prisma.userProfile.findMany({
    where: { nickname: { contains: q }, userId: { not: userId } },
    take: 10,
    select: { userId: true, nickname: true, avatarStyle: true, lifeStage: true },
  })

  // 过滤关闭搜索的用户（无隐私记录视为允许）
  const privacies = await prisma.userPrivacy.findMany({
    where: { userId: { in: profiles.map((p) => p.userId) }, allowSearch: false },
    select: { userId: true },
  })
  const hidden = new Set(privacies.map((p) => p.userId))

  return ok(
    res,
    profiles
      .filter((p) => !hidden.has(p.userId))
      .map((p) => ({ id: p.userId, nickname: p.nickname, avatarStyle: p.avatarStyle, lifeStage: p.lifeStage })),
  )
}
