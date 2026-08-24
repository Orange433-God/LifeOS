import type { Request, Response } from 'express'
import { Prisma } from '@prisma/client'
import { prisma } from '../lib/prisma.js'
import { ok, fail } from '../lib/response.js'

/** POST /api/room/entered — 标记用户已进入过房间（写入 Room.customConfig.hasEntered） */
export const setRoomEntered = async (req: Request, res: Response) => {
  const userId = req.userId!

  const room = await prisma.room.findUnique({ where: { userId } })
  if (!room) return fail(res, 404, '房间不存在，请先创建资料')

  const customConfig = (room.customConfig ?? {}) as Record<string, unknown>
  if (!customConfig.hasEntered) {
    await prisma.room.update({
      where: { userId },
      data: { customConfig: { ...customConfig, hasEntered: true } as Prisma.InputJsonObject },
    })
  }

  return ok(res, null, '已标记进入房间')
}
