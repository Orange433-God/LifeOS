import type { GrowthEvent, GrowthEventType } from '../../lib/types'

/** 事件类型 → 圆点颜色 */
const DOT_COLORS: Record<GrowthEventType, string> = {
  milestone: 'bg-gold-400',
  goal_completed: 'bg-emerald-400',
  assessment: 'bg-iris-400',
  record: 'bg-slate-400',
}

interface TimelineProps {
  events: GrowthEvent[]
  onEventClick: (event: GrowthEvent) => void
  /** 展开模式：去掉高度限制，完整展示全部事件 */
  expanded?: boolean
}

/** 人生轨迹时间轴：左侧竖线 + 圆点；收起时限高滚动，展开时完整展示 */
export function Timeline({ events, onEventClick, expanded = false }: TimelineProps) {
  if (events.length === 0) {
    return (
      <p className="rounded-xl border border-[#cfc9e4]/60 bg-white/70 p-5 text-sm text-[#8b84a8]">
        还没有人生轨迹——完成测评、记录里程碑、达成目标都会在这里留下印记。
      </p>
    )
  }

  return (
    <ol
      className={`space-y-5 border-l-2 border-[#cfc9e4] pl-6 ${
        expanded ? '' : 'max-h-[440px] overflow-y-auto'
      }`}
    >
      {events.map((event) => (
        <li key={`${event.type}-${event.id}`} className="relative">
          <span
            className={`absolute -left-[31px] top-1.5 h-3 w-3 rounded-full ${DOT_COLORS[event.type] ?? 'bg-slate-400'} shadow-[0_0_10px_rgba(124,140,248,0.4)]`}
          />
          <button
            type="button"
            onClick={() => onEventClick(event)}
            title={event.type === 'goal_completed' ? '查看目标详情' : event.type === 'record' ? '记录详情页即将开放' : undefined}
            className={`w-full text-left transition ${
              event.type === 'goal_completed' ? 'cursor-pointer hover:opacity-80' : 'cursor-default'
            }`}
          >
            <p className="text-xs text-[#8b84a8]">
              {event.date}
              <span className="ml-2 text-[#8b84a8]">
                {event.icon} {event.source}
              </span>
            </p>
            <p className="mt-0.5 text-sm font-semibold text-[#2c2947]">{event.title}</p>
            {event.description && (
              <p className="mt-0.5 text-xs leading-relaxed text-[#5f5787]">{event.description}</p>
            )}
          </button>
        </li>
      ))}
    </ol>
  )
}
