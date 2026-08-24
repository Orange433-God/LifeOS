import { Info, ShieldCheck, UserRound, Bell, Database } from 'lucide-react'
import type { LucideIcon } from 'lucide-react'

export type SettingsTabKey = 'profile' | 'notification' | 'privacy' | 'data' | 'about'

const TABS: Array<{ key: SettingsTabKey; label: string; icon: LucideIcon }> = [
  { key: 'profile', label: '个人信息', icon: UserRound },
  { key: 'notification', label: '通知设置', icon: Bell },
  { key: 'privacy', label: '隐私与安全', icon: ShieldCheck },
  { key: 'data', label: '数据管理', icon: Database },
  { key: 'about', label: '关于 LifeOS', icon: Info },
]

interface SettingsSidebarProps {
  active: SettingsTabKey
  onChange: (key: SettingsTabKey) => void
}

/** 设置中心分类导航：内容区顶部的横向 Tab（下划线高亮） */
export function SettingsSidebar({ active, onChange }: SettingsSidebarProps) {
  return (
    <nav className="flex gap-6 overflow-x-auto border-b border-[#cfc9e4]/60">
      {TABS.map((tab) => {
        const selected = tab.key === active
        return (
          <button
            key={tab.key}
            type="button"
            onClick={() => onChange(tab.key)}
            className={`relative flex shrink-0 items-center gap-1.5 pb-2.5 text-sm transition ${
              selected ? 'font-semibold text-white' : 'text-[#5f5787] hover:text-[#3a3652]'
            }`}
          >
            <tab.icon size={15} strokeWidth={1.8} />
            {tab.label}
            {selected && (
              <span className="absolute inset-x-0 -bottom-px h-0.5 rounded-full bg-gradient-to-r from-blue-500 to-purple-500" />
            )}
          </button>
        )
      })}
    </nav>
  )
}
