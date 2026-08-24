import type { Request, Response } from 'express'
import { prisma } from '../lib/prisma.js'
import { ok, fail } from '../lib/response.js'
import { buildRoomLayout } from '../services/roomLayout.service.js'

/** 两人是否为好友（双向 accepted） */
const areFriends = (userId: string, otherId: string) =>
  prisma.friend.findFirst({
    where: {
      status: 'accepted',
      OR: [
        { userId, friendId: otherId },
        { userId: otherId, friendId: userId },
      ],
    },
  })

/**
 * GET /api/visit/room/:userId — 访问他人房间（只读）
 * 权限：allowRoomVisit 关闭等效 private；private 仅本人；
 * friends_only 仅好友；public 任何人。返回房间布局，不含私人记录/属性/目标。
 */
export const visitRoom = async (req: Request, res: Response) => {
  const userId = req.userId!
  const ownerId = req.params.userId as string

  const [ownerProfile, attributes, room, companion, privacy] = await Promise.all([
    prisma.userProfile.findUnique({ where: { userId: ownerId } }),
    prisma.lifeAttribute.findUnique({ where: { userId: ownerId } }),
    prisma.room.findUnique({ where: { userId: ownerId } }),
    prisma.companion.findUnique({ where: { userId: ownerId } }),
    prisma.userPrivacy.findUnique({ where: { userId: ownerId } }),
  ])
  if (!ownerProfile) return fail(res, 404, '用户不存在或尚未创建房间')

  if (userId !== ownerId) {
    const effectiveAccess =
      privacy && !privacy.allowRoomVisit ? 'private' : (privacy?.roomAccess ?? 'private')
    if (effectiveAccess === 'private') return fail(res, 403, '该用户暂未开放房间访问')
    if (effectiveAccess === 'friends_only') {
      const friendship = await areFriends(userId, ownerId)
      if (!friendship) return fail(res, 403, '该用户的房间仅好友可访问')
    }
  }

  return ok(res, {
    owner: {
      id: ownerId,
      nickname: ownerProfile.nickname,
      avatarStyle: ownerProfile.avatarStyle,
    },
    room: { theme: room?.theme ?? 'modern' },
    companion: {
      name: companion?.name ?? '小伴',
      personality: companion?.personality ?? '温暖',
      relationshipStage: companion?.relationshipStage ?? '初识',
    },
    roomLayout: buildRoomLayout(attributes, room?.theme ?? 'modern'),
  })
}

/** POST /api/visit/record — 记录一次房间访问（不计入本人访问自己） */
export const recordVisit = async (req: Request, res: Response) => {
  const userId = req.userId!
  const { ownerId, duration } = req.body as { ownerId: string; duration?: number }

  if (ownerId === userId) return ok(res, null, '本人访问不记录')

  const owner = await prisma.user.findUnique({ where: { id: ownerId } })
  if (!owner) return fail(res, 404, '用户不存在')

  const visit = await prisma.roomVisit.create({
    data: {
      visitorId: userId,
      ownerId,
      ...(typeof duration === 'number' && duration > 0 ? { duration } : {}),
    },
  })
  return ok(res, visit, '访问已记录', 201)
}

/** GET /api/visit/stats — 本周/本月谁访问了我的房间 */
export const visitStats = async (req: Request, res: Response) => {
  const userId = req.userId!

  const now = new Date()
  const weekStart = new Date(now)
  weekStart.setDate(now.getDate() - ((now.getDay() + 6) % 7))
  weekStart.setHours(0, 0, 0, 0)
  const monthStart = new Date(now.getFullYear(), now.getMonth(), 1)

  const visits = await prisma.roomVisit.findMany({
    where: { ownerId: userId, visitedAt: { gte: monthStart } },
    orderBy: { visitedAt: 'desc' },
  })

  const profiles = await prisma.userProfile.findMany({
    where: { userId: { in: [...new Set(visits.map((v) => v.visitorId))] } },
    select: { userId: true, nickname: true, avatarStyle: true },
  })
  const profileMap = new Map(profiles.map((p) => [p.userId, p]))

  const aggregate = (list: typeof visits) => {
    const byVisitor = new Map<string, number>()
    for (const v of list) byVisitor.set(v.visitorId, (byVisitor.get(v.visitorId) ?? 0) + 1)
    return [...byVisitor.entries()]
      .map(([visitorId, count]) => {
        const p = profileMap.get(visitorId)
        return p ? { userId: visitorId, nickname: p.nickname, avatarStyle: p.avatarStyle, count } : null
      })
      .filter((x): x is NonNullable<typeof x> => x !== null)
      .sort((a, b) => b.count - a.count)
  }

  return ok(res, {
    thisWeek: aggregate(visits.filter((v) => v.visitedAt >= weekStart)),
    thisMonth: aggregate(visits),
  })
}
