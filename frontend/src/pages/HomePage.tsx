import { useCallback, useEffect, useState } from 'react'
import { Sidebar } from '../components/Sidebar'
import { GlobalSearch } from '../components/GlobalSearch'
import { HomeHero } from '../components/home/HomeHero'
import { HomeStats } from '../components/home/HomeStats'
import { ProgressRingCard } from '../components/home/ProgressRingCard'
import { BottomDock } from '../components/home/BottomDock'
import mascotNight from '../assets/mascot-night.jpg'
import defaultAvatar from '../assets/dashboard-avatar.png'
import { HomeRightColumn, type MoodInfo, type PlanItem } from '../components/home/HomeRightColumn'
import { QuickRecordModal } from '../components/room/QuickRecordModal'
import { CreateGoalModal } from '../components/CreateGoalModal'
import { getGoals } from '../api/goals'
import { getRecords } from '../api/records'
import { getHistory } from '../api/dashboard'
import { useAuth } from '../context/AuthContext'
import { DIMENSION_ORDER, MOOD_META } from '../lib/constants'
import { COMPANION_STATUS } from '../lib/mockData'
import type { DashboardHistory, DimensionKey, Goal, LifeRecord } from '../lib/types'

// ===== 日期工具（本地时区） =====
function fmtDate(d: Date): string {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
}

const now = new Date()
const TODAY = fmtDate(now)
const WEEK_START = (() => {
  const d = new Date()
  d.setDate(d.getDate() - ((d.getDay() + 6) % 7)) // 周一
  return fmtDate(d)
})()

const WEEK_NAMES = ['日', '一', '二', '三', '四', '五', '六']
const DATE_TEXT = `${now.getMonth() + 1}月${now.getDate()}日 星期${WEEK_NAMES[now.getDay()]}`

/** 关系阶段 → 亲密度等级 */
const STAGE_LEVELS = ['初识', '熟悉', '信任', '默契', '心灵相通']

/** 七维求和 */
function sumAttributes(attrs: { [K in DimensionKey]: number } | null | undefined): number {
  if (!attrs) return 0
  return DIMENSION_ORDER.reduce((sum, key) => sum + (attrs[key] ?? 0), 0)
}

/** 首页：仪表盘布局（浅色侧边栏 + 深色顶栏/内容 + 浅色卡片 + 底部快捷栏） */
export default function HomePage() {
  const { state } = useAuth()
  const [loading, setLoading] = useState(true)
  const [goals, setGoals] = useState<Goal[]>([])
  const [records, setRecords] = useState<LifeRecord[]>([])
  const [history, setHistory] = useState<DashboardHistory | null>(null)
  const [quickOpen, setQuickOpen] = useState(false)
  const [goalOpen, setGoalOpen] = useState(false)

  const fetchData = useCallback(async () => {
    const [goalsRes, recordsRes, historyRes] = await Promise.allSettled([
      getGoals('all'),
      getRecords({ startDate: WEEK_START, endDate: TODAY, limit: 500 }),
      getHistory(2),
    ])
    if (goalsRes.status === 'fulfilled') setGoals(goalsRes.value)
    if (recordsRes.status === 'fulfilled') setRecords(recordsRes.value)
    if (historyRes.status === 'fulfilled') setHistory(historyRes.value)
    setLoading(false)
  }, [])

  useEffect(() => {
    void fetchData()
  }, [fetchData])

  // 路由守卫已保证登录且资料存在，此处兜底返回空
  if (state.status !== 'authed' || !state.profile) return null
  const bundle = state.profile
  const { profile, attributes, companion } = bundle

  // ===== 派生数据 =====

  // 今日计划：行动 dueDate 在今天（未完成），或 completedAt 在今天（已完成）
  const todayActions = goals.flatMap((goal) =>
    (goal.actions ?? []).flatMap((action) => {
      if (action.dueDate?.startsWith(TODAY) && !action.isCompleted) {
        return [{ time: action.dueDate.slice(11, 16), content: action.content, done: false, goalTitle: goal.title }]
      }
      if (action.isCompleted && action.completedAt?.startsWith(TODAY)) {
        return [{ time: action.completedAt.slice(11, 16), content: action.content, done: true, goalTitle: goal.title }]
      }
      return []
    }),
  )
  const planItems: PlanItem[] = todayActions.sort((a, b) => a.time.localeCompare(b.time)).slice(0, 8)
  const planDone = planItems.filter((i) => i.done).length

  // 本周完成的行动数
  const weekCompletedActions = goals
    .flatMap((g) => g.actions ?? [])
    .filter((a) => a.isCompleted && (a.completedAt ?? '') >= WEEK_START).length

  // 目标进度：最近更新的进行中目标 + 平均进度
  const activeGoals = goals.filter((g) => g.status === 'active')
  const avgProgress = activeGoals.length ? Math.round(activeGoals.reduce((s, g) => s + g.progress, 0) / activeGoals.length) : 0
  const latestGoal = [...activeGoals].sort((a, b) => b.updatedAt.localeCompare(a.updatedAt))[0] ?? null
  const focusGoal =
    latestGoal && latestGoal.targetDate
      ? {
          title: latestGoal.title,
          progress: latestGoal.progress,
          daysLeft: Math.max(0, Math.ceil((new Date(latestGoal.targetDate).getTime() - Date.now()) / 86400000)),
        }
      : latestGoal
        ? { title: latestGoal.title, progress: latestGoal.progress, daysLeft: null }
        : null

  // 记录统计与今日心情
  const todayRecords = records.filter((r) => r.recordedAt.startsWith(TODAY)).length
  const latestMoodRecord = [...records].sort((a, b) => b.recordedAt.localeCompare(a.recordedAt)).find((r) => r.mood)
  const mood: MoodInfo = latestMoodRecord?.mood
    ? {
        emoji: MOOD_META[latestMoodRecord.mood]?.emoji ?? '😌',
        label: MOOD_META[latestMoodRecord.mood]?.label ?? '平静',
        quote: latestMoodRecord.rawContent.length > 20 ? `${latestMoodRecord.rawContent.slice(0, 20)}…` : latestMoodRecord.rawContent,
      }
    : { emoji: '😌', label: '平静', quote: null }

  // 成长值：七维总和 + 较昨日变化（无昨日快照则隐藏趋势）
  const growthValue = sumAttributes(attributes)
  let growthTrendPct: number | null = null
  if (history && history.dates.length >= 2) {
    const sumAt = (idx: number) => DIMENSION_ORDER.reduce((s, key) => s + (history[key][idx] ?? 0), 0)
    const prev = sumAt(history.dates.length - 2)
    const curr = sumAt(history.dates.length - 1)
    if (prev > 0) growthTrendPct = Math.round((curr / prev - 1) * 100)
  }

  const companionInfo = {
    name: companion.name,
    level: Math.max(1, STAGE_LEVELS.indexOf(companion.relationshipStage) + 1),
    intimacyPct: COMPANION_STATUS.intimacy,
  }

  const days = Math.max(1, Math.floor((Date.now() - new Date(profile.createdAt).getTime()) / 86400000) + 1)
  const lastRecord = records[0] ?? null

  const handleRefresh = () => {
    void fetchData()
  }

  return (
    <div className="relative flex h-screen overflow-hidden bg-[#e7e4f4]">
      {/* 全页背景图：铺满整个页面（含侧边栏背后），所有显示悬浮其上 */}
      <div className="absolute inset-0" aria-hidden>
        <img src={mascotNight} alt="" className="h-full w-full object-cover" />
        {/* 顶部渐隐（浅薰衣草）：保证顶栏与问候文字可读 */}
        <div className="absolute inset-x-0 top-0 h-48 bg-gradient-to-b from-[#e7e4f4]/80 via-[#e7e4f4]/30 to-transparent" />
        {/* 底部渐隐：让 dock 区更干净 */}
        <div className="absolute inset-x-0 bottom-0 h-32 bg-gradient-to-t from-[#e7e4f4]/70 to-transparent" />
      </div>

      <Sidebar activeKey="home" variant="light" />

      <div className="relative z-10 flex min-w-0 flex-1 flex-col">

        {/* 悬浮顶栏（浅色毛玻璃）：全局搜索 + 日期 + 用户 */}
        <header className="relative z-10 flex h-14 shrink-0 items-center gap-4 border-b border-[#cfc9e4]/60 bg-white/45 px-5 backdrop-blur-md">
          <GlobalSearch placeholder="搜索你的内容、记录、目标.." className="w-full max-w-[320px] min-w-0 px-0 pb-0" light />
          <div className="ml-auto flex shrink-0 items-center gap-3">
            <span className="hidden text-xs text-[#5f5787] sm:inline">{DATE_TEXT}</span>
            <span className="flex h-8 w-8 items-center justify-center overflow-hidden rounded-full bg-gradient-to-br from-iris-500 to-sky-400 text-base">
              <img
                src={profile.avatarUrl || defaultAvatar}
                alt="头像"
                className="h-full w-full object-cover"
              />
            </span>
            <span className="hidden text-sm text-[#3a3652] md:inline">{profile.nickname}</span>
          </div>
        </header>

        {/* 三栏内容 */}
        <main className="relative z-10 min-h-0 flex-1 overflow-y-auto px-6 py-4">
          {loading ? (
            <div className="mx-auto grid max-w-[1400px] grid-cols-1 gap-4 xl:grid-cols-[320px_1fr_310px]">
              {[0, 1, 2].map((i) => (
                <div key={i} className="animate-pulse space-y-4">
                  <div className="home-dark-card h-28" />
                  <div className="home-dark-card h-40" />
                  <div className="home-dark-card h-28" />
                </div>
              ))}
            </div>
          ) : (
            <div className="mx-auto grid max-w-[1400px] grid-cols-1 gap-3 xl:grid-cols-[320px_1fr_310px]">
              {/* 左栏：问候 + 对话卡 + 统计 + 环卡（围绕在人物左侧，不遮挡） */}
              <section className="flex flex-col gap-3">
                <HomeHero
                  nickname={profile.nickname}
                  days={days}
                  companion={companion}
                  lastRecord={lastRecord}
                  onRefresh={handleRefresh}
                />
                <HomeStats
                  todayRecords={todayRecords}
                  weekRecords={records.length}
                  focusGoal={focusGoal}
                  growthValue={growthValue}
                  growthTrendPct={growthTrendPct}
                  focusHours="3.6"
                  focusTrend="↑12%"
                />
                <ProgressRingCard
                  avgProgress={avgProgress}
                  activeGoalsCount={activeGoals.length}
                  weekCompletedActions={weekCompletedActions}
                />
              </section>

              {/* 中栏：完全留空，露出背景与 3D 男孩（任何卡片都不放这里） */}
              <section className="hidden xl:block" aria-hidden />

              {/* 右栏：今日计划 / 今日心情 / AI 伙伴状态（人物右侧） */}
              <section className="min-h-0">
                <HomeRightColumn
                  planItems={planItems}
                  planDone={planDone}
                  planTotal={planItems.length}
                  mood={mood}
                  companionInfo={companionInfo}
                  onQuickRecord={() => setQuickOpen(true)}
                />
              </section>
            </div>
          )}
        </main>

        <div className="relative z-10">
          <BottomDock onQuickRecord={() => setQuickOpen(true)} onNewGoal={() => setGoalOpen(true)} />
        </div>
      </div>

      {quickOpen && (
        <QuickRecordModal
          onClose={() => setQuickOpen(false)}
          onSaved={() => {
            setQuickOpen(false)
            handleRefresh()
          }}
        />
      )}
      {goalOpen && (
        <CreateGoalModal
          onClose={() => setGoalOpen(false)}
          onSaved={() => {
            setGoalOpen(false)
            handleRefresh()
          }}
        />
      )}
    </div>
  )
}
