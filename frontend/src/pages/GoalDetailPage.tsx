import { useCallback, useEffect, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { ArrowLeft, Check, Plus, RefreshCw, Sparkles, Trash2, X } from 'lucide-react'
import {
  breakdownGoal,
  createAction,
  deleteAction,
  deleteGoal,
  getGoalById,
  toggleAction,
} from '../api/goals'
import { CreateGoalModal } from '../components/CreateGoalModal'
import { ResourceSelector } from '../components/resources/ResourceSelector'
import { getRelatedResources, unlinkResource } from '../api/resources'
import { Sidebar } from '../components/Sidebar'
import { useAuth } from '../context/AuthContext'
import { getErrorMessage } from '../lib/api'
import {
  DIMENSION_LABELS,
  GOAL_CATEGORY_META,
  GOAL_PRIORITY_LABELS,
  GOAL_STATUS_LABELS,
  RESOURCE_TYPE_META,
} from '../lib/constants'
import type { DimensionKey, Goal, ResourceItem } from '../lib/types'

/** 目标详情页：信息卡 + 进度 + AI 拆解 + 行动列表管理 */
export default function GoalDetailPage() {
  const { state } = useAuth()
  const navigate = useNavigate()
  const { id } = useParams<{ id: string }>()
  const [goal, setGoal] = useState<Goal | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [editOpen, setEditOpen] = useState(false)

  // AI 拆解
  const [breakdown, setBreakdown] = useState<Array<{ content: string }> | null>(null)
  const [breakdownSelected, setBreakdownSelected] = useState<Set<number>>(new Set())
  const [breaking, setBreaking] = useState(false)
  const [addingBreakdown, setAddingBreakdown] = useState(false)

  // 新增行动
  const [newAction, setNewAction] = useState('')
  const [adding, setAdding] = useState(false)

  // 关联资源
  const [linkedResources, setLinkedResources] = useState<ResourceItem[]>([])
  const [selectorOpen, setSelectorOpen] = useState(false)

  const loadLinked = useCallback(async () => {
    if (!id) return
    try {
      setLinkedResources(await getRelatedResources('goal', id))
    } catch {
      // 关联资源加载失败不阻塞详情页
    }
  }, [id])

  useEffect(() => {
    void loadLinked()
  }, [loadLinked])

  const handleUnlink = async (resourceId: string) => {
    if (!id) return
    try {
      await unlinkResource(resourceId, 'goal', id)
      await loadLinked()
    } catch (err) {
      setError(getErrorMessage(err))
    }
  }

  const load = useCallback(async () => {
    if (!id) return
    setLoading(true)
    setError(null)
    try {
      setGoal(await getGoalById(id))
    } catch (err) {
      setError(getErrorMessage(err))
    } finally {
      setLoading(false)
    }
  }, [id])

  useEffect(() => {
    void load()
  }, [load])

  if (state.status !== 'authed' || !state.profile) return null

  const handleToggle = async (actionId: string) => {
    try {
      const { progress } = await toggleAction(actionId)
      setGoal((prev) =>
        prev
          ? {
              ...prev,
              progress,
              actions: prev.actions?.map((a) =>
                a.id === actionId ? { ...a, isCompleted: !a.isCompleted, completedAt: a.isCompleted ? null : new Date().toISOString() } : a,
              ),
            }
          : prev,
      )
    } catch (err) {
      setError(getErrorMessage(err))
    }
  }

  const handleDeleteAction = async (actionId: string) => {
    try {
      const { progress } = await deleteAction(actionId)
      setGoal((prev) =>
        prev ? { ...prev, progress, actions: prev.actions?.filter((a) => a.id !== actionId) } : prev,
      )
    } catch (err) {
      setError(getErrorMessage(err))
    }
  }

  const handleAddAction = async () => {
    const content = newAction.trim()
    if (!content || adding) return
    setAdding(true)
    setError(null)
    try {
      const { action, progress } = await createAction(id!, content)
      setNewAction('')
      setGoal((prev) =>
        prev && action
          ? { ...prev, progress, actions: [...(prev.actions ?? []), action] }
          : prev,
      )
    } catch (err) {
      setError(getErrorMessage(err))
    } finally {
      setAdding(false)
    }
  }

  const handleBreakdown = async () => {
    if (!goal || breaking) return
    setBreaking(true)
    setError(null)
    setBreakdown(null)
    setBreakdownSelected(new Set())
    try {
      const result = await breakdownGoal(goal.title, goal.description ?? undefined, goal.category)
      setBreakdown(result.actions)
    } catch (err) {
      setError(getErrorMessage(err))
    } finally {
      setBreaking(false)
    }
  }

  const handleAddBreakdown = async () => {
    if (!breakdown || addingBreakdown) return
    setAddingBreakdown(true)
    setError(null)
    try {
      for (const [index, item] of breakdown.entries()) {
        if (breakdownSelected.has(index)) await createAction(id!, item.content)
      }
      setBreakdown(null)
      setBreakdownSelected(new Set())
      await load()
    } catch (err) {
      setError(getErrorMessage(err))
    } finally {
      setAddingBreakdown(false)
    }
  }

  const handleDeleteGoal = async () => {
    if (!goal) return
    if (!window.confirm(`确定删除目标「${goal.title}」吗？其所有行动也会一并删除。`)) return
    try {
      await deleteGoal(goal.id)
      navigate('/goals', { replace: true })
    } catch (err) {
      setError(getErrorMessage(err))
    }
  }

  const meta = GOAL_CATEGORY_META[goal?.category ?? 'other'] ?? GOAL_CATEGORY_META.other!
  const totalActions = goal?.actions?.length ?? 0
  const doneActions = goal?.actions?.filter((a) => a.isCompleted).length ?? 0

  return (
    <div className="night-background flex h-screen overflow-hidden">
      <Sidebar activeKey="goals" />

      <main className="min-w-0 flex-1 overflow-y-auto p-6 lg:p-8">
        {loading ? (
          <div className="space-y-5">
            <div className="h-10 w-64 animate-pulse rounded-xl bg-white/[0.05]" />
            <div className="h-32 animate-pulse rounded-2xl bg-white/[0.05]" />
            <div className="h-64 animate-pulse rounded-2xl bg-white/[0.05]" />
          </div>
        ) : error && !goal ? (
          <div className="mt-16 flex flex-col items-center gap-3 text-center">
            <p className="text-slate-300">{error}</p>
            <div className="flex gap-3">
              <button type="button" onClick={() => void load()} className="btn-gradient flex items-center gap-1.5">
                <RefreshCw size={15} />
                重试
              </button>
              <button
                type="button"
                onClick={() => navigate('/goals')}
                className="rounded-xl border border-white/10 px-4 py-2 text-sm text-slate-300 hover:text-white"
              >
                返回目标列表
              </button>
            </div>
          </div>
        ) : !goal ? null : (
          <div className="mx-auto max-w-3xl">
            {/* 顶部：返回 + 标题 + 编辑/删除 */}
            <header className="flex flex-wrap items-center gap-3">
              <button
                type="button"
                onClick={() => navigate('/goals')}
                className="flex items-center gap-1.5 text-sm text-slate-400 transition hover:text-white"
              >
                <ArrowLeft size={16} strokeWidth={1.8} />
                返回
              </button>
              <h1 className="min-w-0 flex-1 truncate text-xl font-semibold text-white">{goal.title}</h1>
              <button
                type="button"
                onClick={() => setEditOpen(true)}
                className="rounded-xl border border-white/10 px-3 py-1.5 text-xs text-slate-300 transition hover:border-iris-400/40 hover:text-white"
              >
                编辑
              </button>
              <button
                type="button"
                onClick={() => void handleDeleteGoal()}
                title="删除目标"
                className="rounded-xl border border-white/10 p-2 text-slate-400 transition hover:border-red-400/40 hover:text-red-400"
              >
                <Trash2 size={15} strokeWidth={1.8} />
              </button>
            </header>

            {/* 目标信息卡片 */}
            <section className="glass-panel mt-5 p-5">
              <div className="flex flex-wrap items-center gap-2">
                <span className={`rounded-full border px-2.5 py-0.5 text-[11px] ${meta.color}`}>
                  {meta.icon} {meta.label}
                </span>
                <span className="rounded-full border border-white/10 bg-white/[0.05] px-2.5 py-0.5 text-[11px] text-slate-300">
                  优先级：{GOAL_PRIORITY_LABELS[goal.priority]}
                </span>
                <span className="rounded-full border border-white/10 bg-white/[0.05] px-2.5 py-0.5 text-[11px] text-slate-300">
                  {GOAL_STATUS_LABELS[goal.status]}
                </span>
                <span className="rounded-full border border-white/10 bg-white/[0.05] px-2.5 py-0.5 text-[11px] text-slate-300">
                  {goal.targetDate
                    ? `截止：${goal.targetDate.slice(0, 10)}`
                    : '长期目标'}
                </span>
              </div>
              {goal.description && (
                <p className="mt-3 text-sm leading-relaxed text-slate-400">{goal.description}</p>
              )}
              {goal.targetAttributes.length > 0 && (
                <div className="mt-3 flex flex-wrap gap-1.5">
                  {goal.targetAttributes.map((key) => (
                    <span
                      key={key}
                      className="rounded-full border border-iris-400/30 bg-iris-500/10 px-2 py-0.5 text-[11px] text-iris-300"
                    >
                      ↑ {DIMENSION_LABELS[key as DimensionKey] ?? key}
                    </span>
                  ))}
                </div>
              )}
              <div className="mt-4 flex items-center gap-3">
                <div className="h-2 flex-1 rounded-full bg-white/10">
                  <div
                    className="h-2 rounded-full bg-gradient-to-r from-blue-500 to-purple-500"
                    style={{ width: `${Math.min(Math.max(goal.progress, 0), 100)}%` }}
                  />
                </div>
                <span className="text-lg font-bold text-white">{goal.progress}%</span>
              </div>
              <p className="mt-1.5 text-xs text-slate-500">
                已完成 {doneActions}/{totalActions} 个行动
              </p>
            </section>

            {/* AI 拆解建议 */}
            <section className="glass-panel mt-5 p-5">
              <div className="flex items-center justify-between">
                <h2 className="flex items-center gap-2 text-sm font-medium text-white">
                  <Sparkles size={15} strokeWidth={1.8} className="text-gold-400" />
                  AI 拆解建议
                </h2>
                <button
                  type="button"
                  onClick={() => void handleBreakdown()}
                  disabled={breaking}
                  className="flex items-center gap-1.5 rounded-xl border border-iris-400/30 bg-iris-500/10 px-3 py-1.5 text-xs text-iris-300 transition hover:bg-iris-500/20 disabled:opacity-50"
                >
                  {breaking && <span className="h-3 w-3 animate-spin rounded-full border-2 border-iris-300/30 border-t-iris-300" />}
                  {breaking ? '拆解中…' : '✨ 让 AI 拆解目标'}
                </button>
              </div>
              {breakdown && (
                <div className="mt-4 space-y-2">
                  {breakdown.map((item, index) => {
                    const selected = breakdownSelected.has(index)
                    return (
                      <label
                        key={index}
                        className={`flex cursor-pointer items-center gap-3 rounded-xl border px-3 py-2.5 text-sm transition ${
                          selected
                            ? 'border-iris-400/50 bg-iris-500/10 text-white'
                            : 'border-white/[0.06] bg-white/[0.04] text-slate-300 hover:border-iris-400/30'
                        }`}
                      >
                        <input
                          type="checkbox"
                          checked={selected}
                          onChange={() =>
                            setBreakdownSelected((prev) => {
                              const next = new Set(prev)
                              if (next.has(index)) next.delete(index)
                              else next.add(index)
                              return next
                            })
                          }
                          className="h-4 w-4 shrink-0 accent-indigo-500"
                        />
                        {item.content}
                      </label>
                    )
                  })}
                  <button
                    type="button"
                    onClick={() => void handleAddBreakdown()}
                    disabled={breakdownSelected.size === 0 || addingBreakdown}
                    className="btn-gradient flex items-center gap-1.5 disabled:cursor-not-allowed disabled:opacity-40"
                  >
                    {addingBreakdown && (
                      <span className="h-3.5 w-3.5 animate-spin rounded-full border-2 border-white/30 border-t-white" />
                    )}
                    添加所选（{breakdownSelected.size}）
                  </button>
                </div>
              )}
            </section>

            {/* 行动列表 */}
            <section className="glass-panel mt-5 p-5">
              <h2 className="text-sm font-medium text-white">行动清单</h2>
              {totalActions === 0 ? (
                <p className="mt-3 text-sm text-slate-500">
                  还没有行动——用上面的 AI 拆解，或直接在下方添加。
                </p>
              ) : (
                <ul className="mt-3 space-y-2">
                  {goal.actions?.map((action) => (
                    <li
                      key={action.id}
                      className="flex items-center gap-3 rounded-xl border border-white/[0.05] bg-white/[0.04] px-3 py-2.5"
                    >
                      <button
                        type="button"
                        onClick={() => void handleToggle(action.id)}
                        title={action.isCompleted ? '取消完成' : '标记完成'}
                        className={`flex h-5 w-5 shrink-0 items-center justify-center rounded-full border transition ${
                          action.isCompleted
                            ? 'border-transparent bg-gradient-to-br from-blue-500 to-purple-500 text-white'
                            : 'border-slate-500 hover:border-iris-400'
                        }`}
                      >
                        {action.isCompleted && <Check size={12} strokeWidth={3} />}
                      </button>
                      <span
                        className={`min-w-0 flex-1 break-words text-sm ${
                          action.isCompleted ? 'text-slate-500 line-through' : 'text-slate-200'
                        }`}
                      >
                        {action.content}
                      </span>
                      {action.dueDate && (
                        <span className="shrink-0 text-[11px] text-slate-500">
                          {action.dueDate.slice(0, 10)}
                        </span>
                      )}
                      <button
                        type="button"
                        onClick={() => void handleDeleteAction(action.id)}
                        title="删除行动"
                        className="shrink-0 rounded-lg p-1 text-slate-500 transition hover:text-red-400"
                      >
                        <Trash2 size={14} strokeWidth={1.8} />
                      </button>
                    </li>
                  ))}
                </ul>
              )}

              {/* 添加行动 */}
              <div className="mt-4 flex items-center gap-2.5">
                <input
                  value={newAction}
                  onChange={(e) => setNewAction(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' && !e.nativeEvent.isComposing) {
                      e.preventDefault()
                      void handleAddAction()
                    }
                  }}
                  placeholder="+ 添加行动，如：每天背 30 个单词"
                  maxLength={200}
                  className="flex-1 rounded-xl border border-white/10 bg-white/[0.05] px-4 py-2.5 text-sm text-slate-200 placeholder-slate-500 outline-none transition focus:border-iris-400/50 focus:ring-2 focus:ring-iris-500/20"
                />
                <button
                  type="button"
                  onClick={() => void handleAddAction()}
                  disabled={!newAction.trim() || adding}
                  className="btn-gradient flex h-10 w-10 shrink-0 items-center justify-center !rounded-xl disabled:cursor-not-allowed disabled:opacity-40"
                >
                  <Plus size={16} strokeWidth={2} />
                </button>
              </div>
            </section>

            {/* 关联资源 */}
            <section className="glass-panel mt-5 p-5">
              <div className="flex items-center justify-between">
                <h2 className="text-sm font-medium text-white">🔗 关联资源</h2>
                <button
                  type="button"
                  onClick={() => setSelectorOpen(true)}
                  className="rounded-lg border border-iris-400/40 bg-iris-500/10 px-3 py-1.5 text-xs text-iris-300 transition hover:bg-iris-500/20"
                >
                  + 添加资源
                </button>
              </div>
              {linkedResources.length === 0 ? (
                <p className="mt-3 text-sm text-slate-500">还没有关联资源——把学习资料链接到这个目标上吧</p>
              ) : (
                <ul className="mt-3 space-y-2">
                  {linkedResources.map((r) => (
                    <li key={r.id} className="flex items-center gap-3 rounded-xl border border-white/[0.05] bg-white/[0.04] px-3 py-2">
                      <span className="text-lg">{RESOURCE_TYPE_META[r.type]?.icon ?? '📦'}</span>
                      <span className="min-w-0 flex-1 truncate text-sm text-slate-200">{r.name}</span>
                      <span className="shrink-0 text-xs text-slate-500">{r.category}</span>
                      <button
                        type="button"
                        onClick={() => void handleUnlink(r.id)}
                        title="解除关联"
                        className="shrink-0 text-slate-500 transition hover:text-red-400"
                      >
                        <X size={14} strokeWidth={1.8} />
                      </button>
                    </li>
                  ))}
                </ul>
              )}
            </section>

            {error && <p className="mt-4 text-center text-xs text-red-400">{error}</p>}
          </div>
        )}
      </main>

      {/* 编辑模态框 */}
      {editOpen && goal && (
        <CreateGoalModal
          goal={goal}
          onClose={() => setEditOpen(false)}
          onSaved={(updated) => {
            setEditOpen(false)
            setGoal((prev) => (prev ? { ...prev, ...updated } : prev))
          }}
        />
      )}

      {/* 资源选择器 */}
      {selectorOpen && goal && (
        <ResourceSelector
          targetType="goal"
          targetId={goal.id}
          myUserId={state.profile.profile.userId}
          onClose={() => setSelectorOpen(false)}
          onChanged={() => void loadLinked()}
        />
      )}
    </div>
  )
}
