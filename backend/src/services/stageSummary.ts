import { env } from '../config/env.js'
import type { AttributeSet } from './snapshotService.js'

// ===== AI 人生阶段总结（DeepSeek 直调 + 规则模板降级）=====

export interface StageSummary {
  stage: string
  description: string
  suggestion: string
  /** 变化发现（AI 人生观察 · 第一栏） */
  findings: string
  /** 潜在问题（第二栏） */
  risks: string
  /** 建议方向（第三栏） */
  advice: string
  /** 下一步建议（第四栏，具体可执行） */
  nextStep: string
}

const SYSTEM_PROMPT = `你是一个人生成长教练。根据用户的 7 项人生属性（探索力、学习力、执行力、创造力、健康力、连接力、稳定力）和每项属性的变化量，生成人生观察。
以 JSON 输出以下字段（全部使用中文）：
{"stage": "阶段名称(2-6字)", "description": "状态描述(50-80字)", "suggestion": "总体建议(30字内)",
"findings": "变化发现：指出提升最多的维度，一句话(40字内)",
"risks": "潜在问题：指出下降或最薄弱的维度及影响，一句话(40字内)",
"advice": "建议方向：针对潜在问题给出调整思路，一句话(40字内)",
"nextStep": "下一步建议：本周可执行的一个具体行动，一句话(40字内)"}`

const DIMENSION_LABELS: Record<string, string> = {
  explore: '探索力',
  learn: '学习力',
  execute: '执行力',
  create: '创造力',
  health: '健康力',
  connect: '连接力',
  stable: '稳定力',
}

/** 最高属性 → 阶段名 */
const STAGE_MAP: Record<string, string> = {
  explore: '探索者',
  learn: '学习者',
  execute: '行动者',
  create: '创造者',
  health: '活力者',
  connect: '连接者',
  stable: '稳定者',
}

/** 最低属性 → 通用建议 */
const SUGGESTION_MAP: Record<string, string> = {
  explore: '建议每周安排一次小的新体验，让好奇心带路',
  learn: '建议建立固定的学习节奏，哪怕每天 20 分钟',
  execute: '建议把目标拆小一点，先从 10 分钟的第一步开始',
  create: '建议留出无干扰的创作时间，让灵感落地',
  health: '建议增加轻度运动，从每周两次散步开始',
  connect: '建议本周主动联系一位朋友，聊聊近况',
  stable: '建议练习正念或深呼吸，找回自己的节奏',
}

/** 各维度对应的可执行下一步 */
const NEXT_STEP_MAP: Record<string, string> = {
  explore: '本周尝试一件没做过的小事，并记录感受',
  learn: '本周完成 3 次 20 分钟的学习，固定时间',
  execute: '本周把一个目标拆成 3 个小步骤，先完成第一步',
  create: '本周安排 1 次无干扰的深度创作，并完成一个小作品',
  health: '本周完成 3 次轻度运动，并安排 1 天早睡',
  connect: '本周主动联系一位朋友或家人，聊聊近况',
  stable: '本周睡前练习 3 次深呼吸或正念，找回节奏',
}

/** 规则模板（无 Key / 调用失败时降级） */
const buildFallback = (attributes: AttributeSet, changes?: AttributeSet): StageSummary => {
  const entries = Object.entries(attributes)
  const [maxKey, maxValue] = entries.reduce((a, b) => (b[1] > a[1] ? b : a))
  const [minKey, minValue] = entries.reduce((a, b) => (b[1] < a[1] ? b : a))

  // 变化发现：涨幅最大的维度（无变化时描述稳定）
  const changeEntries = Object.entries(changes ?? {})
  const [gainKey, gainValue] = changeEntries.reduce((a, b) => (b[1] > a[1] ? b : a), ['', 0])
  const [dropKey, dropValue] = changeEntries.reduce((a, b) => (b[1] < a[1] ? b : a), ['', 0])

  return {
    stage: STAGE_MAP[maxKey] ?? '探索者',
    description: `你的${DIMENSION_LABELS[maxKey]}突出（${Math.round(maxValue)}分），${DIMENSION_LABELS[minKey]}还有成长空间（${Math.round(minValue)}分）。`,
    suggestion: SUGGESTION_MAP[minKey] ?? '建议从一件小事开始，慢慢找回节奏',
    findings:
      gainValue > 0
        ? `过去一段时间，「${DIMENSION_LABELS[gainKey]}」提升 +${Math.round(gainValue)} 分，这是很棒的成长趋势！`
        : '各维度保持稳定，继续积累成长数据',
    risks:
      dropValue < 0
        ? `「${DIMENSION_LABELS[dropKey]}」有所下降（${Math.round(dropValue)}），需要关注`
        : `「${DIMENSION_LABELS[minKey]}」相对薄弱（${Math.round(minValue)}分），可以多照顾它`,
    advice: SUGGESTION_MAP[dropValue < 0 ? dropKey : minKey] ?? '从一件小事开始调整，慢慢找回节奏',
    nextStep: NEXT_STEP_MAP[dropValue < 0 ? dropKey : minKey] ?? '本周完成一次小行动，并记录下来',
  }
}

/** 调用 DeepSeek 生成阶段总结（10 秒超时） */
const summarizeByAi = async (attributes: AttributeSet, changes?: AttributeSet): Promise<StageSummary> => {
  const controller = new AbortController()
  const timer = setTimeout(() => controller.abort(), 10_000)

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
          {
            role: 'user',
            content: JSON.stringify({
              当前属性: attributes,
              变化量: changes ?? {},
              说明: '变化量是当前值与基线值的差值（正数=提升，负数=下降，0 或缺失=无数据，请客观描述不要编造具体数字）',
            }),
          },
        ],
        temperature: 0.6,
        max_tokens: 500,
        response_format: { type: 'json_object' },
      }),
      signal: controller.signal,
    })

    if (!response.ok) throw new Error(`DeepSeek 返回 ${response.status}`)
    const body = (await response.json()) as {
      choices?: Array<{ message?: { content?: string } }>
    }
    const raw = body.choices?.[0]?.message?.content ?? ''
    const parsed = JSON.parse(raw) as Partial<StageSummary>

    const fallback = buildFallback(attributes, changes)
    const str = (v: unknown): string => (typeof v === 'string' && v.trim() ? v.trim() : '')
    return {
      stage: str(parsed.stage).slice(0, 20) || fallback.stage,
      description: str(parsed.description).slice(0, 200) || fallback.description,
      suggestion: str(parsed.suggestion).slice(0, 100) || fallback.suggestion,
      findings: str(parsed.findings).slice(0, 120) || fallback.findings,
      risks: str(parsed.risks).slice(0, 120) || fallback.risks,
      advice: str(parsed.advice).slice(0, 120) || fallback.advice,
      nextStep: str(parsed.nextStep).slice(0, 120) || fallback.nextStep,
    }
  } finally {
    clearTimeout(timer)
  }
}

/** 生成人生阶段总结：优先 AI，失败降级规则模板（每次调用都新鲜生成） */
export const generateStageSummary = async (
  attributes: AttributeSet,
  changes?: AttributeSet,
): Promise<StageSummary> => {
  const fallback = buildFallback(attributes, changes)
  if (!env.deepseekApiKey) return fallback
  try {
    return await summarizeByAi(attributes, changes)
  } catch (error) {
    console.warn('[stageSummary] AI 生成失败，降级规则模板:', error instanceof Error ? error.message : error)
    return fallback
  }
}

// ===== 秒开缓存：立即返回（新鲜缓存/降级模板），AI 在后台重新生成 =====
interface CachedSummary {
  value: StageSummary
  at: number
}
const summaryCache = new Map<string, CachedSummary>()
const SUMMARY_TTL_MS = 5 * 60 * 1000

/**
 * 非阻塞版本：页面秒开。
 * - 5 分钟内有缓存 → 直接返回；
 * - 缓存过期 → 返回旧值并后台重新生成（下次请求取到新值）；
 * - 无缓存 → 立即返回规则模板，同时后台生成。
 */
export const getCachedStageSummary = (
  userId: string,
  attributes: AttributeSet,
  changes?: AttributeSet,
): StageSummary => {
  const cached = summaryCache.get(userId)
  if (cached && Date.now() - cached.at < SUMMARY_TTL_MS) return cached.value

  if (env.deepseekApiKey) {
    void summarizeByAi(attributes, changes)
      .then((value) => summaryCache.set(userId, { value, at: Date.now() }))
      .catch(() => undefined)
  }
  return cached ? cached.value : buildFallback(attributes, changes)
}
