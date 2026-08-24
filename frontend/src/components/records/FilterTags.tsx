import { RECORD_FILTERS } from '../../lib/constants'

interface FilterTagsProps {
  active: string
  onChange: (key: string) => void
}

/** 筛选标签：全部 | 学习 | 工作 | 生活 | 情绪 | 灵感（浅色主题） */
export function FilterTags({ active, onChange }: FilterTagsProps) {
  return (
    <div className="flex flex-wrap gap-2">
      {RECORD_FILTERS.map((filter) => {
        const selected = filter.key === active
        return (
          <button
            key={filter.key}
            type="button"
            onClick={() => onChange(filter.key)}
            className={`rounded-full border px-3 py-1 text-xs transition ${
              selected
                ? 'border-transparent bg-gradient-to-r from-blue-500/85 to-purple-500/85 font-medium text-white'
                : 'border-[#cfc9e4] bg-white/70 text-[#5f5787] hover:text-[#3a3652]'
            }`}
          >
            {filter.label}
          </button>
        )
      })}
    </div>
  )
}
