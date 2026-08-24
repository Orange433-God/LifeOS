import { env } from '../config/env.js'
import { prisma } from '../lib/prisma.js'

// ===== 目标服务：进度重算 + AI 目标拆解 =====

export const GOAL_CATEGORIES = ['study', 'health', 'career', 'create', 'life', 'other'] as const
export type GoalCategory = (typeof GOAL_CATEGORIES)[number]

export const GOAL_PRIORITIES = ['high', 'mid', 'low'] as const

export const GOAL_STATUSES = ['active', 'paused', 'completed', 'abandoned'] as const

/** 分类 → 默认提升属性（用户未选择时自动映射） */
export const CATEGORY_DEFAULT_ATTRIBUTES: Record<GoalCategory, string[]> = {
  study: ['learn', 'execute'],
  health: ['health'],
  career: ['execute', 'connect'],
  create: ['create'],
  life: ['stable', 'health'],
  other: [],
}

/** 行动完成率 → 目标进度（completed / total * 100） */
export const recomputeGoalProgress = async (goalId: string): Promise<number> => {
  const actions = await prisma.action.findMany({
    where: { goalId },
    select: { isCompleted: true },
  })
  const total = actions.length
  const done = actions.filter((a) => a.isCompleted).length
  const progress = total === 0 ? 0 : Math.round((done / total) * 100)

  await prisma.goal.update({ where: { id: goalId }, data: { progress } })
  return progress
}

// ---- AI 目标拆解 ----

const BREAKDOWN_SYSTEM_PROMPT = `你是一个目标拆解教练。用户想要完成一个目标，请将目标拆解为 3-8 个具体可执行的步骤（行动）。
要求：步骤要具体、可量化、按时间或逻辑排序。
以 JSON 数组格式输出，每个元素包含 "content" 字段。
例如：[{"content": "第一步：查阅相关资料，制定学习计划"}, {"content": "第二步：每天学习 2 小时"}]`

/** 通用拆解模板（AI 不可用时降级） */
const BREAKDOWN_FALLBACK = [
  { content: '第一步：了解目标背景，明确成功标准' },
  { content: '第二步：制定计划，拆出可执行的小步骤' },
  { content: '第三步：开始执行，记录过程与反馈' },
  { content: '第四步：定期复盘调整，保持节奏' },
]

const breakdownByAi = async (
  title: string,
  description: string,
  category: string,
): Promise<Array<{ content: string }>> => {
  const controller = new AbortController()
  const timer = setTimeout(() => controller.abort(), 15_000)

  try {
    const response = await fetch(`${env.deepseekBaseUrl.replace(/\/+$/, '')}/chat/completions`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${env.deepseekApiKey}`,
      },
      body: JSON.stringify({
        model: env.recordParseModel,
        messages: [
          { role: 'system', content: BREAKDOWN_SYSTEM_PROMPT },
          {
            role: 'user',
            content: `目标：${title}\n${description ? `描述：${description}\n` : ''}${category ? `分类：${category}` : ''}`,
          },
        ],
        temperature: 0.6,
        max_tokens: 800,
        response_format: { type: 'json_object' },
      }),
      signal: controller.signal,
    })

    if (!response.ok) throw new Error(`DeepSeek 返回 ${response.status}`)
    const body = (await response.json()) as {
      choices?: Array<{ message?: { content?: string } }>
    }
    const raw = body.choices?.[0]?.message?.content ?? ''
    // 兼容两种输出：裸数组 / {"actions": [...]} / {"steps": [...]}
    let arr: unknown = null
    try {
      const parsed = JSON.parse(raw) as unknown
      if (Array.isArray(parsed)) arr = parsed
      else if (typeof parsed === 'object' && parsed !== null) {
        const obj = parsed as Record<string, unknown>
        arr = Array.isArray(obj.actions) ? obj.actions : Array.isArray(obj.steps) ? obj.steps : null
      }
    } catch {
      const match = raw.match(/\[[\s\S]*\]/)
      if (match) {
        try {
          arr = JSON.parse(match[0]) as unknown
        } catch {
          arr = null
        }
      }
    }

    if (!Array.isArray(arr) || arr.length === 0) throw new Error('AI 未返回有效的行动列表')
    return arr
      .map((item) => (typeof item === 'object' && item !== null ? (item as Record<string, unknown>).content : null))
      .filter((c): c is unknown => typeof c === 'string' && !!c.trim())
      .slice(0, 8)
      .map((c) => ({ content: (c as string).trim() }))
  } finally {
    clearTimeout(timer)
  }
}

/** 目标拆解：优先 AI，失败降级通用模板 */
export const generateBreakdown = async (
  title: string,
  description = '',
  category = '',
): Promise<Array<{ content: string }>> => {
  if (!env.deepseekApiKey) return BREAKDOWN_FALLBACK
  try {
    const result = await breakdownByAi(title, description, category)
    return result.length > 0 ? result : BREAKDOWN_FALLBACK
  } catch (error) {
    console.warn('[goalService] AI 拆解失败，降级通用模板:', error instanceof Error ? error.message : error)
    return BREAKDOWN_FALLBACK
  }
}
