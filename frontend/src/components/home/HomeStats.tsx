import { useNavigate } from 'react-router-dom'

interface FocusGoal {
  title: string
  progress: number
  /** 距目标日期剩余天数（无目标日期时为 null） */
  daysLeft: number | null
}

interface HomeStatsProps {
  todayRecords: number
  weekRecords: number
  focusGoal: FocusGoal | null
  growthValue: number
  /** 较昨日变化百分比（无快照数据时为 null，隐藏趋势行） */
  growthTrendPct: number | null
  /** 占位：专注时长（专注功能未上线，沿用设计稿数据） */
  focusHours: string
  /** 占位：专注趋势 */
  focusTrend: string
}

interface StatCardProps {
  icon: string
  label: string
  value: string
  sub: string | null
  trend: string | null
  /** down 时用红色徽章（默认绿色） */
  trendTone?: 'up' | 'down'
  onClick: () => void
}

function StatCard({ icon, label, value, sub, trend, trendTone = 'up', onClick }: StatCardProps) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="home-card w-full p-2.5 text-left transition hover:brightness-[1.04]"
    >
      <div className="flex items-center justify-between">
        <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-white/60 text-sm shadow-sm">
          {icon}
        </span>
        {trend && (
          <span
            className={`rounded-full px-1.5 py-0.5 text-[10px] font-medium ${
              trendTone === 'down' ? 'bg-rose-100/80 text-rose-500' : 'bg-emerald-100/80 text-emerald-600'
            }`}
          >
            {trend}
          </span>
        )}
      </div>
      <p className="mt-1.5 text-[10px] text-[#47426e]">{label}</p>
      <p className="mt-0.5 truncate text-[15px] font-semibold text-[#2c2947]">{value}</p>
      {sub && <p className="mt-0.5 truncate text-[11px] text-[#5f5787]">{sub}</p>}
    </button>
  )
}

/** 2×2 统计卡：人生记录 / 目标进度 / 成长值 / 专注时长 */
export function HomeStats(props: HomeStatsProps) {
  const navigate = useNavigate()
  const { todayRecords, weekRecords, focusGoal, growthValue, growthTrendPct, focusHours, focusTrend } = props

  const growthTrend =
    growthTrendPct !== null ? `较昨日 ${growthTrendPct >= 0 ? '↑' : '↓'}${Math.abs(growthTrendPct)}%` : null

  return (
    <div className="grid grid-cols-2 gap-2.5">
      <StatCard
        icon="📝"
        label="人生记录"
        value={`今日记录 ${todayRecords} 条`}
        sub={`本周 ${weekRecords} 条`}
        trend={null}
        onClick={() => navigate('/records')}
      />
      <StatCard
        icon="🎯"
        label="目标进度"
        value={focusGoal ? `${focusGoal.progress}%` : '—'}
        sub={
          focusGoal
            ? `${focusGoal.title}${focusGoal.daysLeft !== null ? ` · 剩余 ${focusGoal.daysLeft} 天` : ''}`
            : '还没有进行中的目标'
        }
        trend={null}
        onClick={() => navigate('/goals')}
      />
      <StatCard
        icon="🌱"
        label="成长值"
        value={`+${growthValue}`}
        sub="七维属性总和"
        trend={growthTrend}
        trendTone={growthTrendPct !== null && growthTrendPct < 0 ? 'down' : 'up'}
        onClick={() => navigate('/dashboard')}
      />
      <StatCard
        icon="⏱️"
        label="专注时长"
        value={`${focusHours} 小时`}
        sub="本周累计"
        trend={focusTrend}
        onClick={() => navigate('/growth')}
      />
    </div>
  )
}
