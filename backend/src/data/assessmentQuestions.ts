// ===== 人生测评题库（阶段 2）=====
// 7 个维度 × 2 题 = 14 题，选项统一为 5 级李克特量表

export type DimensionKey =
  | 'explore'
  | 'learn'
  | 'execute'
  | 'create'
  | 'health'
  | 'connect'
  | 'stable'

export interface AssessmentOption {
  value: number
  label: string
}

export interface AssessmentQuestion {
  id: string
  dimension: DimensionKey
  question: string
}

export const DIMENSIONS: readonly DimensionKey[] = [
  'explore',
  'learn',
  'execute',
  'create',
  'health',
  'connect',
  'stable',
]

/** 维度中文名（与 LifeAttribute 字段一一对应） */
export const DIMENSION_LABELS: Record<DimensionKey, string> = {
  explore: '探索力',
  learn: '学习力',
  execute: '执行力',
  create: '创造力',
  health: '健康力',
  connect: '连接力',
  stable: '稳定力',
}

export const OPTIONS: AssessmentOption[] = [
  { value: 1, label: '完全不符合' },
  { value: 2, label: '不太符合' },
  { value: 3, label: '一般' },
  { value: 4, label: '比较符合' },
  { value: 5, label: '非常符合' },
]

export const QUESTIONS: AssessmentQuestion[] = [
  // explore 探索力
  { id: 'q1', dimension: 'explore', question: '你经常主动尝试从未做过的事情吗？' },
  { id: 'q2', dimension: 'explore', question: '你对未知领域充满好奇，愿意花时间去了解。' },
  // learn 学习力
  { id: 'q3', dimension: 'learn', question: '你会为自己制定明确的学习计划并坚持执行。' },
  { id: 'q4', dimension: 'learn', question: '你习惯从书籍、课程或他人经验中持续获取新知识。' },
  // execute 执行力
  { id: 'q5', dimension: 'execute', question: '你通常能把想法快速转化为行动。' },
  { id: 'q6', dimension: 'execute', question: '你很少拖延，当天计划的事情当天能完成。' },
  // create 创造力
  { id: 'q7', dimension: 'create', question: '你经常产生新颖的创意或解决方案。' },
  { id: 'q8', dimension: 'create', question: '你喜欢通过写作、绘画、设计等方式表达自己。' },
  // health 健康力
  { id: 'q9', dimension: 'health', question: '你保持规律的运动习惯（每周至少 2 次）。' },
  { id: 'q10', dimension: 'health', question: '你的睡眠质量较好，作息相对规律。' },
  // connect 连接力
  { id: 'q11', dimension: 'connect', question: '你善于与他人建立和维持良好的关系。' },
  { id: 'q12', dimension: 'connect', question: '你在团队合作中能感受到归属感。' },
  // stable 稳定力
  { id: 'q13', dimension: 'stable', question: '面对压力时，你能较快调整自己的情绪。' },
  { id: 'q14', dimension: 'stable', question: '你对自己的生活节奏有较强的掌控感。' },
]

/** 优势维度描述 */
export const STRENGTH_DESCRIPTIONS: Record<DimensionKey, string> = {
  explore: '好奇心驱动，敢于拥抱未知的世界',
  learn: '学习力强，善于吸收新知识并内化',
  execute: '行动派，想到就能快速落地',
  create: '创意涌动，常有让人眼前一亮的新点子',
  health: '身心状态良好，活力充沛',
  connect: '人际连接顺畅，富有亲和力',
  stable: '情绪稳定，生活节奏从容有序',
}

/** 挑战维度描述（温和表达） */
export const CHALLENGE_DESCRIPTIONS: Record<DimensionKey, string> = {
  explore: '可以多给自己一些尝试新事物的机会',
  learn: '试试建立更规律的学习节奏',
  execute: '把目标拆小一点，先完成第一步',
  create: '留一些空白时间，让灵感自然生长',
  health: '把运动和规律作息排进日程里',
  connect: '多一次主动，就多一份连接',
  stable: '练习在压力中找回自己的节奏',
}
