import type { Request, Response } from 'express'
import { prisma } from '../lib/prisma.js'
import { ok, fail } from '../lib/response.js'
import { getCachedStageSummary } from '../services/stageSummary.js'
import { ATTRIBUTE_KEYS, pickAttributes, type AttributeSet } from '../services/snapshotService.js'

/** 本地日期键（YYYY-MM-DD） */
const toDateKey = (d: Date): string =>
  `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`

/** 计算变化量（当前 - 初始，四舍五入取整，负数自带符号） */
const computeChanges = (current: AttributeSet, initial: AttributeSet): AttributeSet =>
  Object.fromEntries(
    ATTRIBUTE_KEYS.map((key) => [key, Math.round(current[key] - initial[key])]),
  ) as AttributeSet

/** GET /api/dashboard/overview — 大盘全景数据 */
export const getOverview = async (req: Request, res: Response) => {
  const userId = req.userId!

  const [attributes, firstSnapshot, records, goals] = await Promise.all([
    prisma.lifeAttribute.findUnique({ where: { userId } }),
    prisma.attributeSnapshot.findFirst({ where: { userId }, orderBy: { recordedAt: 'asc' } }),
    prisma.lifeRecord.findMany({
      where: { userId },
      orderBy: { recordedAt: 'desc' },
      take: 5,
      select: { id: true, title: true, type: true, mood: true, tags: true, recordedAt: true },
    }),
    prisma.goal.findMany({
      where: { userId, status: 'active' },
      orderBy: { createdAt: 'desc' },
      take: 3,
      select: { id: true, title: true, progress: true, targetDate: true, status: true },
    }),
  ])

  if (!attributes) return fail(res, 404, '请先创建资料')

  const currentAttributes = pickAttributes(attributes)
  // 初始属性：最早一条快照；无快照时以当前值为基线（变化全 0）
  const initialAttributes = firstSnapshot ? pickAttributes(firstSnapshot) : { ...currentAttributes }

  // 秒开：缓存优先，AI 后台生成（不再阻塞 overview 响应）
  const summary = getCachedStageSummary(userId, currentAttributes, computeChanges(currentAttributes, initialAttributes))

  return ok(res, {
    currentAttributes,
    initialAttributes,
    changes: computeChanges(currentAttributes, initialAttributes),
    recentRecords: records,
    activeGoals: goals,
    summary,
  })
}

/** GET /api/dashboard/history — 最近 N 天属性快照（缺失日期前向填充） */
export const getHistory = async (req: Request, res: Response) => {
  const userId = req.userId!
  const days = Math.min(Math.max(Number(req.query.days ?? 30), 1), 366)

  const attributes = await prisma.lifeAttribute.findUnique({ where: { userId } })
  if (!attributes) return fail(res, 404, '请先创建资料')

  const start = new Date()
  start.setHours(0, 0, 0, 0)
  start.setDate(start.getDate() - (days - 1))

  // 区间内快照 + 区间前最近一条（作为填充基线）
  const [before, snapshots] = await Promise.all([
    prisma.attributeSnapshot.findFirst({
      where: { userId, recordedAt: { lt: start } },
      orderBy: { recordedAt: 'desc' },
    }),
    prisma.attributeSnapshot.findMany({
      where: { userId, recordedAt: { gte: start } },
      orderBy: { recordedAt: 'asc' },
    }),
  ])

  // 基线：区间前快照 → 区间内最早快照 → 当前属性
  let baseline: AttributeSet
  if (before) baseline = pickAttributes(before)
  else if (snapshots.length > 0) baseline = pickAttributes(snapshots[0]!)
  else baseline = pickAttributes(attributes)

  // 按日期聚合（同一天多条取最后一条）
  const byDate = new Map<string, AttributeSet>()
  for (const s of snapshots) byDate.set(toDateKey(s.recordedAt), pickAttributes(s))

  // 生成日期轴并前向填充
  const dates: string[] = []
  const series = ATTRIBUTE_KEYS.map(() => [] as number[])
  let current = baseline
  for (let i = 0; i < days; i++) {
    const d = new Date(start)
    d.setDate(start.getDate() + i)
    const key = toDateKey(d)
    dates.push(key)
    current = byDate.get(key) ?? current
    ATTRIBUTE_KEYS.forEach((k, idx) => series[idx]!.push(current[k]))
  }

  return ok(res, {
    dates,
    explore: series[0],
    learn: series[1],
    execute: series[2],
    create: series[3],
    health: series[4],
    connect: series[5],
    stable: series[6],
  })
}
