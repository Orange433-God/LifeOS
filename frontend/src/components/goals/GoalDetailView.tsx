import { useState } from 'react'
import { Check, Plus, Trash2 } from 'lucide-react'
import { GOAL_CATEGORY_META, GOAL_STATUS_LABELS } from '../../lib/constants'
import type { Goal, GoalStatus } from '../../lib/types'

interface GoalDetailViewProps {
  goal: Goal
  onToggleAction: (actionId: string) => void
  onAddAction: (content: string) => Promise<void>
  onDeleteGoal: () => void
  /** 状态操作：完成/取消/暂缓/延期/恢复 */
  onUpdateGoal: (data: { status?: GoalStatus; targetDate?: string }) => void
  busy: boolean
}

/** 默认延期日期：当前截止日（或今天）顺延 1 个月，格式 YYYY-MM-DD */
const defaultExtendDate = (goal: Goal): string => {
  const base = goal.targetDate ? new Date(goal.targetDate) : new Date()
  if (base < new Date()) base.setTime(Date.now())
  base.setMonth(base.getMonth() + 1)
  return `${base.getFullYear()}-${String(base.getMonth() + 1).padStart(2, '0')}-${String(base.getDate()).padStart(2, '0')}`
}

/** 选中目标的内联详情：信息 + 行动计划列表 + 行内添加 */
export function GoalDetailView({ goal, onToggleAction, onAddAction, onDeleteGoal, onUpdateGoal, busy }: GoalDetailViewProps) {
  const [newAction, setNewAction] = useState('')
  const [extendOpen, setExtendOpen] = useState(false)
  const [extendDate, setExtendDate] = useState(() => defaultExtendDate(goal))
  const meta = GOAL_CATEGORY_META[goal.category] ?? GOAL_CATEGORY_META.other!
  const actions = goal.actions ?? []

  const submitAction = async () => {
    const content = newAction.trim()
    if (!content || busy) return
    setNewAction('')
    await onAddAction(content)
  }

  return (
    <div className="rounded-2xl border border-iris-400/40 bg-white/75 p-5 backdrop-blur-sm">
      {/* 标题栏 */}
      <div className="flex flex-wrap items-center gap-2">
        <h3 className="min-w-0 flex-1 truncate font-semibold text-[#2c2947]">{goal.title}</h3>
        <span className="rounded-full border border-white/10 bg-[#f0eff9]/80 px-2.5 py-0.5 text-[11px] text-[#3a3652]">
          {meta.icon} {meta.label}
        </span>
        <span className="rounded-full border border-white/10 bg-[#f0eff9]/80 px-2.5 py-0.5 text-[11px] text-[#3a3652]">
          {GOAL_STATUS_LABELS[goal.status]}
        </span>
        <span className="rounded-full border border-white/10 bg-[#f0eff9]/80 px-2.5 py-0.5 text-[11px] text-[#3a3652]">
          行动计划 ({actions.length})
        </span>
        <button
          type="button"
          onClick={onDeleteGoal}
          title="删除目标"
          className="rounded-lg p-1.5 text-[#8b84a8] transition hover:bg-[#f0eff9] hover:text-red-500"
        >
          <Trash2 size={15} strokeWidth={1.8} />
        </button>
      </div>

      {/* 进度条 */}
      <div className="mt-3 flex items-center gap-3">
        <div className="h-1.5 flex-1 rounded-full bg-[#d8d4e8]">
          <div
            className="h-1.5 rounded-full bg-gradient-to-r from-blue-500 to-purple-500 transition-all duration-500"
            style={{ width: `${Math.min(Math.max(goal.progress, 0), 100)}%` }}
          />
        </div>
        <span className="text-sm font-bold text-[#2c2947]">{goal.progress}%</span>
      </div>

      {/* 状态操作：提前完成 / 暂缓 / 延期 / 取消 / 恢复（人工判定） */}
      <div className="mt-3 flex flex-wrap gap-2">
        {(goal.status === 'active' || goal.status === 'overdue' || goal.status === 'paused') && (
          <button
            type="button"
            disabled={busy}
            onClick={() => onUpdateGoal({ status: 'completed' })}
            className="rounded-lg bg-emerald-500 px-3 py-1.5 text-xs font-medium text-white transition hover:bg-emerald-600 disabled:opacity-50"
          >
            ✓ 完成目标
          </button>
        )}
        {(goal.status === 'active' || goal.status === 'overdue') && (
          <button
            type="button"
            disabled={busy}
            onClick={() => onUpdateGoal({ status: 'paused' })}
            className="rounded-lg bg-gold-500 px-3 py-1.5 text-xs font-medium text-white transition hover:bg-gold-600 disabled:opacity-50"
          >
            ⏸ 暂缓
          </button>
        )}
        {(goal.status === 'active' || goal.status === 'overdue' || goal.status === 'paused') && (
          <button
            type="button"
            disabled={busy}
            onClick={() => {
              setExtendDate(defaultExtendDate(goal))
              setExtendOpen((open) => !open)
            }}
            title="自定义延期日期"
            className="rounded-lg bg-sky-500 px-3 py-1.5 text-xs font-medium text-white transition hover:bg-sky-600 disabled:opacity-50"
          >
            ⏱ 延期
          </button>
        )}
        {(goal.status === 'active' || goal.status === 'overdue' || goal.status === 'paused') && (
          <button
            type="button"
            disabled={busy}
            onClick={() => onUpdateGoal({ status: 'abandoned' })}
            className="rounded-lg bg-slate-400 px-3 py-1.5 text-xs font-medium text-white transition hover:bg-slate-500 disabled:opacity-50"
          >
            ✕ 取消目标
          </button>
        )}
        {(goal.status === 'paused' || goal.status === 'completed' || goal.status === 'abandoned') && (
          <button
            type="button"
            disabled={busy}
            onClick={() => onUpdateGoal({ status: 'active' })}
            className="rounded-lg bg-iris-500 px-3 py-1.5 text-xs font-medium text-white transition hover:bg-iris-600 disabled:opacity-50"
          >
            ↻ 恢复进行
          </button>
        )}
      </div>

      {/* 延期日期选择（自定义） */}
      {extendOpen && (
        <div className="animate-fade-in mt-2 flex items-center gap-2 rounded-lg bg-sky-500/10 p-2">
          <span className="text-xs text-sky-600">新截止日期</span>
          <input
            type="date"
            value={extendDate}
            min={new Date().toISOString().slice(0, 10)}
            onChange={(e) => setExtendDate(e.target.value)}
            className="rounded-lg border border-sky-300 bg-white px-2 py-1 text-xs text-[#3a3652] outline-none"
          />
          <button
            type="button"
            disabled={busy || !extendDate}
            onClick={() => {
              onUpdateGoal({ targetDate: new Date(`${extendDate}T23:59:59`).toISOString() })
              setExtendOpen(false)
            }}
            className="rounded-lg bg-sky-500 px-2.5 py-1 text-xs font-medium text-white transition hover:bg-sky-600 disabled:opacity-50"
          >
            确定延期
          </button>
          <button
            type="button"
            onClick={() => setExtendOpen(false)}
            className="text-xs text-[#8b84a8] transition hover:text-[#3a3652]"
          >
            取消
          </button>
        </div>
      )}

      {/* 行动列表 */}
      <ul className="mt-3 max-h-72 divide-y divide-[#e3e0f2] overflow-y-auto">
        {actions.length === 0 && (
          <li className="py-3 text-sm text-[#8b84a8]">还没有行动，在下方添加第一条吧</li>
        )}
        {actions.map((action) => (
          <li key={action.id} className="flex items-center gap-3 py-2.5">
            <button
              type="button"
              onClick={() => onToggleAction(action.id)}
              title={action.isCompleted ? '取消完成' : '标记完成'}
              className={`flex h-5 w-5 shrink-0 items-center justify-center rounded-md border transition ${
                action.isCompleted
                  ? 'border-transparent bg-gradient-to-br from-blue-500 to-purple-500 text-white'
                  : 'border-[#b8b2d4] hover:border-iris-400'
              }`}
            >
              {action.isCompleted && <Check size={12} strokeWidth={3} />}
            </button>
            <span
              className={`min-w-0 flex-1 break-words text-sm ${
                action.isCompleted ? 'text-[#a9a3c4] line-through' : 'text-[#3a3652]'
              }`}
            >
              {action.content}
            </span>
            <span className="shrink-0 text-xs text-[#8b84a8]">
              {action.dueDate ? `截止 ${action.dueDate.slice(0, 10)}` : '—'}
            </span>
          </li>
        ))}
      </ul>

      {/* 行内添加行动 */}
      <div className="mt-3 flex items-center gap-2">
        <Plus size={15} strokeWidth={1.8} className="shrink-0 text-[#8b84a8]" />
        <input
          value={newAction}
          onChange={(e) => setNewAction(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'Enter' && !e.nativeEvent.isComposing) {
              e.preventDefault()
              void submitAction()
            }
          }}
          placeholder="添加行动，Enter 提交"
          maxLength={200}
          className="w-full border-b border-[#cfc9e4] bg-transparent py-1.5 text-sm text-[#3a3652] placeholder-[#8b84a8] outline-none transition focus:border-iris-400/60"
        />
      </div>
    </div>
  )
}
