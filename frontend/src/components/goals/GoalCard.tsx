import { GOAL_CATEGORY_META, GOAL_STATUS_LABELS } from '../../lib/constants'
import type { Goal } from '../../lib/types'

interface GoalCardProps {
  goal: Goal
  selected: boolean
  onClick: () => void
}

/** 时间范围：创建日期 ~ 截止日期 */
const timeRange = (goal: Goal): string => {
  const created = new Date(goal.createdAt)
  const start = `${created.getFullYear()}.${String(created.getMonth() + 1).padStart(2, '0')}.${String(created.getDate()).padStart(2, '0')}`
  if (!goal.targetDate) return `${start} ~ 长期`
  const target = new Date(goal.targetDate)
  const end = `${target.getFullYear()}.${String(target.getMonth() + 1).padStart(2, '0')}.${String(target.getDate()).padStart(2, '0')}`
  return `${start} ~ ${end}`
}

const STATUS_DOTS: Record<string, { color: string; text: string }> = {
  active: { color: 'bg-iris-400', text: '稳定推进' },
  paused: { color: 'bg-gold-400', text: GOAL_STATUS_LABELS.paused },
  completed: { color: 'bg-emerald-400', text: GOAL_STATUS_LABELS.completed },
  abandoned: { color: 'bg-slate-500', text: GOAL_STATUS_LABELS.abandoned },
  overdue: { color: 'bg-red-400', text: GOAL_STATUS_LABELS.overdue },
}

/** 完成时系统判定：未超期完成 vs 超期完成 */
const completedLabel = (goal: Goal): string => {
  if (!goal.targetDate || !goal.completedAt) return GOAL_STATUS_LABELS.completed
  return new Date(goal.completedAt) <= new Date(goal.targetDate) ? '未超期完成' : '超期完成'
}

/** 目标卡片：标题 / 时间范围 / 完成 x/y 行动 / 渐变进度条 / 状态圆点 */
export function GoalCard({ goal, selected, onClick }: GoalCardProps) {
  const meta = GOAL_CATEGORY_META[goal.category] ?? GOAL_CATEGORY_META.other!
  const totalActions = goal.actions?.length ?? goal._count?.actions ?? 0
  const doneActions = goal.actions?.filter((a) => a.isCompleted).length ?? 0
  const status = STATUS_DOTS[goal.status] ?? STATUS_DOTS.active!
  const statusText =
    goal.status === 'completed'
      ? completedLabel(goal)
      : goal.status === 'active' && goal.progress < 60
        ? '探索中'
        : status.text

  return (
    <button
      type="button"
      onClick={onClick}
      className={`w-full rounded-xl border bg-white/75 p-4 text-left backdrop-blur-sm transition-all duration-200 hover:scale-[1.02] hover:bg-white ${
        selected ? 'border-iris-400/60 ring-1 ring-iris-400/40' : 'border-[#cfc9e4]/60'
      }`}
    >
      <div className="flex items-start justify-between gap-2">
        <p className="min-w-0 flex-1 truncate font-semibold text-[#2c2947]">{goal.title}</p>
        <span className={`flex shrink-0 items-center gap-1.5 text-[11px] ${
          goal.status === 'completed'
            ? 'text-emerald-500'
            : goal.status === 'paused'
              ? 'text-gold-500'
              : goal.status === 'overdue'
                ? 'text-red-500'
                : 'text-[#5f5787]'
        }`}>
          <span className={`h-1.5 w-1.5 rounded-full ${status.color}`} />
          {statusText}
        </span>
      </div>

      <p className="mt-1 text-sm text-[#8b84a8]">{timeRange(goal)}</p>

      <p className="mt-2 text-sm text-[#5f5787]">
        已完成 {doneActions} / {totalActions} 个行动
        <span className="ml-2 text-[11px] text-[#8b84a8]">
          {meta.icon} {meta.label}
        </span>
      </p>

      <div className="mt-2.5 h-1 rounded-full bg-[#d8d4e8]">
        <div
          className="h-1 rounded-full bg-gradient-to-r from-blue-500 to-purple-500 transition-all duration-500"
          style={{ width: `${Math.min(Math.max(goal.progress, 0), 100)}%` }}
        />
      </div>
    </button>
  )
}
