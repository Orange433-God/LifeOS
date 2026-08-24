import { ChevronRight } from 'lucide-react'
import { RESOURCE_TYPE_META } from '../../lib/constants'
import type { ResourceCategoryCount, ResourceType } from '../../lib/types'

interface CategoryGridProps {
  categories: ResourceCategoryCount[]
  onSelect: (type: ResourceType) => void
}

/** 资源分类：4 列卡片网格（图标 + 分类名 + 数量 + 右箭头） */
export function CategoryGrid({ categories, onSelect }: CategoryGridProps) {
  return (
    <div className="grid grid-cols-2 gap-4 xl:grid-cols-3">
      {categories.map((category) => {
        const meta = RESOURCE_TYPE_META[category.type] ?? RESOURCE_TYPE_META.link!
        return (
          <button
            key={category.type}
            type="button"
            onClick={() => onSelect(category.type)}
            className="flex items-center gap-3 rounded-xl border border-[#cfc9e4]/60 bg-white/70 p-4 text-left backdrop-blur-sm transition-all duration-200 hover:scale-[1.02] hover:bg-[#d8d4e8]"
          >
            <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-lg bg-gradient-to-br from-blue-500/15 to-purple-500/15 text-xl">
              {meta.icon}
            </span>
            <div className="min-w-0 flex-1">
              <p className="text-sm font-medium text-[#2c2947]">{category.label}</p>
              <p className="text-xs text-[#8b84a8]">{category.count} 个资源</p>
            </div>
            <ChevronRight size={15} strokeWidth={1.8} className="shrink-0 text-[#8b84a8]" />
          </button>
        )
      })}
    </div>
  )
}
