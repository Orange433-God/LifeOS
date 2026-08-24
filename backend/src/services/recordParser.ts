import { env } from '../config/env.js'

// ===== 人生记录 AI 整理（DeepSeek 直调 + 本地规则降级）=====

export const RECORD_TYPES = ['daily', 'event', 'idea', 'milestone'] as const
export type RecordType = (typeof RECORD_TYPES)[number]

export const RECORD_MOODS = ['happy', 'sad', 'calm', 'excited', 'tired', 'neutral'] as const
export type RecordMood = (typeof RECORD_MOODS)[number]

export interface ParsedRecord {
  title: string
  type: RecordType
  mood: RecordMood
  tags: string[]
  summary: string
}

const SYSTEM_PROMPT = `你是一个人生记录整理助手。用户输入一段简短的人生记录，请提取以下结构化信息：
- title: 5-10字的简短标题
- type: 从 ['daily','event','idea','milestone'] 中选择最合适的一个
  - daily: 日常流水
  - event: 具体事件（如会议、旅行、考试）
  - idea: 灵感、想法、感悟
  - milestone: 重要里程碑（如毕业、入职、完成大项目）
- mood: 从 ['happy','sad','calm','excited','tired','neutral'] 中选择
- tags: 3-5个关键词标签
- summary: 一句话总结（15-30字）

以 JSON 格式输出，不要有任何额外文字。`

/** 从 AI 输出中提取 JSON 对象（兼容 ```json 代码块与多余文字） */
const extractJson = (text: string): Record<string, unknown> | null => {
  try {
    return JSON.parse(text) as Record<string, unknown>
  } catch {
    const match = text.match(/\{[\s\S]*\}/)
    if (match) {
      try {
        return JSON.parse(match[0]) as Record<string, unknown>
      } catch {
        return null
      }
    }
    return null
  }
}

/** 字段级兜底：AI 缺失/非法字段回落到本地规则的值 */
const sanitize = (raw: Record<string, unknown>, fallback: ParsedRecord): ParsedRecord => {
  const str = (v: unknown): string => (typeof v === 'string' && v.trim() ? v.trim() : '')
  return {
    title: str(raw.title).slice(0, 30) || fallback.title,
    type: RECORD_TYPES.includes(raw.type as RecordType) ? (raw.type as RecordType) : fallback.type,
    mood: RECORD_MOODS.includes(raw.mood as RecordMood) ? (raw.mood as RecordMood) : fallback.mood,
    tags: Array.isArray(raw.tags)
      ? raw.tags.filter((t): t is string => typeof t === 'string' && !!t.trim()).map((t) => t.trim()).slice(0, 5)
      : [],
    summary: str(raw.summary).slice(0, 80) || fallback.summary,
  }
}

/** 本地规则解析（AI 不可用时的降级方案） */
export const parseLocally = (content: string): ParsedRecord => {
  const MOOD_RULES: Array<[RegExp, RecordMood]> = [
    [/开心|高兴|快乐|超棒|很棒|太好了|兴奋/, 'happy'],
    [/激动|热血|燃/, 'excited'],
    [/累|疲惫|困|不想动/, 'tired'],
    [/难过|伤心|哭|低落|沮丧|焦虑|烦/, 'sad'],
    [/平静|安静|放松|悠闲|惬意/, 'calm'],
  ]
  const TYPE_RULES: Array<[RegExp, RecordType]> = [
    [/完成|答辩|毕业|入职|拿到|通过|获奖|里程碑|成功|上岸|签约/, 'milestone'],
    [/想|灵感|点子|创意|感觉|觉得|突然|也许|可能|如果/, 'idea'],
    [/会议|旅行|考试|聚会|面试|比赛|出差|去了|看了|参加了|吃了/, 'event'],
  ]

  const mood = MOOD_RULES.find(([re]) => re.test(content))?.[1] ?? 'neutral'
  const type = TYPE_RULES.find(([re]) => re.test(content))?.[1] ?? 'daily'

  // 简单分词提取关键词：按标点/空白切分，过滤停用词
  const STOPWORDS = new Set([
    '今天', '昨天', '我', '我们', '了', '的', '一个', '一下', '觉得', '感觉',
    '非常', '特别', '真的', '就是', '然后', '因为', '所以', '这个', '那个',
  ])
  const tags = content
    .split(/[，。！？、；：\s…]+/)
    .map((w) => w.trim())
    .filter((w) => w.length >= 2 && w.length <= 8 && !STOPWORDS.has(w))
    .slice(0, 5)

  return {
    title: content.length > 10 ? `${content.slice(0, 10)}…` : content,
    type,
    mood,
    tags: tags.length > 0 ? tags : ['日常'],
    summary: content.length > 20 ? `${content.slice(0, 20)}…` : content,
  }
}

/** 调用 DeepSeek API 解析记录（10 秒超时） */
const parseByAi = async (content: string): Promise<ParsedRecord> => {
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
          { role: 'user', content },
        ],
        temperature: 0.3,
        max_tokens: 300,
        response_format: { type: 'json_object' },
      }),
      signal: controller.signal,
    })

    if (!response.ok) throw new Error(`DeepSeek 返回 ${response.status}`)
    const body = (await response.json()) as {
      choices?: Array<{ message?: { content?: string } }>
    }
    const aiText = body.choices?.[0]?.message?.content ?? ''
    const parsed = extractJson(aiText)
    if (!parsed) throw new Error('AI 输出不是合法 JSON')
    return sanitize(parsed, parseLocally(content))
  } finally {
    clearTimeout(timer)
  }
}

/**
 * 解析一条人生记录：优先 DeepSeek AI，未配置 Key / 超时 / 失败时
 * 自动降级本地规则，保证前端始终能拿到结构化数据。
 */
export const parseRecord = async (content: string): Promise<ParsedRecord> => {
  const local = parseLocally(content)
  if (!env.deepseekApiKey) return local
  try {
    return await parseByAi(content)
  } catch (error) {
    console.warn('[recordParser] AI 解析失败，降级本地规则:', error instanceof Error ? error.message : error)
    return local
  }
}
