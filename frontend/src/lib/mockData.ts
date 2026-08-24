// ===== 首页仪表盘占位数据 =====
// 仅用于对齐布局；阶段 2 接入真实数据后逐步移除

export interface PlanItem {
  title: string
  done: boolean
}

export const TODAY_PLAN: PlanItem[] = [
  { title: '晨间阅读《山海经》30 分钟', done: true },
  { title: '完成「人生测评」内测问卷', done: false },
  { title: '晚间复盘：记录三件小确幸', done: false },
]

export interface GrowthStat {
  key: string
  label: string
  value: string
  trend: string
  note: string
  /** 进度条百分比 */
  percent: number
}

export const GROWTH_STATS: GrowthStat[] = [
  { key: 'growth', label: '成长值', value: '1,280', trend: '↑12%', note: '本周成长', percent: 72 },
  { key: 'focus', label: '专注时长', value: '4.2h', trend: '↑8%', note: '本周累计', percent: 56 },
]

/** 数字空间完成状态（占位） */
export const SPACE_COMPLETION = 68

/** 用户等级（占位） */
export const USER_LEVEL = { level: 3, title: '探索者', xp: 1280, xpMax: 2000 }

/** AI 伙伴状态（占位，同伴基本信息来自数据库） */
export const COMPANION_STATUS = {
  online: true,
  interactions: 36,
  companyDays: 12,
  intimacy: 45,
  greeting: '今天想先从哪件小事开始？我陪你一起。',
}

/** 心情选项 */
export const MOODS = ['😄', '😊', '😐', '😔', '😴'] as const
