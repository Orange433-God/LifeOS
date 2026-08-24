import { prisma } from '../lib/prisma.js'

// ===== 属性快照服务（趋势展示数据源）=====

export const ATTRIBUTE_KEYS = ['explore', 'learn', 'execute', 'create', 'health', 'connect', 'stable'] as const
export type AttributeKey = (typeof ATTRIBUTE_KEYS)[number]
export type AttributeSet = Record<AttributeKey, number>

type AttributeRow = Record<AttributeKey, number>

/** 从任意含 7 项属性的行中提取属性对象 */
export const pickAttributes = (row: AttributeRow): AttributeSet =>
  Object.fromEntries(ATTRIBUTE_KEYS.map((key) => [key, row[key]])) as AttributeSet

const startOfToday = (): Date => {
  const d = new Date()
  d.setHours(0, 0, 0, 0)
  return d
}

/**
 * 为某用户创建今天的属性快照：
 * - 当天已有快照则跳过（避免数据膨胀）
 * - 读取当前 LifeAttribute 值写入
 * 调用方以「异步不阻塞」方式触发（void createSnapshot(...)）。
 */
export const createSnapshot = async (userId: string): Promise<void> => {
  const existing = await prisma.attributeSnapshot.findFirst({
    where: { userId, recordedAt: { gte: startOfToday() } },
  })
  if (existing) return

  const attributes = await prisma.lifeAttribute.findUnique({ where: { userId } })
  if (!attributes) return

  await prisma.attributeSnapshot.create({
    data: {
      userId,
      explore: attributes.explore,
      learn: attributes.learn,
      execute: attributes.execute,
      create: attributes.create,
      health: attributes.health,
      connect: attributes.connect,
      stable: attributes.stable,
    },
  })
}
