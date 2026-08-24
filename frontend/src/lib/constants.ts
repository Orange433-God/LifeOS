import type { AvatarStyle, DimensionKey } from './types'

// ===== 5 种头像风格（key 与后端一致）=====
export const AVATAR_STYLE_KEYS = ['realistic', 'anime', 'future', 'fantasy', 'minimal'] as const

export interface AvatarStyleMeta {
  key: AvatarStyle
  label: string
  icon: string
  desc: string
  /** 首页头像球使用的 emoji */
  emoji: string
}

export const AVATAR_STYLES: readonly AvatarStyleMeta[] = [
  { key: 'realistic', label: '现实风', icon: '🌿', desc: '真实而温暖', emoji: '🧑‍🦱' },
  { key: 'anime', label: '二次元风', icon: '🎀', desc: '动漫与元气', emoji: '🌸' },
  { key: 'future', label: '未来风', icon: '🚀', desc: '科技与光效', emoji: '🤖' },
  { key: 'fantasy', label: '奇幻风', icon: '🐉', desc: '魔法与传说', emoji: '🔮' },
  { key: 'minimal', label: '极简风', icon: '◽', desc: '留白与线条', emoji: '🌙' },
]

export const avatarStyleOf = (key: string): AvatarStyleMeta | undefined =>
  AVATAR_STYLES.find((s) => s.key === key)

// ===== 5 个偏好标签（值与后端一致）=====
export const PREFERENCE_TAG_KEYS = ['成长', '探索', '创造', '生活', '关系'] as const

export interface PreferenceTagMeta {
  key: (typeof PREFERENCE_TAG_KEYS)[number]
  icon: string
}

export const PREFERENCE_TAGS: readonly PreferenceTagMeta[] = [
  { key: '成长', icon: '🌱' },
  { key: '探索', icon: '🧭' },
  { key: '创造', icon: '✨' },
  { key: '生活', icon: '🏠' },
  { key: '关系', icon: '💞' },
]

export const tagIconOf = (key: string): string =>
  PREFERENCE_TAGS.find((t) => t.key === key)?.icon ?? '🏷️'

export const SLOGAN = '愿此身，行至山海。'

// ===== 七维属性（与后端 dimension 键一致）=====
export const DIMENSION_ORDER: readonly DimensionKey[] = [
  'explore',
  'learn',
  'execute',
  'create',
  'health',
  'connect',
  'stable',
]

export const DIMENSION_LABELS: Record<DimensionKey, string> = {
  explore: '探索力',
  learn: '学习力',
  execute: '执行力',
  create: '创造力',
  health: '健康力',
  connect: '连接力',
  stable: '稳定力',
}

// ===== 人生记录（与后端枚举一致）=====
export const RECORD_TYPE_LABELS: Record<string, string> = {
  daily: '日常',
  event: '事件',
  idea: '灵感',
  milestone: '里程碑',
}

export const RECORD_TYPE_ICONS: Record<string, string> = {
  daily: '🌿',
  event: '📌',
  idea: '💡',
  milestone: '✨',
}

/** 心情 emoji + 中文（与后端 mood 枚举一致） */
export const MOOD_META: Record<string, { emoji: string; label: string }> = {
  happy: { emoji: '😊', label: '开心' },
  sad: { emoji: '😢', label: '难过' },
  calm: { emoji: '😌', label: '平静' },
  excited: { emoji: '🤩', label: '兴奋' },
  tired: { emoji: '😪', label: '疲惫' },
  neutral: { emoji: '😐', label: '一般' },
}

/** 标签 → 颜色（学习蓝/工作橙/生活绿/情绪粉/灵感紫） */
export const TAG_COLOR_MAP: Record<string, string> = {
  学习: 'border-sky-400/30 bg-sky-400/10 text-sky-300',
  工作: 'border-orange-400/30 bg-orange-400/10 text-orange-300',
  生活: 'border-emerald-400/30 bg-emerald-400/10 text-emerald-300',
  情绪: 'border-pink-400/30 bg-pink-400/10 text-pink-300',
  灵感: 'border-purple-400/30 bg-purple-400/10 text-purple-300',
}

/** 记录筛选（标签关键词 + 类型 + 心情） */
export const RECORD_FILTERS: Array<{
  key: string
  label: string
  match: (tags: string[], type: string, mood: string | null) => boolean
}> = [
  { key: 'all', label: '全部', match: () => true },
  {
    key: 'study',
    label: '学习',
    match: (tags) => tags.some((t) => ['学习', '知识', '课程', '读书', '考试', '笔记'].some((w) => t.includes(w) || w.includes(t))),
  },
  {
    key: 'work',
    label: '工作',
    match: (tags) => tags.some((t) => ['工作', '项目', '调研', '会议', '答辩'].some((w) => t.includes(w) || w.includes(t))),
  },
  {
    key: 'life',
    label: '生活',
    match: (tags) => tags.some((t) => ['生活', '日常', '运动', '旅行', '美食', '朋友', '家人', '散步'].some((w) => t.includes(w) || w.includes(t))),
  },
  { key: 'mood', label: '情绪', match: (_tags, _type, mood) => mood !== null && mood !== 'neutral' },
  {
    key: 'idea',
    label: '灵感',
    match: (tags, type) => type === 'idea' || tags.some((t) => ['灵感', '想法', '点子', '创意'].some((w) => t.includes(w) || w.includes(t))),
  },
]

// ===== 目标与行动（与后端枚举一致）=====
export const GOAL_CATEGORY_META: Record<string, { label: string; icon: string; color: string }> = {
  study: { label: '学习', icon: '📚', color: 'text-sky-400 border-sky-400/30 bg-sky-400/10' },
  health: { label: '健康', icon: '💪', color: 'text-emerald-400 border-emerald-400/30 bg-emerald-400/10' },
  career: { label: '职业', icon: '💼', color: 'text-gold-400 border-gold-400/30 bg-gold-400/10' },
  create: { label: '创作', icon: '🎨', color: 'text-purple-400 border-purple-400/30 bg-purple-400/10' },
  life: { label: '生活', icon: '🌿', color: 'text-cyan-400 border-cyan-400/30 bg-cyan-400/10' },
  other: { label: '其他', icon: '📌', color: 'text-slate-400 border-slate-400/30 bg-slate-400/10' },
}

export const GOAL_PRIORITY_LABELS: Record<string, string> = { high: '高', mid: '中', low: '低' }

export const GOAL_STATUS_LABELS: Record<string, string> = {
  active: '进行中',
  paused: '已暂缓',
  completed: '已完成',
  abandoned: '已取消',
  overdue: '超期未完成',
}

/** 分类默认提升属性（与后端 CATEGORY_DEFAULT_ATTRIBUTES 一致） */
export const CATEGORY_DEFAULT_ATTRIBUTES: Record<string, string[]> = {
  study: ['learn', 'execute'],
  health: ['health'],
  career: ['execute', 'connect'],
  create: ['create'],
  life: ['stable', 'health'],
  other: [],
}

// ===== 资源中心（与后端 type 枚举一致）=====
export const RESOURCE_TYPE_META: Record<string, { label: string; icon: string }> = {
  learning: { label: '学习资料', icon: '📚' },
  template: { label: '模板库', icon: '📋' },
  tool: { label: '工具软件', icon: '🛠️' },
  material: { label: '素材资源', icon: '🎨' },
  book: { label: '书籍推荐', icon: '📖' },
  link: { label: '资源链接', icon: '🔗' },
}

export const RESOURCE_CATEGORY_OPTIONS: Record<string, string[]> = {
  learning: ['课程笔记', '学习计划', '考试资料'],
  template: ['设计模板', '简历模板', '计划模板'],
  tool: ['开发工具', '效率工具', '设计工具'],
  material: ['图片素材', '图标素材', '字体素材'],
  book: ['成长类', '技术类', '文学类'],
  link: ['网站收藏', '文章收藏', '视频收藏'],
}

/** 字节 → 可读大小 */
export const formatBytes = (bytes: number | null | undefined): string => {
  if (!bytes || bytes <= 0) return '—'
  if (bytes < 1024) return `${bytes} B`
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`
  if (bytes < 1024 * 1024 * 1024) return `${(bytes / (1024 * 1024)).toFixed(1)} MB`
  return `${(bytes / (1024 * 1024 * 1024)).toFixed(2)} GB`
}
