import type { RoomLayoutItem } from '../../lib/types'

/** 物品 action → 占位提示文案 */
export const ACTION_TOASTS: Record<string, string> = {
  records: '「人生记录」即将开放 ✨',
  knowledge: '「知识库」即将开放 ✨',
  create: '「创作工坊」即将开放 ✨',
  explore: '「探索足迹」即将开放 ✨',
  memories: '「回忆相册」即将开放 ✨',
  goals: '「目标与行动」即将开放 ✨',
}

interface RoomItemProps {
  item: RoomLayoutItem
  onClick: (item: RoomLayoutItem) => void
}

/** 房间内的家具/装饰物：emoji 图标 + 悬停标签 + 按丰富度渲染点缀 */
export function RoomItem({ item, onClick }: RoomItemProps) {
  const extras = item.extraIcon ? Array.from({ length: item.richness }) : []

  return (
    <button
      type="button"
      onClick={() => onClick(item)}
      className="group absolute -translate-x-1/2 -translate-y-1/2 transition-transform duration-200 hover:scale-110 focus:outline-none"
      style={{ left: `${item.x}%`, top: `${item.y}%` }}
    >
      <span className="relative block text-4xl opacity-0 drop-shadow-[0_6px_14px_rgba(0,0,0,0.5)] transition-opacity duration-200 group-hover:opacity-60 md:text-5xl">
        {item.icon}
        {extras.length > 0 && (
          <span className="absolute -bottom-2 left-1/2 flex -translate-x-1/2 gap-0.5 text-sm drop-shadow">
            {extras.map((_, i) => (
              <span key={i}>{item.extraIcon}</span>
            ))}
          </span>
        )}
      </span>
      {/* 悬停标签 */}
      <span className="pointer-events-none absolute -top-9 left-1/2 -translate-x-1/2 whitespace-nowrap rounded-lg border border-white/10 bg-night-800/90 px-2.5 py-1 text-xs text-slate-200 opacity-0 backdrop-blur transition-opacity group-hover:opacity-100">
        {item.label}
      </span>
    </button>
  )
}
