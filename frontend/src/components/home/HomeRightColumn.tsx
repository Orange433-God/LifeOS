import { useNavigate } from 'react-router-dom'
import companionAvatar from '../../assets/companion-avatar.png'

export interface PlanItem {
  /** HH:mm */
  time: string
  content: string
  done: boolean
  goalTitle: string
}

export interface MoodInfo {
  emoji: string
  label: string
  quote: string | null
}

export interface CompanionInfo {
  name: string
  level: number
  intimacyPct: number
}

interface HomeRightColumnProps {
  planItems: PlanItem[]
  planDone: number
  planTotal: number
  mood: MoodInfo
  companionInfo: CompanionInfo
  onQuickRecord: () => void
}

/** 右侧栏：今日计划 / 今日心情 / AI 伙伴状态 三张浅色卡 */
export function HomeRightColumn({
  planItems,
  planDone,
  planTotal,
  mood,
  companionInfo,
  onQuickRecord,
}: HomeRightColumnProps) {
  const navigate = useNavigate()

  // 小环：亲密度
  const r = 26
  const c = 2 * Math.PI * r
  const pct = Math.max(0, Math.min(100, Math.round(companionInfo.intimacyPct)))

  return (
    <div className="flex min-h-0 flex-col gap-3">
      {/* ===== 今日计划 ===== */}
      <div className="home-card flex min-h-0 flex-1 flex-col p-3.5">
        <div className="flex items-center justify-between">
          <p className="text-sm font-semibold text-[#2c2947]">今日计划</p>
          <div className="flex items-center gap-2">
            <span className="text-[11px] text-[#47426e]">
              {planTotal > 0 ? `${planDone}/${planTotal} 已完成` : '暂无计划'}
            </span>
            <button
              type="button"
              onClick={() => navigate('/goals')}
              className="text-xs text-[#5f5787] transition hover:text-[#5a52a8]"
            >
              查看全部 »
            </button>
          </div>
        </div>

        {planItems.length === 0 ? (
          <div className="flex flex-1 flex-col items-center justify-center gap-2 py-8 text-center">
            <span className="text-2xl">🗓️</span>
            <p className="text-xs text-[#5f5787]">今天还没有安排行动</p>
            <button
              type="button"
              onClick={() => navigate('/goals')}
              className="rounded-lg bg-[#5a52a8] px-3 py-1.5 text-xs font-medium text-white transition hover:bg-[#4a4394]"
            >
              去新建目标
            </button>
          </div>
        ) : (
          <ul className="mt-2.5 min-h-0 flex-1 space-y-2 overflow-y-auto pr-1">
            {planItems.map((item) => (
              <li key={`${item.time}-${item.content}`} className="flex items-center gap-2.5">
                <span
                  className={`flex h-5 w-5 shrink-0 items-center justify-center rounded-full border text-[10px] ${
                    item.done
                      ? 'border-emerald-400/60 bg-emerald-100 text-emerald-600'
                      : 'border-[#c9c4e0] bg-white/60 text-transparent'
                  }`}
                >
                  {item.done ? '✓' : ''}
                </span>
                <span
                  className={`min-w-0 flex-1 truncate text-xs ${
                    item.done ? 'text-[#756da0] line-through' : 'text-[#2b2847]'
                  }`}
                  title={item.goalTitle}
                >
                  {item.content}
                </span>
                <span className="shrink-0 text-[11px] tabular-nums text-[#5f5787]">{item.time}</span>
              </li>
            ))}
          </ul>
        )}
      </div>

      {/* ===== 今日心情 ===== */}
      <div className="home-card p-3.5">
        <div className="flex items-center justify-between">
          <p className="text-sm font-semibold text-[#2c2947]">今日心情</p>
          <button
            type="button"
            onClick={onQuickRecord}
            className="text-xs text-[#5f5787] transition hover:text-[#5a52a8]"
          >
            记录心情 »
          </button>
        </div>
        <div className="mt-1.5 flex items-center gap-3.5">
          <span className="text-3xl drop-shadow-sm">{mood.emoji}</span>
          <div className="min-w-0">
            <p className="text-[15px] font-semibold text-[#2c2947]">{mood.label}</p>
            <p className="truncate text-xs text-[#5f5787]">{mood.quote ?? '一切都在慢慢变好'}</p>
          </div>
        </div>
      </div>

      {/* ===== AI 伙伴状态 ===== */}
      <div className="home-card p-3.5">
        <div className="flex items-center justify-between">
          <p className="text-sm font-semibold text-[#2c2947]">AI 伙伴状态</p>
          <button
            type="button"
            onClick={() => navigate('/companion')}
            className="text-xs text-[#5f5787] transition hover:text-[#5a52a8]"
          >
            查看详情 »
          </button>
        </div>
        <div className="mt-2 flex items-center gap-3.5">
          <div className="relative shrink-0">
            <svg width="60" height="60" viewBox="0 0 64 64">
              <circle cx="32" cy="32" r={r} fill="none" stroke="#d5d1e8" strokeWidth="6" />
              <circle
                cx="32"
                cy="32"
                r={r}
                fill="none"
                stroke="#ffa35c"
                strokeWidth="6"
                strokeLinecap="round"
                strokeDasharray={c}
                strokeDashoffset={c * (1 - pct / 100)}
                transform="rotate(-90 32 32)"
              />
            </svg>
            {/* 48px 显式尺寸居中：inset 方案会被 preflight 的 img max-width:100%+height:auto 撑成 60px 偏移溢出 */}
            <img
              src={companionAvatar}
              alt="AI 伙伴"
              aria-hidden
              className="absolute left-1/2 top-1/2 h-12 w-12 -translate-x-1/2 -translate-y-1/2 rounded-full object-cover"
            />
          </div>
          <div className="min-w-0">
            <p className="text-sm font-semibold text-[#2c2947]">{companionInfo.name}</p>
            <p className="mt-0.5 text-[11px] text-[#47426e]">
              亲密度 Lv.{companionInfo.level} · {pct}%
            </p>
            <p className="mt-1 truncate text-xs text-[#5f5787]">继续互动，关系会更进一步哦~</p>
          </div>
        </div>
      </div>
    </div>
  )
}
