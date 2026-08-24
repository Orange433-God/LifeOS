import type { Request, Response } from 'express'
import { prisma } from '../lib/prisma.js'
import { ok, fail } from '../lib/response.js'
import { getCachedGrowthSummary } from '../services/growthSummary.js'
import {
  ATTRIBUTE_KEYS,
  pickAttributes,
  type AttributeKey,
  type AttributeSet,
} from '../services/snapshotService.js'

// ===== 成长分析（轨迹 + 趋势 + AI 传记）=====

type Period = 'month' | 'quarter' | 'year'

const PERIODS: Period[] = ['month', 'quarter', 'year']
const PERIOD_DAYS: Record<Period, number> = { month: 30, quarter: 91, year: 365 }
const PERIOD_LABELS: Record<Period, string> = { month: '最近一个月', quarter: '最近三个月', year: '最近一年' }

/** 日期 → "YYYY-MM" */
const toMonthKey = (d: Date): string =>
  `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`

/** 月桶：label 为 "YYYY-MM"（聚合粒度统一为月，period 只控制数据范围） */
const buildMonthlyBuckets = (since: Date, now: Date): Array<{ label: string; end: Date }> => {
  const buckets: Array<{ label: string; end: Date }> = []
  const cursor = new Date(since.getFullYear(), since.getMonth(), 1)
  while (cursor.getTime() <= now.getTime()) {
    const end = new Date(cursor.getFullYear(), cursor.getMonth() + 1, 1)
    buckets.push({ label: toMonthKey(cursor), end })
    cursor.setTime(end.getTime())
  }
  return buckets
}

/** GET /api/growth/timeline — 人生轨迹事件（记录/完成目标/首次测评 三源合并，按时间降序） */
export const getTimeline = async (req: Request, res: Response) => {
  const userId = req.userId!
  const limit = Math.min(Math.max(Number(req.query.limit ?? 20), 1), 200)

  const [records, completedGoals, assessment] = await Promise.all([
    prisma.lifeRecord.findMany({
      where: { userId },
      orderBy: { recordedAt: 'desc' },
      take: limit,
      select: { id: true, title: true, type: true, summary: true, recordedAt: true },
    }),
    prisma.goal.findMany({
      where: { userId, status: 'completed' },
      orderBy: { updatedAt: 'desc' },
      take: limit,
      select: { id: true, title: true, description: true, updatedAt: true },
    }),
    prisma.lifeAssessment.findUnique({ where: { userId }, select: { createdAt: true } }),
  ])

  const events: Array<{
    id: string
    type: 'milestone' | 'goal_completed' | 'assessment' | 'record'
    title: string
    description: string
    date: string
    icon: string
    source: string
    goalId?: string
  }> = []

  // 首次测评：开始认识自己
  if (assessment) {
    events.push({
      id: `assessment-${userId}`,
      type: 'assessment',
      title: '完成人生测评，开始认识自己',
      description: '第一次认真审视自己的七维属性，生成初始人生画像',
      date: toMonthKey(assessment.createdAt),
      icon: '🧭',
      source: '人生测评',
    })
  }

  // 已完成的目标：成就事件
  for (const goal of completedGoals) {
    events.push({
      id: goal.id,
      type: 'goal_completed',
      title: goal.title,
      description: goal.description ?? `目标达成：${goal.title}`,
      date: toMonthKey(goal.updatedAt),
      icon: '🏆',
      source: '目标达成',
      goalId: goal.id,
    })
  }

  // 人生记录：里程碑 + 普通记录
  for (const record of records) {
    const isMilestone = record.type === 'milestone'
    events.push({
      id: record.id,
      type: isMilestone ? 'milestone' : 'record',
      title: record.title ?? '一条人生记录',
      description: record.summary ?? '',
      date: toMonthKey(record.recordedAt),
      icon: isMilestone ? '🎉' : '📝',
      source: '人生记录',
    })
  }

  // 按时间降序合并（month key 字典序即时间序）
  events.sort((a, b) => (a.date < b.date ? 1 : a.date > b.date ? -1 : 0))

  return ok(res, { events: events.slice(0, limit) })
}

/** GET /api/growth/trends — 属性快照按周期聚合（桶末值 + 前向填充；数据点 < 3 返回空数组） */
export const getTrends = async (req: Request, res: Response) => {
  const userId = req.userId!
  const period = (req.query.period as Period | undefined) ?? 'quarter'
  if (!PERIODS.includes(period)) return fail(res, 400, 'period 必须是 month/quarter/year')

  const days = PERIOD_DAYS[period]
  const since = new Date(Date.now() - days * 86_400_000)
  const now = new Date()

  const [snapshots, attributes] = await Promise.all([
    prisma.attributeSnapshot.findMany({
      where: { userId, recordedAt: { gte: since } },
      orderBy: { recordedAt: 'asc' },
    }),
    prisma.lifeAttribute.findUnique({ where: { userId } }),
  ])
  if (!attributes) return fail(res, 404, '请先创建资料')

  const buckets = buildMonthlyBuckets(since, now)
  let filled = 0

  // 零快照基线：当前属性（前端据 dataPoints 提示数据积累中，但仍展示基线平直线）
  const zeroBaseline = pickAttributes(attributes)

  const series = ATTRIBUTE_KEYS.map(() => [] as number[])
  let baseline: AttributeSet | null = null

  for (const bucket of buckets) {
    // 桶末值：该月最后一条快照；无数据月前向填充
    let value: AttributeSet | null = null
    for (const s of snapshots) {
      if (s.recordedAt.getTime() < bucket.end.getTime()) {
        value = pickAttributes(s)
      } else break
    }
    if (value === null) {
      value = baseline ?? zeroBaseline // 前向填充 / 零快照基线
    } else {
      filled += 1
      baseline = value
    }
    ATTRIBUTE_KEYS.forEach((key, idx) => series[idx]!.push(value![key]))
  }

  return ok(res, {
    labels: buckets.map((b) => b.label),
    dataPoints: filled,
    explore: series[0],
    learn: series[1],
    execute: series[2],
    create: series[3],
    health: series[4],
    connect: series[5],
    stable: series[6],
  })
}

/** GET /api/growth/summary — AI 人生阶段总结（降级规则模板） */
export const getSummary = async (req: Request, res: Response) => {
  const userId = req.userId!
  const period = (req.query.period as Period | undefined) ?? 'quarter'
  if (!PERIODS.includes(period)) return fail(res, 400, 'period 必须是 month/quarter/year')

  const days = PERIOD_DAYS[period]
  const since = new Date(Date.now() - days * 86_400_000)

  const [snapshots, attributes, completedGoals, recordCount] = await Promise.all([
    prisma.attributeSnapshot.findMany({
      where: { userId, recordedAt: { gte: since } },
      orderBy: { recordedAt: 'asc' },
    }),
    prisma.lifeAttribute.findUnique({ where: { userId } }),
    prisma.goal.count({ where: { userId, status: 'completed', updatedAt: { gte: since } } }),
    prisma.lifeRecord.count({ where: { userId, recordedAt: { gte: since } } }),
  ])

  if (!attributes) return fail(res, 404, '请先创建资料')

  const startAttrs = pickAttributes(snapshots[0] ?? attributes)
  const endAttrs = pickAttributes(snapshots[snapshots.length - 1] ?? attributes)
  const changes = Object.fromEntries(
    ATTRIBUTE_KEYS.map((key) => [key, Math.round(endAttrs[key] - startAttrs[key])]),
  ) as Record<AttributeKey, number>

  const current = pickAttributes(attributes)
  const entries = ATTRIBUTE_KEYS.map((key) => [key, current[key]] as const)
  const highest = entries.reduce((a, b) => (b[1] > a[1] ? b : a))[0]
  const lowest = entries.reduce((a, b) => (b[1] < a[1] ? b : a))[0]

  const summary = getCachedGrowthSummary(`${userId}:${period}`, {
    changes,
    completedGoals,
    recordCount,
    highest,
    lowest,
    periodLabel: PERIOD_LABELS[period],
  })

  return ok(res, summary)
}
