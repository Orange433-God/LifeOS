import { RESOURCE_TYPE_META } from '../../lib/constants'
import type { ResourceType } from '../../lib/types'

export type ResourceTabKey = 'all' | ResourceType | 'collected'

const TABS: Array<{ key: ResourceTabKey; label: string }> = [
  { key: 'all', label: '全部资源' },
  { key: 'learning', label: '学习资料' },
  { key: 'template', label: '模板库' },
  { key: 'tool', label: '工具软件' },
  { key: 'material', label: '素材资源' },
  { key: 'book', label: '书籍推荐' },
  { key: 'collected', label: '我的收藏' },
]

interface ResourceTabsProps {
  active: ResourceTabKey
  onChange: (key: ResourceTabKey) => void
}

/** 快捷入口分类 Tab（横向滚动） */
export function ResourceTabs({ active, onChange }: ResourceTabsProps) {
  return (
    <nav className="flex gap-2 overflow-x-auto pb-1">
      {TABS.map((tab) => {
        const selected = tab.key === active
        const icon = tab.key === 'collected' ? '⭐' : tab.key === 'all' ? '🗂️' : RESOURCE_TYPE_META[tab.key]?.icon ?? '📦'
        return (
          <button
            key={tab.key}
            type="button"
            onClick={() => onChange(tab.key)}
            className={`flex shrink-0 items-center gap-1.5 rounded-full px-4 py-1.5 text-sm transition ${
              selected
                ? 'bg-gradient-to-r from-blue-500/80 to-purple-500/80 font-medium text-[#2c2947]'
                : 'border border-[#cfc9e4] bg-[#f0eff9]/80 text-[#5f5787] hover:text-[#3a3652]'
            }`}
          >
            <span>{icon}</span>
            {tab.label}
          </button>
        )
      })}
    </nav>
  )
}
