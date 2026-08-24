import { Download, FolderOpen, Heart, Link2 } from 'lucide-react'
import type { ResourceStats } from '../../lib/types'

/** 统计卡片（我的资源/最近下载/我的收藏/资源链接） */
export function StatCards({ stats }: { stats: ResourceStats }) {
  const cards = [
    { label: '我的资源', value: stats.myResources, suffix: '个文件', icon: FolderOpen },
    { label: '最近下载', value: stats.recentDownloads, suffix: '个文件', icon: Download },
    { label: '我的收藏', value: stats.myCollections, suffix: '个资源', icon: Heart },
    { label: '资源链接', value: stats.resourceLinks, suffix: '个链接', icon: Link2 },
  ]

  return (
    <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
      {cards.map((card) => (
        <div key={card.label} className="flex items-center gap-3 rounded-xl border border-[#cfc9e4]/60 bg-white/70 p-4 backdrop-blur-sm">
          <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-gradient-to-br from-blue-500/20 to-purple-500/20 text-iris-600">
            <card.icon size={18} strokeWidth={1.8} />
          </span>
          <div className="min-w-0">
            <p className="text-xl font-bold text-[#2c2947]">{card.value}</p>
            <p className="truncate text-xs text-[#8b84a8]">
              {card.label} · {card.suffix}
            </p>
          </div>
        </div>
      ))}
    </div>
  )
}
