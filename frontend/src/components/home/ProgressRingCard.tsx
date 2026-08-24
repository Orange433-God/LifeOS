import { useNavigate } from 'react-router-dom'

interface ProgressRingCardProps {
  /** 进行中目标平均进度 0-100 */
  avgProgress: number
  activeGoalsCount: number
  /** 本周完成的行动数 */
  weekCompletedActions: number
}

/** 目标总进度环卡（深色玻璃卡 + 橙色渐变环） */
export function ProgressRingCard({ avgProgress, activeGoalsCount, weekCompletedActions }: ProgressRingCardProps) {
  const navigate = useNavigate()

  const R = 46
  const C = 2 * Math.PI * R
  const pct = Math.max(0, Math.min(100, Math.round(avgProgress)))
  const offset = C * (1 - pct / 100)

  return (
    <button
      type="button"
      onClick={() => navigate('/goals')}
      className="home-dark-card w-full p-3.5 text-left transition hover:bg-white/[0.07]"
    >
      <div className="flex items-center justify-between">
        <p className="text-sm font-medium text-slate-100">目标总进度</p>
        <span className="text-xs text-slate-300">查看目标 →</span>
      </div>

      {/* 渐变环（居中） */}
      <div className="mt-1.5 flex justify-center">
        <svg width="116" height="116" viewBox="0 0 116 116">
          <defs>
            <linearGradient id="ringGrad" x1="0" y1="0" x2="1" y2="1">
              <stop offset="0%" stopColor="#ffb35c" />
              <stop offset="100%" stopColor="#ff8a5c" />
            </linearGradient>
          </defs>
          <circle cx="58" cy="58" r={R} fill="none" stroke="#33334a" strokeWidth="11" />
          <circle
            cx="58"
            cy="58"
            r={R}
            fill="none"
            stroke="url(#ringGrad)"
            strokeWidth="11"
            strokeLinecap="round"
            strokeDasharray={C}
            strokeDashoffset={offset}
            transform="rotate(-90 58 58)"
          />
          <text x="58" y="54" textAnchor="middle" fill="#fff" fontSize="22" fontWeight="600">
            {pct}%
          </text>
          <text x="58" y="72" textAnchor="middle" fill="#cbd5e1" fontSize="9">
            进行中 {activeGoalsCount} 个目标
          </text>
        </svg>
      </div>

      {/* 底部统计行 */}
      <div className="mt-1 flex items-center justify-between rounded-xl bg-white/[0.04] px-3 py-1.5">
        <div>
          <p className="text-[10px] text-slate-300">本周完成行动</p>
          <p className="text-sm font-semibold text-slate-100">{weekCompletedActions} 个</p>
        </div>
        <p className="text-[10px] text-slate-300">行动是成长的刻度</p>
      </div>
    </button>
  )
}
