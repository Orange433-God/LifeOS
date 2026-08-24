import type { Request, Response } from 'express'
import { prisma } from '../lib/prisma.js'
import { ok } from '../lib/response.js'

export const DEFAULT_PRIVACY = {
  roomAccess: 'private',
  profileVisibility: 'friends_only',
  allowRoomVisit: false,
  showOnlineStatus: true,
  allowSearch: true,
} as const

/** GET /api/privacy — 隐私设置（不存在时按默认值懒创建） */
export const getPrivacy = async (req: Request, res: Response) => {
  const userId = req.userId!

  let privacy = await prisma.userPrivacy.findUnique({ where: { userId } })
  if (!privacy) {
    privacy = await prisma.userPrivacy.create({ data: { userId } })
  }
  return ok(res, privacy)
}

/** PUT /api/privacy — 更新隐私设置 */
export const updatePrivacy = async (req: Request, res: Response) => {
  const userId = req.userId!
  const { roomAccess, profileVisibility, allowRoomVisit, showOnlineStatus, allowSearch } = req.body as {
    roomAccess?: string
    profileVisibility?: string
    allowRoomVisit?: boolean
    showOnlineStatus?: boolean
    allowSearch?: boolean
  }

  const privacy = await prisma.userPrivacy.upsert({
    where: { userId },
    create: { userId, ...DEFAULT_PRIVACY, ...req.body },
    update: {
      ...(roomAccess !== undefined ? { roomAccess } : {}),
      ...(profileVisibility !== undefined ? { profileVisibility } : {}),
      ...(allowRoomVisit !== undefined ? { allowRoomVisit } : {}),
      ...(showOnlineStatus !== undefined ? { showOnlineStatus } : {}),
      ...(allowSearch !== undefined ? { allowSearch } : {}),
    },
  })

  return ok(res, privacy, '隐私设置已保存')
}
