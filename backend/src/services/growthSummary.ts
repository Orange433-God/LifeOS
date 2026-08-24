import { env } from '../config/env.js'
import { DIMENSION_LABELS, type DimensionKey } from '../data/assessmentQuestions.js'
import type { AttributeSet } from './snapshotService.js'

// ===== 成长阶段总结（DeepSeek 直调 + 规则模板降级）=====

export interface GrowthSummaryResult {
  title: string
  content: string
  advice: string
}

export interface GrowthSummaryInput {
  changes: Record<DimensionKey, number>
  completedGoals: number
  recordCount: number
  highest: DimensionKey
  lowest: DimensionKey
  periodLabel: string
}

const SYSTEM_PROMPT = `你是一个人生回顾教练。根据以下用户数据，生成一段 80-120 字的人生阶段总结。
数据：{变化数据}
要求：温暖、鼓励、具体，提到用户的具体变化，给出 1 条未来建议。
输出 JSON：{"title": "阶段标题", "content": "总结内容", "advice": "建议"}`

/** 最低属性 → 通用建议 */
const SUGGESTIONS: Record<DimensionKey, string> = {
  explore: '建议每周安排一次小的新体验，让好奇心带路',
  learn: '建议建立固定的学习节奏，哪怕每天 20 分钟',
  execute: '建议把目标拆小一点，先从 10 分钟的第一步开始',
  create: '建议留出无干扰的创作时间，让灵感落地',
  health: '建议增加轻度运动，从每周两次散步开始',
  connect: '建议本周主动联系一位朋友，聊聊近况',
  stable: '建议练习正念或深呼吸，找回自己的节奏',
}

/** 最高属性 → 阶段名 */
const STAGE_NAMES: Record<DimensionKey, string> = {
  explore: '探索者',
  learn: '学习者',
  execute: '行动者',
  create: '创造者',
  health: '活力者',
  connect: '连接者',
  stable: '稳定者',
}

/** 规则模板（无 Key / 调用失败时降级） */
const buildFallback = (input: GrowthSummaryInput): GrowthSummaryResult => {
  const highestLabel = DIMENSION_LABELS[input.highest]
  const lowestLabel = DIMENSION_LABELS[input.lowest]
  return {
    title: `${STAGE_NAMES[input.highest]}的${input.periodLabel}成长阶段`,
    content: `${input.periodLabel}你完成了 ${input.completedGoals} 个目标、留下 ${input.recordCount} 条记录。你的${highestLabel}提升了，${lowestLabel}略有下降，整体正在稳步前行。`,
    advice: SUGGESTIONS[input.lowest],
  }
}

const summarizeByAi = async (input: GrowthSummaryInput): Promise<GrowthSummaryResult> => {
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
          { role: 'system', content: SYSTEM_PROMPT },
          { role: 'user', content: JSON.stringify({
            period: input.periodLabel,
            attributeChanges: input.changes,
            completedGoals: input.completedGoals,
            recordCount: input.recordCount,
            highestAttribute: DIMENSION_LABELS[input.highest],
            lowestAttribute: DIMENSION_LABELS[input.lowest],
          }) },
        ],
        temperature: 0.7,
        max_tokens: 400,
        response_format: { type: 'json_object' },
      }),
      signal: controller.signal,
    })

    if (!response.ok) throw new Error(`DeepSeek 返回 ${response.status}`)
    const body = (await response.json()) as {
      choices?: Array<{ message?: { content?: string } }>
    }
    const raw = body.choices?.[0]?.message?.content ?? ''
    const parsed = JSON.parse(raw) as Partial<GrowthSummaryResult>
    const fallback = buildFallback(input)
    const str = (v: unknown): string => (typeof v === 'string' && v.trim() ? v.trim() : '')
    return {
      title: str(parsed.title).slice(0, 30) || fallback.title,
      content: str(parsed.content).slice(0, 300) || fallback.content,
      advice: str(parsed.advice).slice(0, 150) || fallback.advice,
    }
  } finally {
    clearTimeout(timer)
  }
}

/** 生成阶段总结：优先 AI，失败降级规则模板 */
// ===== 秒开缓存：立即返回（新鲜缓存/降级模板），AI 在后台重新生成 =====
interface CachedGrowthSummary {
  value: GrowthSummaryResult
  at: number
}
const summaryCache = new Map<string, CachedGrowthSummary>()
const SUMMARY_TTL_MS = 5 * 60 * 1000

/**
 * 非阻塞版本：页面秒开。
 * - 5 分钟内有缓存 → 直接返回；
 * - 缓存过期 → 返回旧值并后台重新生成（下次请求取到新值）；
 * - 无缓存 → 立即返回规则模板，同时后台生成。
 */
export const getCachedGrowthSummary = (
  cacheKey: string,
  input: GrowthSummaryInput,
): GrowthSummaryResult => {
  const cached = summaryCache.get(cacheKey)
  if (cached && Date.now() - cached.at < SUMMARY_TTL_MS) return cached.value

  if (env.deepseekApiKey) {
    void summarizeByAi(input)
      .then((value) => summaryCache.set(cacheKey, { value, at: Date.now() }))
      .catch(() => undefined)
  }
  return cached ? cached.value : buildFallback(input)
}

export const generateGrowthSummary = async (input: GrowthSummaryInput): Promise<GrowthSummaryResult> => {
  const fallback = buildFallback(input)
  if (!env.deepseekApiKey) return fallback
  try {
    return await summarizeByAi(input)
  } catch (error) {
    console.warn('[growthSummary] AI 生成失败，降级规则模板:', error instanceof Error ? error.message : error)
    return fallback
  }
}
