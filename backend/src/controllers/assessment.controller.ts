import type { Request, Response } from 'express'
import { prisma } from '../lib/prisma.js'
import { ok, fail } from '../lib/response.js'
import { createSnapshot } from '../services/snapshotService.js'
import {
  CHALLENGE_DESCRIPTIONS,
  DIMENSION_LABELS,
  DIMENSIONS,
  OPTIONS,
  QUESTIONS,
  STRENGTH_DESCRIPTIONS,
  type DimensionKey,
} from '../data/assessmentQuestions.js'

/** 每个维度的 0-100 得分 */
type AttributeScores = Record<DimensionKey, number>

/** GET /api/assessment/questions — 返回 14 题（含选项） */
export const getQuestions = async (_req: Request, res: Response) => {
  const data = QUESTIONS.map((q) => ({ ...q, options: OPTIONS }))
  return ok(res, data)
}

/** GET /api/assessment — 返回已有测评记录与当前属性；未测评时 data 为 null */
export const getAssessment = async (req: Request, res: Response) => {
  const userId = req.userId!
  const [assessment, attributes] = await Promise.all([
    prisma.lifeAssessment.findUnique({ where: { userId } }),
    prisma.lifeAttribute.findUnique({ where: { userId } }),
  ])
  if (!assessment) return ok(res, null, '尚未完成测评')
  return ok(res, { assessment, attributes })
}

/**
 * 根据 7 维得分生成初始画像摘要
 * - 阶段判断：综合平均分 + 最高/最低维度
 * - 优势：得分最高的 2 个维度；挑战：剩余维度中最低的 2 个
 */
const buildResultSummary = (scores: AttributeScores) => {
  // DIMENSIONS 固定 7 个元素，下标访问一定存在
  const sorted = [...DIMENSIONS].sort((a, b) => scores[b] - scores[a])
  const top1 = sorted[0]!
  const top2 = sorted[1]!
  const rest = sorted.slice(2)
  const low1 = rest[rest.length - 2]!
  const low2 = rest[rest.length - 1]!

  const avgScore =
    DIMENSIONS.reduce((sum, d) => sum + scores[d], 0) / DIMENSIONS.length
  const stage =
    avgScore >= 70 ? '绽放期' : avgScore >= 50 ? '成长期' : avgScore >= 30 ? '探索期' : '起步期'

  const strengths = [top1, top2].map((dim) => ({
    dimension: dim,
    label: DIMENSION_LABELS[dim],
    description: STRENGTH_DESCRIPTIONS[dim],
    score: scores[dim],
  }))
  const challenges = [low1, low2].map((dim) => ({
    dimension: dim,
    label: DIMENSION_LABELS[dim],
    description: CHALLENGE_DESCRIPTIONS[dim],
    score: scores[dim],
  }))

  return {
    currentState: `你正处于${stage}：${DIMENSION_LABELS[top1]}突出，${DIMENSION_LABELS[low1]}还有成长空间。`,
    strengths,
    challenges,
    growthDirection: `你的${DIMENSION_LABELS[top1]}正在闪闪发光。接下来，不妨在${DIMENSION_LABELS[low1]}上多给自己一点耐心——小步前进，让优势带动一切，LifeOS 会一直陪着你。`,
  }
}

/** POST /api/assessment/submit — 计算得分、更新属性、保存测评记录（重复提交则覆盖） */
export const submitAssessment = async (req: Request, res: Response) => {
  const userId = req.userId!
  const { answers } = req.body as { answers: Record<string, number> }

  // 1. 每个维度取该维度题目的平均分，映射到 0-100
  const scores: AttributeScores = {
    explore: 0,
    learn: 0,
    execute: 0,
    create: 0,
    health: 0,
    connect: 0,
    stable: 0,
  }
  const dimensionAverages: AttributeScores = { ...scores }
  for (const dim of DIMENSIONS) {
    const dimQuestions = QUESTIONS.filter((q) => q.dimension === dim)
    const avg = dimQuestions.reduce((sum, q) => sum + answers[q.id]!, 0) / dimQuestions.length
    dimensionAverages[dim] = Math.round(avg * 10) / 10
    scores[dim] = Math.round((avg / 5) * 100)
  }

  // 2. 生成画像摘要 + 完整测评数据
  const summary = buildResultSummary(scores)
  const assessmentData = {
    answers,
    dimensionAverages,
    submittedAt: new Date().toISOString(),
  }

  // 3. 同一事务内：更新七维属性 + 覆盖测评记录
  await prisma.$transaction([
    prisma.lifeAttribute.upsert({
      where: { userId },
      create: { userId, ...scores },
      update: { ...scores },
    }),
    prisma.lifeAssessment.upsert({
      where: { userId },
      create: { userId, assessmentData, resultSummary: summary },
      update: { assessmentData, resultSummary: summary },
    }),
  ])

  // 异步创建属性快照（测评完成即落第一条快照，作为大盘趋势基线），不阻塞响应
  void createSnapshot(userId).catch((err) =>
    console.warn('[assessment] 快照创建失败:', err instanceof Error ? err.message : err),
  )

  return ok(res, { attributes: scores, summary }, '测评完成，初始画像已生成', 201)
}
