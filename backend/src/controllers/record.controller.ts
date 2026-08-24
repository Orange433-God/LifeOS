import type { Request, Response } from 'express'
import { prisma } from '../lib/prisma.js'
import { ok, fail } from '../lib/response.js'
import { parseRecord, type RecordType } from '../services/recordParser.js'
import { createSnapshot } from '../services/snapshotService.js'

/** 按类型返回一句鼓励性反馈 */
const FEEDBACK_BY_TYPE: Record<RecordType, string> = {
  milestone: '太棒了！这被标记为里程碑事件 ✨',
  event: '这个特别的时刻已为你收藏 📌',
  idea: '灵感已收入囊中，别让它溜走 💡',
  daily: '生活的点滴，都值得被记住 🌿',
}

/** POST /api/records/quick — 一句话快速记录，AI 自动分类/打标签/提取情绪 */
export const quickRecord = async (req: Request, res: Response) => {
  const userId = req.userId!
  const { content, recordedAt } = req.body as { content: string; recordedAt?: string }

  const parsed = await parseRecord(content)
  const record = await prisma.lifeRecord.create({
    data: {
      userId,
      rawContent: content,
      title: parsed.title,
      type: parsed.type,
      mood: parsed.mood,
      tags: parsed.tags,
      summary: parsed.summary,
      recordedAt: recordedAt ? new Date(recordedAt) : new Date(),
    },
  })

  // 异步落属性快照（当天已有则跳过），不阻塞响应
  void createSnapshot(userId).catch((err) =>
    console.warn('[record] 快照创建失败:', err instanceof Error ? err.message : err),
  )

  return ok(res, { record, feedback: FEEDBACK_BY_TYPE[parsed.type] }, '记录成功', 201)
}

/** GET /api/records — 记录列表（可选时间范围，按 recordedAt 降序，默认 100 条） */
export const listRecords = async (req: Request, res: Response) => {
  const userId = req.userId!
  const { startDate, endDate } = req.query as { startDate?: string; endDate?: string }
  const limit = Math.min(Math.max(Number(req.query.limit ?? 100), 1), 500)

  const records = await prisma.lifeRecord.findMany({
    where: {
      userId,
      ...(startDate || endDate
        ? {
            recordedAt: {
              ...(startDate ? { gte: new Date(startDate) } : {}),
              ...(endDate ? { lte: new Date(endDate) } : {}),
            },
          }
        : {}),
    },
    orderBy: { recordedAt: 'desc' },
    take: limit,
  })

  return ok(res, records)
}

/** GET /api/records/:id — 单条记录详情 */
export const getRecord = async (req: Request, res: Response) => {
  const userId = req.userId!
  const record = await prisma.lifeRecord.findFirst({
    where: { id: req.params.id as string, userId },
  })
  if (!record) return fail(res, 404, '记录不存在')

  return ok(res, record)
}

/** GET /api/records/recent — 最近 N 条记录（按 recordedAt 降序） */
export const recentRecords = async (req: Request, res: Response) => {
  const userId = req.userId!
  const limit = Number((req.query.limit as string | undefined) ?? 10)

  const records = await prisma.lifeRecord.findMany({
    where: { userId },
    orderBy: { recordedAt: 'desc' },
    take: limit,
  })

  return ok(res, records)
}

/** DELETE /api/records/:id — 删除记录（校验归属） */
export const deleteRecord = async (req: Request, res: Response) => {
  const userId = req.userId!
  const id = req.params.id as string

  const result = await prisma.lifeRecord.deleteMany({ where: { id, userId } })
  if (result.count === 0) return fail(res, 404, '记录不存在或无权删除')

  return ok(res, null, '记录已删除')
}
