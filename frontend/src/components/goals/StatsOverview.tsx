import { isSameWeek } from './weekUtils'
import type { Goal } from '../../lib/types'

interface StatsOverviewProps {
  goals: Goal[]
}

/** 统计概览四卡（效果图样式）：进行中目标 | 本周计划行动 | 本周完成行动 | 总体进度 */
export function StatsOverview({ goals }: StatsOverviewProps) {
  const allActions = goals.flatMap((g) => g.actions ?? [])
  const now = new Date()
  const weekStart = new Date(now)
  weekStart.setDate(now.getDate() - ((now.getDay() + 6) % 7))
  weekStart.setHours(0, 0, 0, 0)

  const activeCount = goals.filter((g) => g.status === 'active').length
  const createdThisWeek = goals.filter((g) => new Date(g.createdAt) >= weekStart).length

  const weekPlanned = allActions.filter(
    (a) => a.dueDate && isSameWeek(new Date(a.dueDate), now),
  ).length
  const weekDone = allActions.filter(
    (a) => a.completedAt && isSameWeek(new Date(a.completedAt), now),
  ).length
  const completionRate = weekPlanned > 0 ? Math.round((weekDone / weekPlanned) * 100) : 0

  const totalProgress =
    goals.length > 0 ? Math.round(goals.reduce((sum, g) => sum + g.progress, 0) / goals.length) : 0

  const stats = [
    { label: '进行中目标', value: String(activeCount), sub: createdThisWeek > 0 ? `本周新增 +${createdThisWeek}` : '稳步推进中' },
    { label: '本周计划行动', value: String(weekPlanned), sub: '按计划推进' },
    { label: '本周完成行动', value: String(weekDone), sub: `完成率 ${completionRate}%` },
    { label: '总体进度', value: `${totalProgress}%`, sub: '全部目标平均进度' },
  ]

  return (
    <div className="grid grid-cols-2 gap-4 xl:grid-cols-4">
      {stats.map((s) => (
        <div key={s.label} className="rounded-2xl border border-[#cfc9e4]/60 bg-white/70 p-4 backdrop-blur-sm">
          <p className="text-xs text-[#5f5787]">{s.label}</p>
          <p className="mt-1.5 text-2xl font-bold text-[#2c2947]">{s.value}</p>
          <p className="mt-1 text-[11px] text-[#8b84a8]">{s.sub}</p>
        </div>
      ))}
    </div>
  )
}
