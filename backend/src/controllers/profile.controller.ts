import type { Request, Response } from 'express'
import { Prisma } from '@prisma/client'
import fs from 'node:fs'
import path from 'node:path'
import { prisma } from '../lib/prisma.js'
import { UPLOADS_DIR } from './resource.controller.js'
import { ok, fail } from '../lib/response.js'
import { buildRoomLayout } from '../services/roomLayout.service.js'

/** 联查用户资料四件套：profile / attributes / room / companion */
const fetchBundle = (userId: string) =>
  Promise.all([
    prisma.userProfile.findUnique({ where: { userId } }),
    prisma.lifeAttribute.findUnique({ where: { userId } }),
    prisma.room.findUnique({ where: { userId } }),
    prisma.companion.findUnique({ where: { userId } }),
  ]).then(([profile, attributes, room, companion]) => ({ profile, attributes, room, companion }))

/** GET /api/profile — 获取资料；未创建资料时 data 为 null。含实时计算的 roomLayout */
export const getProfile = async (req: Request, res: Response) => {
  const bundle = await fetchBundle(req.userId!)
  if (!bundle.profile) return ok(res, null, '尚未创建资料')
  // 每次请求按最新属性动态生成房间布局（不落库）
  const roomLayout = buildRoomLayout(bundle.attributes, bundle.room?.theme ?? 'modern')
  return ok(res, { ...bundle, roomLayout })
}

/** POST /api/profile — 保存资料，并在同一事务中自动补齐其余三条初始记录 */
export const createProfile = async (req: Request, res: Response) => {
  const userId = req.userId!
  const { nickname, avatarStyle, preferenceTags, lifeStage } = req.body as {
    nickname: string
    avatarStyle: string
    preferenceTags: string[]
    lifeStage?: string
  }

  await prisma.$transaction([
    prisma.userProfile.upsert({
      where: { userId },
      create: {
        userId,
        nickname,
        avatarStyle,
        preferenceTags,
        avatarConfig: {},
        ...(lifeStage ? { lifeStage } : {}),
      },
      update: {
        nickname,
        avatarStyle,
        preferenceTags,
        ...(lifeStage ? { lifeStage } : {}),
      },
    }),
    // 以下三条：已存在则忽略（update: {} 为无操作），不存在则用默认值创建
    prisma.lifeAttribute.upsert({ where: { userId }, create: { userId }, update: {} }),
    prisma.room.upsert({ where: { userId }, create: { userId, customConfig: {} }, update: {} }),
    prisma.companion.upsert({ where: { userId }, create: { userId, appearance: {} }, update: {} }),
  ])

  const bundle = await fetchBundle(userId)
  return ok(res, bundle, '资料保存成功', 201)
}

/** PUT /api/profile/avatar — 更新头像配置 */
/** 上传自定义头像图片：保存文件并更新 avatarUrl */
export const uploadAvatarImage = async (req: Request, res: Response) => {
  const userId = req.userId!
  if (!req.file) return fail(res, 400, '请上传图片文件')

  const profile = await prisma.userProfile.findUnique({ where: { userId } })
  if (!profile) return fail(res, 404, '请先创建资料')

  const ext = path.extname(req.file.filename) || '.jpg'
  const avatarUrl = `/uploads/avatars/${userId}${ext}`
  await prisma.userProfile.update({ where: { userId }, data: { avatarUrl } })
  return ok(res, { avatarUrl }, '头像已更新')
}

/** 恢复默认头像：清空 avatarUrl 并删除已上传的文件 */
export const resetAvatarImage = async (req: Request, res: Response) => {
  const userId = req.userId!

  const profile = await prisma.userProfile.findUnique({ where: { userId } })
  if (!profile) return fail(res, 404, '请先创建资料')

  if (profile.avatarUrl) {
    // 尝试删除本地文件（失败不影响重置）
    try {
      const name = profile.avatarUrl.split('/').pop()
      if (name) fs.unlinkSync(path.join(UPLOADS_DIR, 'avatars', name))
    } catch {
      // 文件不存在时忽略
    }
  }

  await prisma.userProfile.update({ where: { userId }, data: { avatarUrl: null } })
  return ok(res, { avatarUrl: null }, '已恢复默认头像')
}

export const updateAvatar = async (req: Request, res: Response) => {
  const userId = req.userId!
  const { avatarConfig } = req.body as { avatarConfig: Prisma.InputJsonObject }

  const profile = await prisma.userProfile.findUnique({ where: { userId } })
  if (!profile) return fail(res, 404, '请先创建资料')

  const updated = await prisma.userProfile.update({ where: { userId }, data: { avatarConfig } })
  return ok(res, updated, '头像配置已更新')
}
