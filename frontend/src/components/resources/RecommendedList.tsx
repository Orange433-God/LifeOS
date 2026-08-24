import { Download, Eye } from 'lucide-react'
import { RESOURCE_TYPE_META } from '../../lib/constants'
import type { ResourceItem } from '../../lib/types'

interface RecommendedListProps {
  items: ResourceItem[]
  onSelect: (item: ResourceItem) => void
}

/** 精选推荐：横向卡片流 */
export function RecommendedList({ items, onSelect }: RecommendedListProps) {
  if (items.length === 0) {
    return (
      <p className="rounded-xl border border-dashed border-[#b8b2d4] bg-white/60 px-6 py-8 text-center text-sm text-[#8b84a8]">
        还没有精选资源——上传第一份资源，让它被更多人发现吧
      </p>
    )
  }

  return (
    <div className="flex gap-4 overflow-x-auto pb-1">
      {items.map((item) => {
        const meta = RESOURCE_TYPE_META[item.type] ?? RESOURCE_TYPE_META.link!
        return (
          <button
            key={item.id}
            type="button"
            onClick={() => onSelect(item)}
            className="w-64 shrink-0 rounded-xl border border-[#cfc9e4]/60 bg-white/70 p-4 text-left backdrop-blur-sm transition-all duration-200 hover:scale-[1.02] hover:bg-[#d8d4e8]"
          >
            <div className="flex items-start justify-between gap-2">
              <p className="min-w-0 flex-1 truncate font-medium text-[#2c2947]">{item.name}</p>
              <span className="shrink-0 text-lg">{meta.icon}</span>
            </div>
            <p className="mt-1 text-xs text-[#8b84a8]">
              {meta.label} · {item.category}
            </p>
            <p className="mt-1 truncate text-xs text-[#8b84a8]">{item.description ?? '暂无描述'}</p>
            <div className="mt-3 flex items-center justify-between text-[11px] text-[#8b84a8]">
              <span className="truncate">{item.uploaderName ?? '未知用户'}</span>
              <span className="flex shrink-0 items-center gap-2.5">
                <span className="flex items-center gap-1"><Eye size={11} /> {item.viewCount}</span>
                <span className="flex items-center gap-1"><Download size={11} /> {item.downloadCount}</span>
              </span>
            </div>
          </button>
        )
      })}
    </div>
  )
}
