import type { Request, Response } from 'express'
import { prisma } from '../lib/prisma.js'
import { ok, fail } from '../lib/response.js'

export const DEFAULT_SETTINGS = {
  aiMessageNotify: true,
  goalProgressNotify: true,
  growthAchieveNotify: true,
  systemUpdateNotify: true,
  activityRecommend: true,
  quietStart: null,
  quietEnd: null,
  themeMode: 'dark',
  themeColor: 'purple',
  density: 'medium',
  language: 'zh-CN',
  timeFormat: '24h',
  dateFormat: 'YYYY-MM-DD',
  weekStart: 'monday',
  startPage: 'home',
} as const

/** 获取或懒创建 UserSettings */
const getOrCreateSettings = async (userId: string) => {
  let settings = await prisma.userSettings.findUnique({ where: { userId } })
  if (!settings) {
    settings = await prisma.userSettings.create({ data: { userId, ...DEFAULT_SETTINGS } })
  }
  return settings
}

/** GET /api/settings — 设置合并视图（UserSettings + UserProfile 基础信息 + UserPrivacy） */
export const getSettings = async (req: Request, res: Response) => {
  const userId = req.userId!

  const [settings, profile, privacy, user] = await Promise.all([
    getOrCreateSettings(userId),
    prisma.userProfile.findUnique({ where: { userId } }),
    prisma.userPrivacy.findUnique({ where: { userId } }),
    prisma.user.findUnique({ where: { id: userId }, select: { email: true } }),
  ])
  if (!profile) return fail(res, 404, '请先创建资料')

  return ok(res, {
    settings,
    profile: {
      userId,
      email: user?.email ?? '',
      nickname: profile.nickname,
      avatarStyle: profile.avatarStyle,
      uid: profile.uid,
      avatarUrl: profile.avatarUrl,
      birthdate: profile.birthdate,
      gender: profile.gender,
      bio: profile.bio,
    },
    privacy: privacy ?? {
      roomAccess: 'private',
      profileVisibility: 'friends_only',
      allowRoomVisit: false,
      showOnlineStatus: true,
      allowSearch: true,
    },
  })
}

/** PUT /api/settings/profile — 更新个人信息（昵称/头像/生日/性别/简介） */
export const updateProfile = async (req: Request, res: Response) => {
  const userId = req.userId!
  const { nickname, avatarStyle, birthdate, gender, bio } = req.body as {
    nickname?: string
    avatarStyle?: string
    birthdate?: string | null
    gender?: string | null
    bio?: string | null
  }

  const existing = await prisma.userProfile.findUnique({ where: { userId } })
  if (!existing) return fail(res, 404, '请先创建资料')

  const profile = await prisma.userProfile.update({
    where: { userId },
    data: {
      ...(nickname !== undefined ? { nickname } : {}),
      ...(avatarStyle !== undefined ? { avatarStyle } : {}),
      ...(birthdate !== undefined ? { birthdate: birthdate ? new Date(birthdate) : null } : {}),
      ...(gender !== undefined ? { gender } : {}),
      ...(bio !== undefined ? { bio } : {}),
    },
  })

  return ok(res, profile, '个人信息已更新')
}

/** PUT /api/settings/notification — 更新通知设置 */
export const updateNotification = async (req: Request, res: Response) => {
  const userId = req.userId!
  const settings = await prisma.userSettings.upsert({
    where: { userId },
    create: { userId, ...DEFAULT_SETTINGS, ...req.body },
    update: { ...req.body },
  })
  return ok(res, settings, '通知设置已保存')
}

/** PUT /api/settings/appearance — 更新外观设置 */
export const updateAppearance = async (req: Request, res: Response) => {
  const userId = req.userId!
  const settings = await prisma.userSettings.upsert({
    where: { userId },
    create: { userId, ...DEFAULT_SETTINGS, ...req.body },
    update: { ...req.body },
  })
  return ok(res, settings, '外观设置已保存')
}

/** PUT /api/settings/general — 更新通用设置 */
export const updateGeneral = async (req: Request, res: Response) => {
  const userId = req.userId!
  const settings = await prisma.userSettings.upsert({
    where: { userId },
    create: { userId, ...DEFAULT_SETTINGS, ...req.body },
    update: { ...req.body },
  })
  return ok(res, settings, '通用设置已保存')
}

/** POST /api/settings/reset — 恢复默认设置 */
export const resetSettings = async (req: Request, res: Response) => {
  const userId = req.userId!
  await getOrCreateSettings(userId) // 确保行存在
  const settings = await prisma.userSettings.update({
    where: { userId },
    data: { ...DEFAULT_SETTINGS },
  })
  return ok(res, settings, '已恢复默认设置')
}

/** GET /api/settings/export — 导出全部个人数据（JSON） */
export const exportData = async (req: Request, res: Response) => {
  const userId = req.userId!

  const [profile, attributes, settings, privacy, records, goals, companion, assessment] = await Promise.all([
    prisma.userProfile.findUnique({ where: { userId } }),
    prisma.lifeAttribute.findUnique({ where: { userId } }),
    prisma.userSettings.findUnique({ where: { userId } }),
    prisma.userPrivacy.findUnique({ where: { userId } }),
    prisma.lifeRecord.findMany({ where: { userId }, orderBy: { recordedAt: 'desc' } }),
    prisma.goal.findMany({ where: { userId }, include: { actions: true } }),
    prisma.companion.findUnique({ where: { userId } }),
    prisma.lifeAssessment.findUnique({ where: { userId } }),
  ])

  return ok(res, {
    exportedAt: new Date().toISOString(),
    profile,
    attributes,
    settings,
    privacy,
    records,
    goals,
    companion,
    assessment,
  }, '导出成功')
}

/** POST /api/settings/clear — 分项清除数据（records / goals / all） */
export const clearData = async (req: Request, res: Response) => {
  const userId = req.userId!
  const { scope } = req.body as { scope: 'records' | 'goals' | 'all' }

  let records = 0
  let goals = 0
  let snapshots = 0

  if (scope === 'records' || scope === 'all') {
    records = (await prisma.lifeRecord.deleteMany({ where: { userId } })).count
  }
  if (scope === 'goals' || scope === 'all') {
    goals = (await prisma.goal.deleteMany({ where: { userId } })).count
  }
  if (scope === 'all') {
    snapshots = (await prisma.attributeSnapshot.deleteMany({ where: { userId } })).count
  }

  return ok(res, { records, goals, snapshots }, '数据已清除')
}

/** DELETE /api/settings/account — 注销账户（需邮箱确认，级联清理无外键的社交数据） */
export const deleteAccount = async (req: Request, res: Response) => {
  const userId = req.userId!
  const { confirm } = req.body as { confirm: string }

  const user = await prisma.user.findUnique({ where: { id: userId } })
  if (!user) return fail(res, 404, '用户不存在')
  if (confirm !== user.email) return fail(res, 400, '确认信息与注册邮箱不一致')

  // Friend / RoomVisit 无级联外键，先清理相关行
  await Promise.all([
    prisma.friend.deleteMany({ where: { OR: [{ userId }, { friendId: userId }] } }),
    prisma.roomVisit.deleteMany({ where: { OR: [{ visitorId: userId }, { ownerId: userId }] } }),
  ])

  // 删除用户（其余数据经外键级联删除）
  await prisma.user.delete({ where: { id: userId } })

  return ok(res, null, '账户已注销')
}
