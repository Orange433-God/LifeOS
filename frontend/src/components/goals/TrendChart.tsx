import {
  CartesianGrid,
  Legend,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts'
import { formatShort, startOfWeek } from './weekUtils'
import type { GoalAction } from '../../lib/types'

interface TrendChartProps {
  actions: GoalAction[]
}

const tooltipStyle = {
  background: '#131B30',
  border: '1px solid rgba(255,255,255,0.12)',
  borderRadius: 12,
  fontSize: 12,
  color: '#E2E8F0',
} as const

/**
 * 趋势折线图：最近 6 周的行动活跃构成（百分比）。
 * - 已完成（蓝）= 该周完成数
 * - 进行中（绿）= 该周新增行动数
 * - 未开始（橙）= 该周到期但未完成的行动数
 * 三项均除以该周行动总量，无活动的周为 0。
 */
export function TrendChart({ actions }: TrendChartProps) {
  const weeks: Array<{ date: string; label: string; done: number; started: number; notStarted: number }> = []
  const thisWeek = startOfWeek(new Date())

  for (let i = 5; i >= 0; i--) {
    const weekStart = new Date(thisWeek.getTime() - i * 7 * 86_400_000)
    const weekEnd = new Date(weekStart.getTime() + 7 * 86_400_000)

    const done = actions.filter((a) => {
      if (!a.completedAt) return false
      const t = new Date(a.completedAt).getTime()
      return t >= weekStart.getTime() && t < weekEnd.getTime()
    }).length
    const started = actions.filter((a) => {
      const t = new Date(a.createdAt).getTime()
      return t >= weekStart.getTime() && t < weekEnd.getTime()
    }).length
    const notStarted = actions.filter((a) => {
      if (!a.dueDate || a.isCompleted) return false
      const t = new Date(a.dueDate).getTime()
      return t >= weekStart.getTime() && t < weekEnd.getTime()
    }).length

    const total = done + started + notStarted
    weeks.push({
      date: weekStart.toISOString(),
      label: formatShort(weekStart),
      done: total > 0 ? Math.round((done / total) * 100) : 0,
      started: total > 0 ? Math.round((started / total) * 100) : 0,
      notStarted: total > 0 ? Math.round((notStarted / total) * 100) : 0,
    })
  }

  return (
    <div className="rounded-2xl border border-[#cfc9e4]/60 bg-white/70 p-5 backdrop-blur-sm">
      <h3 className="text-sm font-medium text-[#2c2947]">行动趋势（近 6 周）</h3>
      <div className="mt-3 h-56">
        <ResponsiveContainer width="100%" height="100%">
          <LineChart data={weeks} margin={{ top: 4, right: 12, bottom: 0, left: -16 }}>
            <CartesianGrid stroke="rgba(255,255,255,0.1)" vertical={false} />
            <XAxis
              dataKey="label"
              tick={{ fill: 'rgba(255,255,255,0.6)', fontSize: 11 }}
              tickLine={false}
              axisLine={{ stroke: 'rgba(255,255,255,0.15)' }}
            />
            <YAxis
              domain={[0, 100]}
              tick={{ fill: 'rgba(255,255,255,0.6)', fontSize: 11 }}
              tickLine={false}
              axisLine={false}
            />
            <Tooltip contentStyle={tooltipStyle} labelStyle={{ color: 'rgba(255,255,255,0.6)' }} />
            <Legend wrapperStyle={{ color: 'rgba(255,255,255,0.6)', fontSize: 12 }} />
            <Line type="monotone" dataKey="done" name="已完成" stroke="#60A5FA" strokeWidth={2} dot={{ r: 2.5 }} />
            <Line type="monotone" dataKey="started" name="进行中" stroke="#4ADE80" strokeWidth={2} dot={{ r: 2.5 }} />
            <Line type="monotone" dataKey="notStarted" name="未开始" stroke="#FB923C" strokeWidth={2} dot={{ r: 2.5 }} />
          </LineChart>
        </ResponsiveContainer>
      </div>
    </div>
  )
}
