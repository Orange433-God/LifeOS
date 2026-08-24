import { useCallback, useEffect, useId, useRef, useState, type CSSProperties } from 'react'
import { useNavigate } from 'react-router-dom'
import { Compass, HeartPulse, Palette, Plus, RefreshCw, Sprout, Users } from 'lucide-react'
import { getHistory, getOverview } from '../api/dashboard'
import { getRecentRecords } from '../api/records'
import { Sidebar } from '../components/Sidebar'
import { TrendChart } from '../components/growth/TrendChart'
import { useAuth } from '../context/AuthContext'
import { getErrorMessage } from '../lib/api'
import { DIMENSION_LABELS, DIMENSION_ORDER, MOOD_META } from '../lib/constants'
import type { DashboardHistory, DashboardOverview, DimensionKey, LifeRecord } from '../lib/types'
import dashboardBg from '../assets/dashboard-bg.jpg'
import dashboardAvatar from '../assets/dashboard-avatar.png'

// ===== 数据映射说明 =====
// 四核心指标由真实数据推导：
// - 自我成长：学习力(learn) / 执行力(execute) / 目标感 = 进行中目标平均进度
// - 兴趣创造：兴趣探索(explore) / 创造力(create)
// - 生活状态：健康(health) / 作息(stable) / 情绪 = 近期记录 mood 映射均值
// - 人际连接：社交活跃度(connect) / 亲密关系 = 同伴关系阶段映射（初识50/熟悉65/亲密85）

const MOOD_SCORES: Record<string, number> = {
  happy: 80,
  excited: 85,
  calm: 70,
  neutral: 60,
  tired: 40,
  sad: 30,
}

const STAGE_SCORES: Record<string, number> = { 初识: 50, 熟悉: 65, 亲密: 85 }

/** 对比周期（真实切换历史数据范围） */
const PERIODS = [
  { key: '30', label: '近1个月' },
  { key: '180', label: '近6个月' },
  { key: '365', label: '近1年' },
] as const

const PERIOD_CN: Record<string, string> = { '30': '一个月', '180': '三个月', '365': '一年' }

const formatDeadline = (iso: string | null): string => {
  if (!iso) return '长期目标'
  const d = new Date(iso)
  return `目标：${d.getFullYear()}年${d.getMonth() + 1}月`
}

const formatTimelineDate = (iso: string): string => {
  const d = new Date(iso)
  return `${d.getFullYear()}.${String(d.getMonth() + 1).padStart(2, '0')}`
}

const avg = (values: number[]): number =>
  values.length > 0 ? values.reduce((s, v) => s + v, 0) / values.length : 0

const round = (v: number): number => Math.round(v)

/** 深色半透明玻璃卡（全页统一色调） */
const glassCard = 'rounded-2xl border border-white/[0.08] bg-[#1a2240]/55 backdrop-blur-xl'

interface QuadrantItem {
  label: string
  value: number | null
}

interface Quadrant {
  key: string
  title: string
  icon: typeof Sprout
  items: QuadrantItem[]
  historyKeys: DimensionKey[]
}

/** SVG 渐变圆环进度 */
function RingGauge({ score, label, size = 56 }: { score: number; label: string; size?: number }) {
  const gradId = useId()
  const strokeWidth = 7
  const r = (size - strokeWidth) / 2
  const c = 2 * Math.PI * r
  const pct = Math.min(100, Math.max(0, score))
  return (
    <div className="relative shrink-0" style={{ width: size, height: size }}>
      <svg width={size} height={size} className="-rotate-90">
        <defs>
          <linearGradient id={gradId} x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#60A5FA" />
            <stop offset="100%" stopColor="#A78BFA" />
          </linearGradient>
        </defs>
        <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke="rgba(255,255,255,0.12)" strokeWidth={strokeWidth} />
        <circle
          cx={size / 2}
          cy={size / 2}
          r={r}
          fill="none"
          stroke={`url(#${gradId})`}
          strokeWidth={strokeWidth}
          strokeLinecap="round"
          strokeDasharray={`${(c * pct) / 100} ${c}`}
        />
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center">
        <span className="text-base font-bold text-white drop-shadow-[0_1px_4px_rgba(0,0,0,0.7)]">{score}</span>
        <span className="text-[9px] text-slate-300 drop-shadow-[0_1px_3px_rgba(0,0,0,0.7)]">{label}</span>
      </div>
    </div>
  )
}

/** 趋势小标签：绿涨红跌 */
function TrendBadge({ delta }: { delta: number }) {
  if (delta === 0) {
    return <span className="text-[11px] text-slate-300">→ 较上月持平</span>
  }
  const up = delta > 0
  return (
    <span className={`text-[11px] font-medium drop-shadow-[0_1px_3px_rgba(0,0,0,0.7)] ${up ? 'text-emerald-400' : 'text-red-400'}`}>
      {up ? '↑' : '↓'} 较上月 {up ? '+' : ''}
      {delta}
    </span>
  )
}

interface QuadrantView extends Quadrant {
  score: number
  delta: number
}

/** 模块二：透明核心指标卡（无板块背景，位于头像正上/正下/正左/正右；移动端隐藏，避免绝对定位溢出屏幕） */
function BareQuadrant({ q, style }: { q: QuadrantView; style: CSSProperties }) {
  return (
    <div className="absolute hidden w-[170px] xl:block" style={style}>
      <div className="flex items-center gap-2">
        <RingGauge score={q.score} label="/100" />
        <div className="min-w-0">
          <p className="flex items-center gap-1 text-[13px] font-medium text-white drop-shadow-[0_1px_4px_rgba(0,0,0,0.8)]">
            <q.icon size={12} strokeWidth={1.8} className="text-iris-300" />
            {q.title}
          </p>
          <TrendBadge delta={q.delta} />
        </div>
      </div>
      <div className="mt-1.5 flex gap-1.5">
        {q.items.map((item) => (
          <div key={item.label} className="min-w-0 flex-1 text-center">
            <p className="text-sm font-bold text-white drop-shadow-[0_1px_4px_rgba(0,0,0,0.8)]">
              {item.value === null ? '—' : item.value}
            </p>
            <p className="mt-0.5 text-[9px] text-slate-200 drop-shadow-[0_1px_3px_rgba(0,0,0,0.8)]">{item.label}</p>
          </div>
        ))}
      </div>
    </div>
  )
}

/** 背景图（已裁顶 312px）与中央光晕锚点（多阈值质心 0.553,0.459，用户要求上移，当前 0.394） */
const BG_IMG_W = 2432
const BG_IMG_H = 1309
const RING = { x: 0.553, y: 0.394 }

export default function DashboardPage() {
  const { state } = useAuth()
  const navigate = useNavigate()
  const [overview, setOverview] = useState<DashboardOverview | null>(null)
  const [history, setHistory] = useState<DashboardHistory | null>(null)
  const [timelineRecords, setTimelineRecords] = useState<LifeRecord[]>([])
  const [period, setPeriod] = useState<string>('180')
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [toast, setToast] = useState<string | null>(null)

  // 圆环中心在中央区（section）坐标系里的位置：按背景图 object-cover 数学运行时计算
  const rootRef = useRef<HTMLDivElement>(null)
  const centerRef = useRef<HTMLElement>(null)
  const [ringPos, setRingPos] = useState({ x: 330, y: 360 })

  const updateRingPos = useCallback(() => {
    const root = rootRef.current
    const sec = centerRef.current
    if (!root || !sec) return
    const rw = root.clientWidth
    const rh = root.clientHeight
    const scale = Math.max(rw / BG_IMG_W, rh / BG_IMG_H)
    const dispW = BG_IMG_W * scale
    const dispH = BG_IMG_H * scale
    const ox = (dispW - rw) / 2
    const oy = (dispH - rh) / 2
    const rx = RING.x * dispW - ox
    const ry = RING.y * dispH - oy
    const sr = sec.getBoundingClientRect()
    setRingPos({ x: rx - sr.left, y: ry - sr.top })
  }, [])

  useEffect(() => {
    updateRingPos()
    window.addEventListener('resize', updateRingPos)
    const ro = new ResizeObserver(updateRingPos)
    if (rootRef.current) ro.observe(rootRef.current)
    if (centerRef.current) ro.observe(centerRef.current)
    return () => {
      window.removeEventListener('resize', updateRingPos)
      ro.disconnect()
    }
  }, [updateRingPos])

  // 数据加载完成后重算（内容高度变化影响 section 位置）
  useEffect(() => {
    if (!loading) updateRingPos()
  }, [loading, updateRingPos])

  const loadHistory = useCallback(async (days: string) => {
    try {
      const hi = await getHistory(Number(days))
      setHistory(hi)
    } catch {
      // 历史数据失败不阻塞页面主体
    }
  }, [])

  const load = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const [ov, records] = await Promise.all([getOverview(), getRecentRecords(10)])
      setOverview(ov)
      setTimelineRecords(records)
      await loadHistory(period)
    } catch (err) {
      setError(getErrorMessage(err))
    } finally {
      setLoading(false)
    }
  }, [loadHistory, period])

  useEffect(() => {
    void load()
  }, [load])

  // AI 人生观察自动更新：窗口重新聚焦时 + 每 5 分钟轮询（每次都会重新调用 AI 生成最新观察）
  useEffect(() => {
    const onFocus = () => {
      void load()
    }
    window.addEventListener('focus', onFocus)
    const timer = setInterval(() => void load(), 5 * 60 * 1000)
    return () => {
      window.removeEventListener('focus', onFocus)
      clearInterval(timer)
    }
  }, [load])

  useEffect(() => {
    if (!toast) return
    const timer = setTimeout(() => setToast(null), 2500)
    return () => clearTimeout(timer)
  }, [toast])

  const switchPeriod = (key: string) => {
    setPeriod(key)
    void loadHistory(key)
  }

  if (state.status !== 'authed' || !state.profile) return null
  const { profile, companion } = state.profile

  if (loading && !overview) {
    return (
      <div className="flex h-screen overflow-hidden bg-[#0a0f24]">
        <Sidebar activeKey="dashboard" variant="light" />
        <main className="min-w-0 flex-1 space-y-5 overflow-y-auto p-6">
          <div className="animate-pulse rounded-2xl bg-white/[0.05] py-6" />
          <div className="grid gap-5 lg:grid-cols-2">
            {[0, 1, 2, 3].map((i) => (
              <div key={i} className="h-44 animate-pulse rounded-2xl bg-white/[0.05]" />
            ))}
          </div>
        </main>
      </div>
    )
  }

  if (error && !overview) {
    return (
      <div className="flex h-screen overflow-hidden bg-[#0a0f24]">
        <Sidebar activeKey="dashboard" variant="light" />
        <main className="flex min-w-0 flex-1 flex-col items-center justify-center gap-4 px-6 text-center">
          <p className="text-slate-300">{error}</p>
          <button type="button" onClick={() => void load()} className="btn-gradient flex items-center gap-1.5">
            <RefreshCw size={15} />
            重试
          </button>
        </main>
      </div>
    )
  }

  if (!overview || !history) return null

  // ===== 派生数据 =====
  const { currentAttributes, activeGoals, summary } = overview

  const latestMood = overview.recentRecords.find((r) => r.mood)?.mood ?? null
  const moodMeta = latestMood ? MOOD_META[latestMood] : null
  const recentMoods = overview.recentRecords
    .map((r) => (r.mood ? MOOD_SCORES[r.mood] : null))
    .filter((v): v is number => v !== null)
  const moodScore = recentMoods.length > 0 ? round(avg(recentMoods)) : 60

  const goalProgressAvg =
    activeGoals.length > 0 ? round(avg(activeGoals.map((g) => g.progress))) : null

  const quadrants: Quadrant[] = [
    {
      key: 'growth',
      title: '自我成长',
      icon: Sprout,
      historyKeys: ['learn', 'execute'],
      items: [
        { label: '学习力', value: currentAttributes.learn },
        { label: '执行力', value: currentAttributes.execute },
        { label: '目标感', value: goalProgressAvg },
      ],
    },
    {
      key: 'interest',
      title: '兴趣创造',
      icon: Palette,
      historyKeys: ['explore', 'create'],
      items: [
        { label: '兴趣探索', value: currentAttributes.explore },
        { label: '创造力', value: currentAttributes.create },
      ],
    },
    {
      key: 'life',
      title: '生活状态',
      icon: HeartPulse,
      historyKeys: ['health', 'stable'],
      items: [
        { label: '健康', value: currentAttributes.health },
        { label: '作息', value: currentAttributes.stable },
        { label: '情绪', value: moodScore },
      ],
    },
    {
      key: 'connect',
      title: '人际连接',
      icon: Users,
      historyKeys: ['connect'],
      items: [
        { label: '社交活跃度', value: currentAttributes.connect },
        { label: '亲密关系', value: STAGE_SCORES[companion.relationshipStage] ?? 60 },
      ],
    },
  ]

  const quadrantViews: QuadrantView[] = quadrants.map((q) => {
    const values = q.items.map((i) => i.value).filter((v): v is number => v !== null)
    const score = values.length > 0 ? round(avg(values)) : 0
    const last = history.dates.length - 1
    const todayAvg = avg(q.historyKeys.map((k) => history[k][last]!))
    const firstAvg = avg(q.historyKeys.map((k) => history[k][0]!))
    return { ...q, score, delta: round(todayAvg - firstAvg) }
  })

  const lastIdx = history.dates.length - 1
  const diffs = DIMENSION_ORDER.map((key) => ({
    key,
    delta: history[key][lastIdx]! - history[key][0]!,
  }))
  const topGain = diffs.reduce((a, b) => (b.delta > a.delta ? b : a))
  const topDrop = diffs.reduce((a, b) => (b.delta < a.delta ? b : a))
  const lowest = DIMENSION_ORDER.reduce((a, b) =>
    currentAttributes[b] < currentAttributes[a] ? b : a,
  )

  const changeFinding =
    topGain.delta > 0
      ? `过去${PERIOD_CN[period] ?? '一段时间'}，你的「${DIMENSION_LABELS[topGain.key]}」相关行为增加了 ${topGain.delta} 分，这是很棒的成长趋势！`
      : '各维度保持稳定，继续积累成长数据'
  const riskFinding =
    topDrop.delta < 0
      ? `最近你的「${DIMENSION_LABELS[topDrop.key]}」有所下降（${topDrop.delta}），可能影响你的精力和专注度。`
      : `「${DIMENSION_LABELS[lowest]}」相对薄弱（${currentAttributes[lowest]}分），可以多照顾它。`

  const createKeys: DimensionKey[] = ['explore', 'create']
  const createFirst = avg(createKeys.map((k) => history[k][0]!))
  const createLast = avg(createKeys.map((k) => history[k][lastIdx]!))
  const createPct = createFirst > 0 ? round(((createLast - createFirst) / createFirst) * 100) : 0
  const trendSummary = `过去${PERIOD_CN[period] ?? '一段时间'}，创造相关行为累计${createPct >= 0 ? '增加' : '减少'} ${Math.abs(createPct)}%，整体成长势头${createPct >= 5 ? '良好' : createPct <= -5 ? '需要关注' : '平稳'}。`

  const now = new Date()
  const dateText = `${now.getFullYear()}年${now.getMonth() + 1}月${now.getDate()}日`
  const updateText = `今天${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`
  // 长周期按周抽样，避免趋势图点数过密（近1个月保持按天）
  const sampleStep = period === '30' ? 1 : 7
  const pick = <T,>(arr: T[]): T[] => arr.filter((_, i) => i % sampleStep === 0 || i === arr.length - 1)
  const trends = {
    labels: pick(history.dates),
    explore: pick(history.explore),
    learn: pick(history.learn),
    execute: pick(history.execute),
    create: pick(history.create),
    health: pick(history.health),
    connect: pick(history.connect),
    stable: pick(history.stable),
  }

  const goalBarColor = (p: number) => (p >= 60 ? 'bg-emerald-400' : p >= 20 ? 'bg-orange-400' : 'bg-gold-400')
  const goalStatusLabel = (p: number) => (p >= 60 ? '稳定推进' : p >= 20 ? '探索中' : '刚起步')

  return (
    <div ref={rootRef} className="relative flex h-screen overflow-hidden bg-[#0a0f24]">
      {/* 全页背景图（含侧边栏背后） */}
      <div className="absolute inset-0" aria-hidden>
        <img src={dashboardBg} alt="" className="h-full w-full object-cover" />
        <div className="absolute inset-x-0 top-0 h-44 bg-gradient-to-b from-[#0a0f24]/85 via-[#0a0f24]/35 to-transparent" />
        <div className="absolute inset-x-0 bottom-0 h-28 bg-gradient-to-t from-[#0a0f24]/75 to-transparent" />
      </div>

      <Sidebar activeKey="dashboard" variant="light" />

      <main className="relative z-10 min-w-0 flex-1 overflow-y-auto px-6 py-4">
        {/* 顶部：标题 + 居中周期选择器 + 导出报告 */}
        <header className="flex items-center justify-between gap-3">
          <div>
            <h1 className="text-2xl font-semibold text-white">人生大盘</h1>
            <p className="mt-1 text-sm text-slate-400">你的人生状态全景视图</p>
          </div>
          <div className="flex items-center gap-2">
            <span className="mr-1 text-xs text-slate-400">{dateText}</span>
            <div className="flex gap-1 rounded-full bg-white/[0.06] p-1 backdrop-blur">
              {PERIODS.map((p) => (
                <button
                  key={p.key}
                  type="button"
                  onClick={() => switchPeriod(p.key)}
                  className={`rounded-full px-3 py-1 text-xs transition ${
                    period === p.key
                      ? 'bg-white/15 font-medium text-white'
                      : 'text-slate-400 hover:text-slate-200'
                  }`}
                >
                  对比：{p.label.replace('近', '')}
                </button>
              ))}
            </div>
            <button
              type="button"
              onClick={() => setToast('报告导出即将上线 ✨')}
              className="rounded-lg bg-white/[0.06] px-3 py-1.5 text-xs font-medium text-slate-200 backdrop-blur transition hover:bg-white/[0.12] hover:text-white"
            >
              导出报告
            </button>
            {/* 用户头像：与侧边栏/首页顶栏一致（自定义上传优先，默认虚拟形象） */}
            <span className="flex h-9 w-9 items-center justify-center overflow-hidden rounded-full bg-gradient-to-br from-iris-500 to-sky-400 text-base">
              <img
                src={profile.avatarUrl || dashboardAvatar}
                alt="头像"
                className="h-full w-full object-cover"
              />
            </span>
          </div>
        </header>

        {/* 主体：左列（当前状态小块+成长趋势图）| 中央（头像+正上下左右四指标+阶段）| 右列（目标方向+人生轨迹） */}
        <div className="mt-5 grid grid-cols-1 gap-5 xl:grid-cols-[230px_1fr_230px]">
          {/* 左列 */}
          <div className="flex min-h-0 flex-col gap-5">
            {/* 模块一：我的当前状态（左上小块） */}
            <section className={`${glassCard} p-3.5`}>
              <p className="text-[13px] font-medium text-white">我的当前状态</p>
              <p className="mt-2 text-[12px] leading-relaxed text-slate-200">
                “{summary.description || summary.stage}”
              </p>
              <div className="mt-2.5 space-y-1.5 text-[11px] text-slate-300">
                <p>😌 最近心情：{moodMeta ? moodMeta.label : '平静'}</p>
                <p>⏱️ 专注时长（今日）：3.6 小时</p>
                <p>🕐 更新时间：{updateText}</p>
              </div>
            </section>

            {/* 模块三：成长趋势（左中，真趋势图） */}
            <section className={`${glassCard} flex flex-1 flex-col p-3.5`}>
              <div className="flex items-center justify-between">
                <p className="text-[13px] font-medium text-white">成长趋势</p>
                <span className="text-[10px] text-slate-500">近{PERIOD_CN[period] ?? '一个月'}</span>
              </div>
              <div className="mt-2 min-h-0 flex-1">
                <TrendChart trends={trends} compact />
              </div>
              <p className="mt-2 text-center text-[10px] leading-relaxed text-slate-400">{trendSummary}</p>
            </section>
          </div>

          {/* 模块二+六：头像位于背景图圆环内 + 正上下左右四指标 + 探索阶段胶囊 */}
          <section ref={centerRef} className="relative min-h-[568px]">
            {/* 正上方：自我成长（环上方，留出间距） */}
            <BareQuadrant
              q={quadrantViews[0]}
              style={{ left: ringPos.x - 85, top: ringPos.y - 80 - 78 - 36 }}
            />
            {/* 正下方：生活状态（环下方，留出间距） */}
            <BareQuadrant
              q={quadrantViews[2]}
              style={{ left: ringPos.x - 85, top: ringPos.y + 80 + 24 }}
            />
            {/* 正左侧：兴趣创造（环左侧，留出间距） */}
            <BareQuadrant
              q={quadrantViews[1]}
              style={{ left: ringPos.x - 101 - 170 - 32, top: ringPos.y - 40 }}
            />
            {/* 正右侧：人际连接（环右侧，留出间距） */}
            <BareQuadrant
              q={quadrantViews[3]}
              style={{ left: ringPos.x + 101 + 32, top: ringPos.y - 40 }}
            />

            {/* 头像（完整落在光环内：环直径约 220px，头像 160×202） */}
            <img
              src={dashboardAvatar}
              alt="人生状态形象"
              className="pointer-events-none absolute h-[160px] -translate-x-1/2 -translate-y-1/2 object-contain drop-shadow-[0_10px_30px_rgba(0,0,0,0.55)]"
              style={{ left: ringPos.x, top: ringPos.y }}
            />

            {/* 模块六：探索阶段（环下方，避开生活状态的小数值） */}
            <div
              className="absolute -translate-x-1/2"
              style={{ left: ringPos.x, top: ringPos.y + 80 + 24 + 78 + 30 }}
            >
              <span className="flex items-center gap-1.5 rounded-full border border-white/15 bg-[#1a2240]/70 px-3.5 py-1 text-[11px] font-medium text-white backdrop-blur">
                <Compass size={12} className="text-iris-300" />
                {summary.stage}
              </span>
            </div>
          </section>

          {/* 右列 */}
          <div className="flex min-h-0 flex-col gap-5">
            {/* 模块四：目标方向 */}
            <section className={`${glassCard} flex flex-1 flex-col p-3.5`}>
              <div className="flex items-center justify-between">
                <p className="text-[13px] font-medium text-white">目标方向</p>
                <button
                  type="button"
                  onClick={() => navigate('/goals')}
                  className="flex items-center gap-1 text-[11px] text-slate-400 transition hover:text-white"
                >
                  <Plus size={12} />
                  添加新目标
                </button>
              </div>
              {activeGoals.length === 0 ? (
                <p className="mt-3 flex-1 text-[11px] text-slate-500">暂无进行中的目标，去目标页创建第一个吧</p>
              ) : (
                <div className="mt-3 flex-1 space-y-2 overflow-y-auto">
                  {activeGoals.slice(0, 3).map((goal) => (
                    <button
                      key={goal.id}
                      type="button"
                      onClick={() => navigate(`/goals/${goal.id}`)}
                      className="w-full rounded-xl bg-white/[0.05] p-2.5 text-left transition hover:bg-white/[0.1]"
                    >
                      <div className="flex items-center justify-between gap-2">
                        <p className="truncate text-xs font-medium text-white">{goal.title}</p>
                        <span
                          className={`shrink-0 rounded-full px-2 py-0.5 text-[10px] ${
                            goal.progress >= 60
                              ? 'bg-emerald-500/15 text-emerald-400'
                              : 'bg-gold-500/15 text-gold-400'
                          }`}
                        >
                          {goalStatusLabel(goal.progress)}
                        </span>
                      </div>
                      <p className="mt-0.5 text-[10px] text-slate-500">{formatDeadline(goal.targetDate)}</p>
                      <div className="mt-1.5 flex items-center gap-2.5">
                        <div className="h-1 flex-1 rounded-full bg-white/10">
                          <div
                            className={`h-1 rounded-full ${goalBarColor(goal.progress)}`}
                            style={{ width: `${Math.min(Math.max(goal.progress, 0), 100)}%` }}
                          />
                        </div>
                        <span className="text-[11px] font-bold text-white">{goal.progress}%</span>
                      </div>
                    </button>
                  ))}
                </div>
              )}
            </section>

            {/* 模块五：人生轨迹 */}
            <section className={`${glassCard} p-3.5`}>
              <div className="flex items-center justify-between">
                <p className="text-[13px] font-medium text-white">人生轨迹</p>
                <button
                  type="button"
                  onClick={() => navigate('/records')}
                  className="text-[11px] text-slate-500 transition hover:text-slate-300"
                >
                  查看全部 »
                </button>
              </div>
              {timelineRecords.length === 0 ? (
                <p className="mt-3 text-[11px] text-slate-500">还没有人生轨迹，回到房间记下第一条吧</p>
              ) : (
                <ol className="mt-3 max-h-36 space-y-2.5 overflow-y-auto border-l border-white/10 pl-4">
                  {timelineRecords.slice(0, 4).map((record) => (
                    <li key={record.id} className="relative">
                      <span className="absolute -left-[21px] top-1 h-2 w-2 rounded-full bg-gradient-to-br from-blue-500 to-purple-500" />
                      <p className="text-[10px] font-medium text-slate-400">
                        {formatTimelineDate(record.recordedAt)}
                      </p>
                      <p className="mt-0.5 truncate text-xs font-medium text-white">
                        {record.title ?? record.rawContent}
                      </p>
                      {record.summary && (
                        <p className="mt-0.5 truncate text-[10px] text-slate-500">{record.summary}</p>
                      )}
                    </li>
                  ))}
                </ol>
              )}
            </section>
          </div>
        </div>

        {/* 模块七：AI 人生观察（底部深色卡，内容由 AI 系统实时生成，聚焦/5分钟自动更新） */}
        <section className={`${glassCard} mt-5 p-4`}>
          <div className="flex items-center justify-between">
            <p className="text-[13px] font-medium text-white">AI人生观察</p>
            <p className="text-[10px] text-slate-500">由 AI 实时生成 · 聚焦页面或每 5 分钟自动更新</p>
          </div>
          {/* md:pr-[72px]：右侧给全局 AI 伙伴悬浮窗留空，避免遮挡「查看建议计划」按钮 */}
          <div className="mt-3 grid grid-cols-1 gap-3 md:grid-cols-4 md:pr-[72px]">
            <div>
              <p className="text-xs font-medium text-emerald-400">📈 变化发现</p>
              <p className="mt-1 text-[11px] leading-relaxed text-slate-300">
                {summary.findings || changeFinding}
              </p>
            </div>
            <div>
              <p className="text-xs font-medium text-gold-400">⚠️ 潜在问题</p>
              <p className="mt-1 text-[11px] leading-relaxed text-slate-300">
                {summary.risks || riskFinding}
              </p>
            </div>
            <div>
              <p className="text-xs font-medium text-iris-300">💡 建议方向</p>
              <p className="mt-1 text-[11px] leading-relaxed text-slate-300">
                {summary.advice || summary.suggestion}
              </p>
            </div>
            <div>
              <p className="text-xs font-medium text-sky-300">🎯 下一步建议</p>
              <p className="mt-1 text-[11px] leading-relaxed text-slate-300">
                {summary.nextStep ||
                  `可以多投入「${DIMENSION_LABELS[lowest]}」相关活动，本周安排 1 天完全放松的时间。`}
              </p>
              <button
                type="button"
                onClick={() => setToast('建议计划即将上线 ✨')}
                className="mt-2 rounded-xl bg-white px-4 py-1.5 text-xs font-medium text-[#2c2947] shadow transition hover:bg-slate-100"
              >
                查看建议计划
              </button>
            </div>
          </div>
        </section>

        {/* 占位提示 */}
        {toast && (
          <div className="pointer-events-none fixed bottom-6 left-1/2 z-50 -translate-x-1/2">
            <p className="animate-fade-in whitespace-nowrap rounded-xl bg-night-800 px-5 py-2.5 text-sm text-slate-200 shadow-lg">
              {toast}
            </p>
          </div>
        )}
      </main>
    </div>
  )
}
