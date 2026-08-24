import type { Companion } from '../../lib/types'
import companionAvatar from '../../assets/companion-avatar.png'

interface CompanionDisplayProps {
  companion: Companion
  x: number
  y: number
  onClick: () => void
}

/** AI 伙伴：带在线状态点，点击触发占位对话 */
export function CompanionDisplay({ companion, x, y, onClick }: CompanionDisplayProps) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="group absolute -translate-x-1/2 -translate-y-1/2 transition-transform duration-200 hover:scale-110"
      style={{ left: `${x}%`, top: `${y}%` }}
    >
      <span className="relative block">
        <img
          src={companionAvatar}
          alt={companion.name}
          className="h-14 w-14 rounded-full object-cover shadow-[0_8px_24px_rgba(122,135,245,0.45)]"
        />
        <span className="absolute -right-0.5 -top-0.5 h-3.5 w-3.5 rounded-full border-2 border-night-900 bg-emerald-400" />
      </span>
      <span className="pointer-events-none absolute -top-9 left-1/2 -translate-x-1/2 whitespace-nowrap rounded-lg border border-white/10 bg-night-800/90 px-2.5 py-1 text-xs text-slate-200 opacity-0 backdrop-blur transition-opacity group-hover:opacity-100">
        {companion.name} · {companion.relationshipStage}
      </span>
    </button>
  )
}
