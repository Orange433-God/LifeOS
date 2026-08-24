import type { GoalStatus } from '../../lib/types'

export type GoalTabKey = 'all' | GoalStatus

const TABS: Array<{ key: GoalTabKey; label: string }> = [
  { key: 'all', label: '我的目标' },
  { key: 'active', label: '全部行动' },
  { key: 'completed', label: '已完成' },
  { key: 'paused', label: '回顾复盘' },
]

interface GoalTabsProps {
  active: GoalTabKey
  onChange: (key: GoalTabKey) => void
}

/** 状态筛选 Tab：下划线高亮（蓝紫渐变） */
export function GoalTabs({ active, onChange }: GoalTabsProps) {
  return (
    <div className="flex gap-6 border-b border-[#cfc9e4]/60">
      {TABS.map((tab) => {
        const selected = tab.key === active
        return (
          <button
            key={tab.key}
            type="button"
            onClick={() => onChange(tab.key)}
            className={`relative pb-2.5 text-sm transition ${
              selected ? 'font-semibold text-[#2c2947]' : 'text-[#5f5787] hover:text-[#3a3652]'
            }`}
          >
            {tab.label}
            {selected && (
              <span className="absolute inset-x-0 -bottom-px h-0.5 rounded-full bg-gradient-to-r from-blue-500 to-purple-500" />
            )}
          </button>
        )
      })}
    </div>
  )
}
