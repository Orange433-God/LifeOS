import { isSameWeek, WEEKDAY_LABELS, weekdayOf } from './weekUtils'
import type { GoalAction } from '../../lib/types'

interface ActivityCalendarProps {
  actions: GoalAction[]
}

/**
 * 活动日历：本周 7 天（周一至周日）。
 * 每天格子显示 完成/总数，完成率越高填充越深（蓝紫）。
 * 今天高亮边框，周日为休息日（灰色低透明）。
 */
export function ActivityCalendar({ actions }: ActivityCalendarProps) {
  const now = new Date()
  const todayIdx = weekdayOf(now)

  const days = WEEKDAY_LABELS.map((label, index) => {
    const completed = actions.filter(
      (a) => a.completedAt && isSameWeek(new Date(a.completedAt), now) && weekdayOf(new Date(a.completedAt)) === index,
    ).length
    const dueCount = actions.filter(
      (a) => a.dueDate && isSameWeek(new Date(a.dueDate), now) && weekdayOf(new Date(a.dueDate)) === index,
    ).length
    const total = Math.max(completed, dueCount)
    const ratio = total > 0 ? completed / total : 0
    return { label, completed, total, ratio, isToday: index === todayIdx }
  })

  return (
    <div className="rounded-2xl border border-[#cfc9e4]/60 bg-white/70 p-5 backdrop-blur-sm">
      <h3 className="text-sm font-medium text-[#2c2947]">本周活动</h3>
      <div className="mt-3 grid grid-cols-7 gap-1.5">
        {days.map((day) => {
          const intensity = Math.round(day.ratio * 100)
          const isRest = day.label === '周日'
          return (
            <div
              key={day.label}
              className={`flex flex-col items-center rounded-lg border py-2.5 transition ${
                day.isToday ? 'border-iris-400/60' : 'border-[#cfc9e4]/60'
              } ${isRest ? 'opacity-50' : ''}`}
              style={{
                background:
                  day.total > 0
                    ? `rgba(96, 132, 250, ${0.08 + day.ratio * 0.4})`
                    : 'rgba(255,255,255,0.55)',
              }}
            >
              <span className={`text-[11px] ${day.isToday ? 'text-iris-600' : 'text-[#5f5787]'}`}>
                {day.label}
              </span>
              <span className="mt-1 text-xs font-medium text-[#2c2947]">
                {day.completed}/{day.total}
              </span>
              {day.total > 0 && (
                <span className="mt-0.5 text-[10px] text-[#8b84a8]">{intensity}%</span>
              )}
            </div>
          )
        })}
      </div>
      <p className="mt-2 text-[11px] text-[#8b84a8]">颜色越深表示当天完成度越高 · 周日为休息日</p>
    </div>
  )
}
