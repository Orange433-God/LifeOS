export type RecordsView = 'timeline' | 'calendar' | 'list' | 'gallery'

const VIEWS: Array<{ key: RecordsView; label: string }> = [
  { key: 'timeline', label: '时间轴' },
  { key: 'calendar', label: '日历视图' },
  { key: 'list', label: '列表视图' },
  { key: 'gallery', label: '相册视图' },
]

interface ViewTabsProps {
  active: RecordsView
  onChange: (view: RecordsView) => void
}

/** 顶部视图切换 Tab（下划线高亮，浅色主题） */
export function ViewTabs({ active, onChange }: ViewTabsProps) {
  return (
    <div className="flex gap-6 border-b border-[#cfc9e4]/70">
      {VIEWS.map((view) => {
        const selected = view.key === active
        return (
          <button
            key={view.key}
            type="button"
            onClick={() => onChange(view.key)}
            className={`relative pb-2.5 text-sm transition ${
              selected ? 'font-semibold text-[#2c2947]' : 'text-[#5f5787] hover:text-[#3a3652]'
            }`}
          >
            {view.label}
            {selected && (
              <span className="absolute inset-x-0 -bottom-px h-0.5 rounded-full bg-gradient-to-r from-blue-500 to-purple-500" />
            )}
          </button>
        )
      })}
    </div>
  )
}
