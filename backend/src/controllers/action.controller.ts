import type { Request, Response } from 'express'
import { prisma } from '../lib/prisma.js'
import { ok, fail } from '../lib/response.js'
import { recomputeGoalProgress } from '../services/goalService.js'

/** POST /api/goals/:goalId/actions — 新建行动，order = 当前最大 + 1 */
export const createAction = async (req: Request, res: Response) => {
  const userId = req.userId!
  const goalId = req.params.goalId as string
  const { content, dueDate } = req.body as { content: string; dueDate?: string }

  const goal = await prisma.goal.findFirst({ where: { id: goalId, userId } })
  if (!goal) return fail(res, 404, '目标不存在')

  const last = await prisma.action.findFirst({
    where: { goalId },
    orderBy: { order: 'desc' },
  })

  const action = await prisma.action.create({
    data: {
      goalId,
      content,
      dueDate: dueDate ? new Date(dueDate) : null,
      order: (last?.order ?? 0) + 1,
    },
  })

  // 行动数量变化也会影响完成率
  const progress = await recomputeGoalProgress(goalId)
  return ok(res, { action, progress }, '行动已添加', 201)
}

/** 校验行动归属（防越权） */
const findOwnedAction = async (actionId: string, userId: string) =>
  prisma.action.findFirst({
    where: { id: actionId, goal: { userId } },
  })

/** PUT /api/actions/:id — 更新行动；isCompleted 变化时维护 completedAt 并重算进度 */
export const updateAction = async (req: Request, res: Response) => {
  const userId = req.userId!
  const id = req.params.id as string
  const { content, dueDate, isCompleted } = req.body as {
    content?: string
    dueDate?: string | null
    isCompleted?: boolean
  }

  const existing = await findOwnedAction(id, userId)
  if (!existing) return fail(res, 404, '行动不存在')

  const action = await prisma.action.update({
    where: { id },
    data: {
      ...(content !== undefined ? { content } : {}),
      ...(dueDate !== undefined ? { dueDate: dueDate ? new Date(dueDate) : null } : {}),
      ...(isCompleted !== undefined
        ? {
            isCompleted,
            // 变为完成时记录时间，取消完成时清空
            completedAt:
              isCompleted && !existing.isCompleted
                ? new Date()
                : !isCompleted
                  ? null
                  : existing.completedAt,
          }
        : {}),
    },
  })

  const progress = await recomputeGoalProgress(action.goalId)
  return ok(res, { action, progress }, '行动已更新')
}

/** PUT /api/actions/:id/toggle — 切换完成状态（前端复选框一键操作） */
export const toggleAction = async (req: Request, res: Response) => {
  const userId = req.userId!
  const id = req.params.id as string

  const existing = await findOwnedAction(id, userId)
  if (!existing) return fail(res, 404, '行动不存在')

  const action = await prisma.action.update({
    where: { id },
    data: {
      isCompleted: !existing.isCompleted,
      completedAt: !existing.isCompleted ? new Date() : null,
    },
  })

  const progress = await recomputeGoalProgress(action.goalId)
  return ok(res, { action, progress }, '已切换')
}

/** DELETE /api/actions/:id — 删除行动并重算进度 */
export const deleteAction = async (req: Request, res: Response) => {
  const userId = req.userId!
  const id = req.params.id as string

  const existing = await findOwnedAction(id, userId)
  if (!existing) return fail(res, 404, '行动不存在')

  await prisma.action.delete({ where: { id } })
  const progress = await recomputeGoalProgress(existing.goalId)

  return ok(res, { progress }, '行动已删除')
}
