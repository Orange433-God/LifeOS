import type { LifeAttribute } from '@prisma/client'

// ===== 数字房间布局生成（阶段 3）=====
// 每次请求根据最新七维属性实时计算，不落库——属性变化时房间自动更新。

export interface RoomLayoutItem {
  id: string
  type: string
  label: string
  x: number
  y: number
  icon: string
  action: string | null
  /** 丰富度 1-3：分数越高越丰富（前端渲染更多点缀） */
  richness: number
  /** 点缀图标（按 richness 数量渲染） */
  extraIcon?: string
}

export interface RoomLayoutEnvironment {
  lighting: 'warm' | 'cool' | 'bright'
  windowView: 'city' | 'forest' | 'sea'
}

export interface RoomLayout {
  theme: string
  items: RoomLayoutItem[]
  environment: RoomLayoutEnvironment
}

type AttributeFields = Omit<LifeAttribute, 'id' | 'userId' | 'updatedAt'>

/** 属性分数 → 丰富度（1-3 档） */
const richnessOf = (score: number): number => (score >= 85 ? 3 : score >= 70 ? 2 : 1)

/**
 * 根据七维属性生成房间布局：
 * - 书桌为必现核心物品（人生记录入口）
 * - 其余 7 类物品在对应属性 ≥ 60 时出现
 * - 稳定力 ≥ 70 → 暖色灯光；探索力 ≥ 70 → 窗外为森林/海洋，否则城市
 */
export const buildRoomLayout = (
  attributes: LifeAttribute | null,
  theme = 'modern',
): RoomLayout => {
  const s = (key: keyof AttributeFields): number => attributes?.[key] ?? 0

  const items: RoomLayoutItem[] = [
    // 必现：书桌
    { id: 'desk', type: 'desk', label: '书桌', x: 30, y: 55, icon: '🪑', action: 'records', richness: 1 },
  ]

  // 条件物品：对应属性 ≥ 60 才出现
  if (s('learn') >= 60) {
    items.push({ id: 'bookshelf', type: 'bookshelf', label: '书架', x: 5, y: 15, icon: '📚', action: 'knowledge', richness: richnessOf(s('learn')), extraIcon: '📖' })
  }
  if (s('create') >= 60) {
    items.push({ id: 'art_easel', type: 'creative', label: '画架', x: 75, y: 20, icon: '🎨', action: 'create', richness: richnessOf(s('create')), extraIcon: '🖌️' })
  }
  if (s('explore') >= 60) {
    items.push({ id: 'map', type: 'explore', label: '旅行地图', x: 45, y: 8, icon: '🗺️', action: 'explore', richness: richnessOf(s('explore')), extraIcon: '🧭' })
  }
  if (s('health') >= 60) {
    items.push({ id: 'plant', type: 'health', label: '绿植', x: 85, y: 70, icon: '🌿', action: null, richness: richnessOf(s('health')), extraIcon: '🌱' })
  }
  if (s('connect') >= 60) {
    items.push({ id: 'photo_wall', type: 'memory', label: '照片墙', x: 10, y: 5, icon: '🖼️', action: 'memories', richness: richnessOf(s('connect')), extraIcon: '📷' })
  }
  if (s('stable') >= 60) {
    items.push({ id: 'armchair', type: 'stable', label: '舒适座椅', x: 62, y: 75, icon: '🛋️', action: null, richness: richnessOf(s('stable')), extraIcon: '💡' })
  }
  if (s('execute') >= 60) {
    items.push({ id: 'planner', type: 'execute', label: '计划本', x: 22, y: 48, icon: '📋', action: 'goals', richness: richnessOf(s('execute')), extraIcon: '✅' })
  }

  const environment: RoomLayoutEnvironment = {
    lighting: s('stable') >= 70 ? 'warm' : 'cool',
    windowView: s('explore') >= 70 ? (s('explore') >= 85 ? 'sea' : 'forest') : 'city',
  }

  return { theme, items, environment }
}
