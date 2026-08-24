import { useRef, useState } from 'react'
import { Target, X } from 'lucide-react'
import { createGoal, updateGoal } from '../api/goals'
import { getErrorMessage } from '../lib/api'
import {
  CATEGORY_DEFAULT_ATTRIBUTES,
  DIMENSION_LABELS,
  DIMENSION_ORDER,
  GOAL_CATEGORY_META,
  GOAL_PRIORITY_LABELS,
} from '../lib/constants'
import type { Goal, GoalCategory, GoalPriority } from '../lib/types'

interface CreateGoalModalProps {
  onClose: () => void
  onSaved: (goal: Goal) => void
  /** 传入时进入编辑模式 */
  goal?: Goal
}

/**
 * 新建/编辑目标模态框。
 * 分类变化且用户未手动选择提升属性时，自动套用分类默认映射。
 */
export function CreateGoalModal({ onClose, onSaved, goal }: CreateGoalModalProps) {
  const [title, setTitle] = useState(goal?.title ?? '')
  const [description, setDescription] = useState(goal?.description ?? '')
  const [category, setCategory] = useState<GoalCategory>(goal?.category ?? 'study')
  const [priority, setPriority] = useState<GoalPriority>(goal?.priority ?? 'mid')
  const [targetDate, setTargetDate] = useState(
    goal?.targetDate ? goal.targetDate.slice(0, 10) : '',
  )
  const [targetAttributes, setTargetAttributes] = useState<string[]>(goal?.targetAttributes ?? [])
  const [attributesTouched, setAttributesTouched] = useState(!!goal)
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const titleRef = useRef<HTMLInputElement>(null)

  const handleCategoryChange = (value: GoalCategory) => {
    setCategory(value)
    // 未手动选择过属性时，跟随分类默认映射
    if (!attributesTouched) {
      setTargetAttributes(CATEGORY_DEFAULT_ATTRIBUTES[value] ?? [])
    }
  }

  const toggleAttribute = (key: string) => {
    setAttributesTouched(true)
    setTargetAttributes((prev) =>
      prev.includes(key) ? prev.filter((k) => k !== key) : [...prev, key],
    )
  }

  const submit = async () => {
    const trimmed = title.trim()
    if (!trimmed || submitting) return

    setSubmitting(true)
    setError(null)
    try {
      const data = {
        title: trimmed,
        ...(description.trim() ? { description: description.trim() } : {}),
        category,
        priority,
        ...(targetDate ? { targetDate: new Date(`${targetDate}T00:00:00`).toISOString() } : {}),
        targetAttributes,
      }
      const saved = goal ? await updateGoal(goal.id, data) : await createGoal(data)
      onSaved(saved)
    } catch (err) {
      setError(getErrorMessage(err))
      setSubmitting(false)
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center px-4">
      {/* 背景遮罩 */}
      <button
        type="button"
        aria-label="关闭"
        onClick={onClose}
        className="absolute inset-0 cursor-default bg-night-950/60 backdrop-blur-[3px]"
      />

      <div className="glass-panel animate-fade-in relative z-10 max-h-[90vh] w-full max-w-lg overflow-y-auto p-6">
        <header className="flex items-center justify-between">
          <h2 className="flex items-center gap-2 text-lg font-semibold text-white">
            <Target size={18} strokeWidth={1.8} className="text-iris-300" />
            {goal ? '编辑目标' : '新建目标'}
          </h2>
          <button
            type="button"
            onClick={onClose}
            className="rounded-lg p-1.5 text-slate-400 transition hover:bg-white/[0.06] hover:text-white"
          >
            <X size={18} strokeWidth={1.8} />
          </button>
        </header>

        <div className="mt-5 space-y-4">
          <div>
            <label className="mb-1.5 block text-xs text-slate-400">目标标题 *</label>
            <input
              ref={titleRef}
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="如：考研上岸 / 完成一个个人作品集"
              maxLength={50}
              className="w-full rounded-xl border border-white/10 bg-white/[0.05] px-4 py-2.5 text-sm text-slate-200 placeholder-slate-500 outline-none transition focus:border-iris-400/50 focus:ring-2 focus:ring-iris-500/20"
            />
          </div>

          <div>
            <label className="mb-1.5 block text-xs text-slate-400">描述（可选）</label>
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              rows={3}
              maxLength={500}
              placeholder="为什么想达成这个目标？"
              className="w-full resize-none rounded-xl border border-white/10 bg-white/[0.05] px-4 py-2.5 text-sm text-slate-200 placeholder-slate-500 outline-none transition focus:border-iris-400/50 focus:ring-2 focus:ring-iris-500/20"
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="mb-1.5 block text-xs text-slate-400">分类</label>
              <select
                value={category}
                onChange={(e) => handleCategoryChange(e.target.value as GoalCategory)}
                className="w-full rounded-xl border border-white/10 bg-night-800/80 px-3 py-2.5 text-sm text-slate-200 outline-none transition focus:border-iris-400/50"
              >
                {Object.entries(GOAL_CATEGORY_META).map(([key, meta]) => (
                  <option key={key} value={key}>
                    {meta.icon} {meta.label}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="mb-1.5 block text-xs text-slate-400">优先级</label>
              <select
                value={priority}
                onChange={(e) => setPriority(e.target.value as GoalPriority)}
                className="w-full rounded-xl border border-white/10 bg-night-800/80 px-3 py-2.5 text-sm text-slate-200 outline-none transition focus:border-iris-400/50"
              >
                {Object.entries(GOAL_PRIORITY_LABELS).map(([key, label]) => (
                  <option key={key} value={key}>
                    {label}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div>
            <label className="mb-1.5 block text-xs text-slate-400">截止日期（可选）</label>
            <input
              type="date"
              value={targetDate}
              onChange={(e) => setTargetDate(e.target.value)}
              className="w-full rounded-xl border border-white/10 bg-white/[0.05] px-4 py-2.5 text-sm text-slate-200 outline-none transition [color-scheme:dark] focus:border-iris-400/50"
            />
          </div>

          <div>
            <label className="mb-1.5 block text-xs text-slate-400">
              主要提升属性（多选，未选择时按分类自动映射）
            </label>
            <div className="flex flex-wrap gap-2">
              {DIMENSION_ORDER.map((key) => {
                const selected = targetAttributes.includes(key)
                return (
                  <button
                    key={key}
                    type="button"
                    onClick={() => toggleAttribute(key)}
                    className={`rounded-full border px-3 py-1.5 text-xs transition ${
                      selected
                        ? 'border-iris-400/50 bg-iris-500/15 text-iris-300'
                        : 'border-white/10 bg-white/[0.04] text-slate-400 hover:border-iris-400/30 hover:text-slate-200'
                    }`}
                  >
                    {DIMENSION_LABELS[key]}
                  </button>
                )
              })}
            </div>
          </div>

          {error && <p className="text-xs text-red-400">{error}</p>}

          <div className="flex items-center justify-end gap-3 pt-1">
            <button
              type="button"
              onClick={onClose}
              disabled={submitting}
              className="rounded-xl border border-white/10 px-4 py-2 text-sm text-slate-300 transition hover:border-iris-400/40 hover:text-white"
            >
              取消
            </button>
            <button
              type="button"
              onClick={() => void submit()}
              disabled={submitting || !title.trim()}
              className="btn-gradient flex items-center gap-2 disabled:cursor-not-allowed disabled:opacity-40"
            >
              {submitting && (
                <span className="h-3.5 w-3.5 animate-spin rounded-full border-2 border-white/30 border-t-white" />
              )}
              {submitting ? '保存中…' : goal ? '保存修改' : '创建目标'}
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
