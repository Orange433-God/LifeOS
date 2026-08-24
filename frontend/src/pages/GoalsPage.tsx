import { useCallback, useEffect, useState } from 'react'
import { Plus, RefreshCw, Target } from 'lucide-react'
import { createAction, deleteGoal, getGoalById, getGoals, toggleAction, updateGoal } from '../api/goals'
import { CreateGoalModal } from '../components/CreateGoalModal'
import { ActivityCalendar } from '../components/goals/ActivityCalendar'
import { GoalDetailView } from '../components/goals/GoalDetailView'
import { GoalGrid } from '../components/goals/GoalGrid'
import { GoalTabs, type GoalTabKey } from '../components/goals/GoalTabs'
import { StatsOverview } from '../components/goals/StatsOverview'
import { TrendChart } from '../components/goals/TrendChart'
import { Sidebar } from '../components/Sidebar'
import { useAuth } from '../context/AuthContext'
import { getErrorMessage } from '../lib/api'
import type { Goal, GoalStatus } from '../lib/types'

/** 目标与行动页：Tab 筛选 + 卡片网格 + 内联详情展开 + 统计 + 日历/趋势 */
export default function GoalsPage() {
  const { state } = useAuth()
  const [goals, setGoals] = useState<Goal[]>([])
  const [tab, setTab] = useState<GoalTabKey>('all')
  const [selected, setSelected] = useState<Goal | null>(null)
  const [loading, setLoading] = useState(true)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [createOpen, setCreateOpen] = useState(false)

  const load = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      setGoals(await getGoals(tab))
    } catch (err) {
      setError(getErrorMessage(err))
    } finally {
      setLoading(false)
    }
  }, [tab])

  useEffect(() => {
    void load()
  }, [load])

  if (state.status !== 'authed' || !state.profile) return null

  /** 点击卡片：拉取详情并展开 */
  const handleSelect = async (goal: Goal) => {
    try {
      setSelected(await getGoalById(goal.id))
      setError(null)
    } catch (err) {
      setError(getErrorMessage(err))
    }
  }

  /** 勾选行动：乐观更新 → 接口 → 失败回滚 */
  const handleToggleAction = async (actionId: string) => {
    if (!selected || busy) return
    const snapshot = selected
    const flip = (g: Goal | null): Goal | null =>
      g
        ? {
            ...g,
            actions: g.actions?.map((a) =>
              a.id === actionId ? { ...a, isCompleted: !a.isCompleted, completedAt: a.isCompleted ? null : new Date().toISOString() } : a,
            ),
          }
        : g

    setSelected(flip(snapshot))
    setGoals((prev) => prev.map((g) => (g.id === snapshot.id ? flip(g)! : g)))
    setBusy(true)
    try {
      const { progress } = await toggleAction(actionId)
      setSelected((prev) => (prev ? { ...prev, progress } : prev))
      setGoals((prev) => prev.map((g) => (g.id === snapshot.id ? { ...g, progress } : g)))
      setError(null)
    } catch (err) {
      setSelected(snapshot) // 回滚
      setGoals((prev) => prev.map((g) => (g.id === snapshot.id ? snapshot : g)))
      setError(getErrorMessage(err))
    } finally {
      setBusy(false)
    }
  }

  /** 添加行动 */
  const handleAddAction = async (content: string) => {
    if (!selected) return
    setBusy(true)
    setError(null)
    try {
      const { action, progress } = await createAction(selected.id, content)
      setSelected((prev) =>
        prev && action
          ? { ...prev, progress, actions: [...(prev.actions ?? []), action] }
          : prev,
      )
      setGoals((prev) =>
        prev.map((g) =>
          g.id === selected.id && action
            ? { ...g, progress, actions: [...(g.actions ?? []), action] }
            : g,
        ),
      )
    } catch (err) {
      setError(getErrorMessage(err))
    } finally {
      setBusy(false)
    }
  }

  /** 状态操作：完成/取消/暂缓/延期/恢复（人工判定） */
  const handleUpdateGoal = async (data: { status?: GoalStatus; targetDate?: string }) => {
    if (!selected || busy) return
    setBusy(true)
    setError(null)
    try {
      const updated = await updateGoal(selected.id, data)
      setSelected(updated)
      await load()
    } catch (err) {
      setError(getErrorMessage(err))
    } finally {
      setBusy(false)
    }
  }

  /** 删除目标（弹窗确认） */
  const handleDeleteGoal = async () => {
    if (!selected) return
    if (!window.confirm('确定要删除此目标及其所有行动吗？')) return
    setBusy(true)
    setError(null)
    try {
      await deleteGoal(selected.id)
      setSelected(null)
      await load()
    } catch (err) {
      setError(getErrorMessage(err))
    } finally {
      setBusy(false)
    }
  }

  /** 新建成功：刷新列表并自动选中新目标 */
  const handleCreated = async (goal: Goal) => {
    setCreateOpen(false)
    await load()
    setTab('all')
    try {
      setSelected(await getGoalById(goal.id))
    } catch {
      // 选中失败不阻塞
    }
  }

  return (
    <div className="flex h-screen overflow-hidden bg-[#ece9f7]">
      <Sidebar activeKey="goals" variant="light" />

      <main className="min-w-0 flex-1 overflow-y-auto p-6 lg:p-8">
        {/* 标题 + 新建按钮 */}
        <header className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-semibold text-[#2c2947]">目标与行动</h1>
            <p className="mt-1 text-sm text-[#5f5787]">将大目标拆解成可执行的小行动，一步步实现成长</p>
          </div>
          <button type="button" onClick={() => setCreateOpen(true)} className="btn-gradient flex items-center gap-1.5">
            <Plus size={16} strokeWidth={2} />
            新建目标
          </button>
        </header>

        {/* 状态筛选 Tab */}
        <div className="mt-6">
          <GoalTabs active={tab} onChange={setTab} />
        </div>

        {/* 统计概览四卡 */}
        {!loading && goals.length > 0 && (
          <div className="mt-5">
            <StatsOverview goals={goals} />
          </div>
        )}

        {/* 主体：左目标列表 + 右详情面板 */}
        <div className="mt-5 grid grid-cols-1 gap-5 pb-6 xl:grid-cols-[1fr_380px]">
          {/* 左：目标卡片网格 */}
          <div>
            {loading ? (
              <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                {[0, 1, 2].map((i) => (
                  <div key={i} className="h-[132px] animate-pulse rounded-xl bg-white/60" />
                ))}
              </div>
            ) : error && goals.length === 0 ? (
              <div className="flex flex-col items-center gap-3 py-10 text-center">
                <p className="text-[#3a3652]">{error}</p>
                <button type="button" onClick={() => void load()} className="btn-gradient flex items-center gap-1.5">
                  <RefreshCw size={15} />
                  重试
                </button>
              </div>
            ) : goals.length === 0 ? (
              <div className="flex flex-col items-center gap-3 py-10 text-center">
                <Target size={40} strokeWidth={1.2} className="text-[#8b84a8]" />
                <p className="text-sm text-[#8b84a8]">还没有目标，点击「新建目标」或下方占位卡开始吧</p>
              </div>
            ) : (
              <GoalGrid
                goals={goals}
                selectedId={selected?.id ?? null}
                onSelect={(goal) => void handleSelect(goal)}
                onCreate={() => setCreateOpen(true)}
              />
            )}
          </div>

          {/* 右：选中目标的详情面板（行动计划 + 活动日历 + 趋势） */}
          <aside className="min-w-0 space-y-4">
            {selected ? (
              <>
                <GoalDetailView
                  goal={selected}
                  busy={busy}
                  onToggleAction={(id) => void handleToggleAction(id)}
                  onAddAction={handleAddAction}
                  onDeleteGoal={() => void handleDeleteGoal()}
                  onUpdateGoal={(data) => void handleUpdateGoal(data)}
                />
                <ActivityCalendar actions={selected.actions ?? []} />
                <TrendChart actions={selected.actions ?? []} />
              </>
            ) : (
              <div className="flex flex-col items-center justify-center gap-2 rounded-2xl border border-[#cfc9e4]/60 bg-white/60 px-4 py-16 text-center">
                <span className="text-2xl">🎯</span>
                <p className="text-sm text-[#8b84a8]">选择左侧目标查看行动详情</p>
              </div>
            )}
          </aside>
        </div>

        {error && <p className="pb-4 text-center text-xs text-red-500">{error}</p>}
      </main>

      {/* 新建目标模态框 */}
      {createOpen && (
        <CreateGoalModal
          onClose={() => setCreateOpen(false)}
          onSaved={(goal) => void handleCreated(goal)}
        />
      )}
    </div>
  )
}
