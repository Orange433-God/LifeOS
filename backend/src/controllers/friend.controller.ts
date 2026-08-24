import type { Request, Response } from 'express'
import { prisma } from '../lib/prisma.js'
import { ok, fail } from '../lib/response.js'

/** 取一组用户的基础资料（昵称/头像/阶段标签/隐私） */
const profilesOf = async (ids: string[]) => {
  if (ids.length === 0) return new Map<string, { id: string; nickname: string; avatarStyle: string; lifeStage: string | null; online: boolean }>()
  const [profiles, privacies] = await Promise.all([
    prisma.userProfile.findMany({ where: { userId: { in: ids } }, select: { userId: true, nickname: true, avatarStyle: true, lifeStage: true } }),
    prisma.userPrivacy.findMany({ where: { userId: { in: ids } }, select: { userId: true, showOnlineStatus: true } }),
  ])
  const privacyMap = new Map(privacies.map((p) => [p.userId, p.showOnlineStatus]))
  const map = new Map<string, { id: string; nickname: string; avatarStyle: string; lifeStage: string | null; online: boolean }>()
  for (const p of profiles) {
    // MVP 无实时在线通道：showOnlineStatus 关闭视为「隐身/离线」
    map.set(p.userId, {
      id: p.userId,
      nickname: p.nickname,
      avatarStyle: p.avatarStyle,
      lifeStage: p.lifeStage,
      online: privacyMap.get(p.userId) ?? true,
    })
  }
  return map
}

/** POST /api/friends/request — 发送好友请求（不能添加自己、不能重复） */
export const sendRequest = async (req: Request, res: Response) => {
  const userId = req.userId!
  const { friendId } = req.body as { friendId: string }

  if (friendId === userId) return fail(res, 400, '不能添加自己为好友')
  const target = await prisma.user.findUnique({ where: { id: friendId } })
  if (!target) return fail(res, 404, '用户不存在')

  const existing = await prisma.friend.findFirst({
    where: {
      OR: [
        { userId, friendId },
        { userId: friendId, friendId: userId },
      ],
    },
  })

  if (existing) {
    if (existing.status === 'accepted') return fail(res, 409, '你们已经是好友了')
    if (existing.status === 'pending') return fail(res, 409, '已存在待处理的好友请求')
    if (existing.status === 'blocked') return fail(res, 403, '无法添加该用户')
    // rejected：允许重新发起
    await prisma.friend.update({
      where: { id: existing.id },
      data: { userId, friendId, status: 'pending', updatedAt: new Date() },
    })
    return ok(res, null, '好友请求已重新发送')
  }

  const request = await prisma.friend.create({
    data: { userId, friendId, status: 'pending' },
  })
  return ok(res, request, '好友请求已发送', 201)
}

/** PUT /api/friends/request/:id — 处理好友请求（仅接收方可操作） */
export const handleRequest = async (req: Request, res: Response) => {
  const userId = req.userId!
  const id = req.params.id as string
  const { status } = req.body as { status: 'accepted' | 'rejected' }

  const request = await prisma.friend.findFirst({ where: { id, friendId: userId, status: 'pending' } })
  if (!request) return fail(res, 404, '好友请求不存在或已处理')

  const updated = await prisma.friend.update({ where: { id }, data: { status } })
  return ok(res, updated, status === 'accepted' ? '已成为好友' : '已拒绝请求')
}

/** GET /api/friends?status= — 好友列表（默认 accepted，含对方资料与在线状态） */
export const listFriends = async (req: Request, res: Response) => {
  const userId = req.userId!
  const status = (req.query.status as string | undefined) ?? 'accepted'

  const rows = await prisma.friend.findMany({
    where: {
      status,
      OR: [{ userId }, { friendId: userId }],
    },
    orderBy: { updatedAt: 'desc' },
  })

  const otherIds = rows.map((r) => (r.userId === userId ? r.friendId : r.userId))
  const profiles = await profilesOf(otherIds)

  const friends = rows
    .map((r) => {
      const otherId = r.userId === userId ? r.friendId : r.userId
      const user = profiles.get(otherId)
      if (!user) return null
      return { friendshipId: r.id, user, since: r.updatedAt }
    })
    .filter((f): f is NonNullable<typeof f> => f !== null)

  return ok(res, friends)
}

/** GET /api/friends/pending — 待处理的好友请求（接收方视角） */
export const pendingRequests = async (req: Request, res: Response) => {
  const userId = req.userId!

  const rows = await prisma.friend.findMany({
    where: { friendId: userId, status: 'pending' },
    orderBy: { createdAt: 'desc' },
  })
  const profiles = await profilesOf(rows.map((r) => r.userId))

  const requests = rows
    .map((r) => {
      const user = profiles.get(r.userId)
      if (!user) return null
      return { requestId: r.id, user, createdAt: r.createdAt }
    })
    .filter((x): x is NonNullable<typeof x> => x !== null)

  return ok(res, requests)
}

/** DELETE /api/friends/:id — 解除好友关系 */
export const removeFriend = async (req: Request, res: Response) => {
  const userId = req.userId!
  const id = req.params.id as string

  const result = await prisma.friend.deleteMany({
    where: {
      id,
      status: 'accepted',
      OR: [{ userId }, { friendId: userId }],
    },
  })
  if (result.count === 0) return fail(res, 404, '好友关系不存在')

  return ok(res, null, '已解除好友关系')
}
