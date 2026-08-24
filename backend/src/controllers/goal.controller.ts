import type { Request, Response } from 'express'
import { prisma } from '../lib/prisma.js'
import { ok, fail } from '../lib/response.js'
import {
  CATEGORY_DEFAULT_ATTRIBUTES,
  generateBreakdown,
  GOAL_STATUSES,
  type GoalCategory,
} from '../services/goalService.js'

/** POST /api/goals — 创建目标（progress 默认 0，未选提升属性时按分类映射） */
export const createGoal = async (req: Request, res: Response) => {
  const userId = req.userId!
  const { title, description, category, priority, targetDate, targetAttributes } = req.body as {
    title: string
    description?: string
    category: GoalCategory
    priority: string
    targetDate?: string
    targetAttributes?: string[]
  }

  const goal = await prisma.goal.create({
    data: {
      userId,
      title,
      description: description ?? null,
      category,
      priority,
      targetDate: targetDate ? new Date(targetDate) : null,
      targetAttributes:
        targetAttributes && targetAttributes.length > 0
          ? targetAttributes
          : CATEGORY_DEFAULT_ATTRIBUTES[category],
    },
  })

  return ok(res, withDerivedStatus(goal) as typeof goal, '目标创建成功', 201)
}

/** GET /api/goals?status= — 目标列表（默认 active + paused；status=all 返回全部），
 * 附带完整 actions 供前端统计概览/日历/趋势图计算 */
/**
 * 系统自动判定：进行中且已过截止日期 → 展示为「超期未完成」。
 * overdue 为派生状态，不落库（数据库只存 active/paused/completed/abandoned）。
 */
const withDerivedStatus = <T extends { status: string; targetDate: Date | null }>(goal: T): T => {
  if (goal.status === 'active' && goal.targetDate) {
    const today = new Date()
    today.setHours(0, 0, 0, 0)
    if (goal.targetDate < today) return { ...goal, status: 'overdue' }
  }
  return goal
}

export const listGoals = async (req: Request, res: Response) => {
  const userId = req.userId!
  const status = (req.query.status as string | undefined) ?? ''

  let where
  if (status === 'all') {
    where = { userId }
  } else if (status && GOAL_STATUSES.includes(status as (typeof GOAL_STATUSES)[number])) {
    where = { userId, status }
  } else {
    where = { userId, status: { in: ['active', 'paused'] } }
  }

  const goals = await prisma.goal.findMany({
    where,
    orderBy: { createdAt: 'desc' },
    include: {
      _count: { select: { actions: true } },
      actions: { orderBy: { order: 'asc' } },
    },
  })

  return ok(res, goals.map(withDerivedStatus))
}

/** GET /api/goals/:id — 目标详情 + 全部行动（按 order 排序） */
export const getGoal = async (req: Request, res: Response) => {
  const userId = req.userId!
  const id = req.params.id as string

  const goal = await prisma.goal.findFirst({
    where: { id, userId },
    include: { actions: { orderBy: { order: 'asc' } } },
  })
  if (!goal) return fail(res, 404, '目标不存在')

  return ok(res, withDerivedStatus(goal))
}

/** PUT /api/goals/:id — 更新目标字段 */
export const updateGoal = async (req: Request, res: Response) => {
  const userId = req.userId!
  const id = req.params.id as string
  const { title, description, category, priority, status, targetDate, targetAttributes } = req.body as {
    title?: string
    description?: string
    category?: GoalCategory
    priority?: string
    status?: string
    targetDate?: string | null
    targetAttributes?: string[]
  }

  const existing = await prisma.goal.findFirst({ where: { id, userId } })
  if (!existing) return fail(res, 404, '目标不存在')

  // 完成时间自动维护：标记完成 → 记录 completedAt；恢复进行/暂缓 → 清空 completedAt
  let completedAt = undefined as Date | null | undefined
  if (status === 'completed') completedAt = existing.completedAt ?? new Date()
  else if (status === 'active' || status === 'paused') completedAt = null

  const goal = await prisma.goal.update({
    where: { id },
    data: {
      ...(title !== undefined ? { title } : {}),
      ...(description !== undefined ? { description } : {}),
      ...(category !== undefined ? { category } : {}),
      ...(priority !== undefined ? { priority } : {}),
      ...(status !== undefined ? { status } : {}),
      ...(targetDate !== undefined ? { targetDate: targetDate ? new Date(targetDate) : null } : {}),
      ...(targetAttributes !== undefined ? { targetAttributes } : {}),
      ...(completedAt !== undefined ? { completedAt } : {}),
    },
  })

  return ok(res, withDerivedStatus(goal), '目标已更新')
}

/** DELETE /api/goals/:id — 删除目标（级联删除 actions） */
export const deleteGoal = async (req: Request, res: Response) => {
  const userId = req.userId!
  const id = req.params.id as string

  const result = await prisma.goal.deleteMany({ where: { id, userId } })
  if (result.count === 0) return fail(res, 404, '目标不存在')

  return ok(res, null, '目标已删除')
}

/** POST /api/goals/breakdown — AI 拆解目标为行动列表（失败降级通用模板） */
export const breakdownGoal = async (req: Request, res: Response) => {
  const { goalTitle, goalDescription, category } = req.body as {
    goalTitle: string
    goalDescription?: string
    category?: string
  }

  const actions = await generateBreakdown(goalTitle, goalDescription ?? '', category ?? '')
  return ok(res, { actions }, '拆解完成')
}
