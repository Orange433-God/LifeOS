import { useCallback, useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { PolarAngleAxis, PolarGrid, Radar, RadarChart, ResponsiveContainer } from 'recharts'
import { getSummary, getTimeline, getTrends } from '../api/growth'
import { AISummaryCard } from '../components/growth/AISummaryCard'
import { Timeline } from '../components/growth/Timeline'
import { TrendChart } from '../components/growth/TrendChart'
import { Sidebar } from '../components/Sidebar'
import { useAuth } from '../context/AuthContext'
import { DIMENSION_LABELS, DIMENSION_ORDER } from '../lib/constants'
import type { GrowthEvent, GrowthPeriod, GrowthSummary, GrowthTrends } from '../lib/types'

const PERIOD_OPTIONS: Array<{ key: GrowthPeriod; label: string; summaryLabel: string }> = [
  { key: 'month', label: '最近一个月', summaryLabel: '一个月' },
  { key: 'quarter', label: '最近三个月', summaryLabel: '三个月' },
  { key: 'year', label: '最近一年', summaryLabel: '一年' },
]

const RADAR_COLOR = '#6366f1'

/** 成长分析页（效果图布局）：统计行 + 能力雷达 + 成长趋势 + 人生轨迹 + AI 总结 */
export default function GrowthPage() {
  const { state } = useAuth()
  const navigate = useNavigate()
  const [period, setPeriod] = useState<GrowthPeriod>('quarter')
  const [events, setEvents] = useState<GrowthEvent[]>([])
  const [trends, setTrends] = useState<GrowthTrends | null>(null)
  const [summary, setSummary] = useState<GrowthSummary | null>(null)

  const [loading, setLoading] = useState(true)
  const [trendsLoading, setTrendsLoading] = useState(true)
  const [summaryLoading, setSummaryLoading] = useState(true)
  const [timelineError, setTimelineError] = useState(false)
  const [trendsError, setTrendsError] = useState(false)
  const [summaryError, setSummaryError] = useState(false)
  const [timelineExpanded, setTimelineExpanded] = useState(false)
  const [toast, setToast] = useState<string | null>(null)

  const periodMeta = PERIOD_OPTIONS.find((p) => p.key === period) ?? PERIOD_OPTIONS[1]!

  const loadAll = useCallback(async () => {
    setLoading(true)
    setTimelineError(false)
    const [tl, tr, sm] = await Promise.allSettled([getTimeline(20), getTrends(period), getSummary(period)])
    if (tl.status === 'fulfilled') setEvents(tl.value)
    else setTimelineError(true)
    if (tr.status === 'fulfilled') setTrends(tr.value)
    else setTrendsError(true)
    if (sm.status === 'fulfilled') setSummary(sm.value)
    else setSummaryError(true)
    setLoading(false)
  }, [period])

  useEffect(() => {
    void loadAll()
  }, [loadAll])

  useEffect(() => {
    if (!toast) return
    const timer = setTimeout(() => setToast(null), 2500)
    return () => clearTimeout(timer)
  }, [toast])

  const switchPeriod = async (key: GrowthPeriod) => {
    if (key === period) return
    setPeriod(key)
    setTrendsLoading(true)
    setSummaryLoading(true)
    setTrendsError(false)
    setSummaryError(false)
    const [tr, sm] = await Promise.allSettled([getTrends(key), getSummary(key)])
    if (tr.status === 'fulfilled') setTrends(tr.value)
    else setTrendsError(true)
    if (sm.status === 'fulfilled') setSummary(sm.value)
    else setSummaryError(true)
    setTrendsLoading(false)
    setSummaryLoading(false)
  }

  if (state.status !== 'authed' || !state.profile) return null

  const handleEventClick = (event: GrowthEvent) => {
    if (event.type === 'goal_completed' && event.goalId) {
      navigate(`/goals/${event.goalId}`)
    }
  }

  const toggleTimeline = async () => {
    if (timelineExpanded) {
      setTimelineExpanded(false)
      return
    }
    try {
      setEvents(await getTimeline(200))
      setTimelineError(false)
      setTimelineExpanded(true)
    } catch {
      setTimelineError(true)
    }
  }

  const trendsEmpty = !trends || trends.labels.length === 0

  // ===== 统计行派生（趋势首末对比）=====
  const lastIdx = trends && trends.labels.length > 0 ? trends.labels.length - 1 : -1
  const dimValues =
    lastIdx >= 0
      ? DIMENSION_ORDER.map((key) => ({
          key,
          label: DIMENSION_LABELS[key],
          value: trends![key][lastIdx]!,
          delta: trends![key][lastIdx]! - trends![key][0]!,
        }))
      : []
  const totalLast = dimValues.reduce((s, d) => s + d.value, 0)
  const totalFirst =
    lastIdx >= 0 ? DIMENSION_ORDER.reduce((s, key) => s + trends![key][0]!, 0) : 0
  const growthPct = totalFirst > 0 ? Math.round(((totalLast - totalFirst) / totalFirst) * 100) : 0
  const top = [...dimValues].sort((a, b) => b.value - a.value)[0]
  const potential = [...dimValues].sort((a, b) => b.delta - a.delta)[0]
  const weakest = [...dimValues].sort((a, b) => a.value - b.value)[0]
  const pctOf = (d: { delta: number; value: number } | undefined): string => {
    if (!d || d.value - d.delta <= 0) return '—'
    return `${d.delta >= 0 ? '↑' : '↓'} ${Math.abs(Math.round((d.delta / (d.value - d.delta)) * 100))}%`
  }

  const stats =
    lastIdx >= 0
      ? [
          { label: '成长值', value: `+${totalLast}`, sub: `较上期 ${growthPct >= 0 ? '↑' : '↓'}${Math.abs(growthPct)}%` },
          { label: '优势能力', value: top?.label ?? '—', sub: `较上期 ${pctOf(top)}` },
          { label: '成长潜力', value: potential?.label ?? '—', sub: `较上期 ${pctOf(potential)}` },
          { label: '待提升能力', value: weakest?.label ?? '—', sub: `当前 ${weakest?.value ?? '—'} 分` },
        ]
      : []

  const radarData = dimValues.map((d) => ({ dim: d.label, value: d.value }))

  return (
    <div className="flex h-screen overflow-hidden bg-[#ece9f7]">
      <Sidebar activeKey="growth" variant="light" />

      <main className="min-w-0 flex-1 overflow-y-auto p-6 lg:p-8">
        {/* 顶部：标题 + 周期 + 导出报告 */}
        <header className="flex flex-wrap items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl font-semibold text-[#2c2947]">成长分析</h1>
            <p className="mt-1 text-sm text-[#5f5787]">多维度分析你的成长轨迹，发现潜力，持续进步</p>
          </div>
          <div className="flex items-center gap-3">
            <div className="flex gap-2 rounded-xl border border-[#cfc9e4] bg-white/70 p-1 backdrop-blur">
              {PERIOD_OPTIONS.map((option) => (
                <button
                  key={option.key}
                  type="button"
                  onClick={() => void switchPeriod(option.key)}
                  className={`rounded-lg px-3 py-1.5 text-sm transition ${
                    period === option.key
                      ? 'bg-gradient-to-r from-blue-500/85 to-purple-500/85 font-medium text-white'
                      : 'text-[#5f5787] hover:text-[#3a3652]'
                  }`}
                >
                  {option.label}
                </button>
              ))}
            </div>
            <button
              type="button"
              onClick={() => setToast('报告导出即将上线 ✨')}
              className="rounded-lg bg-white/70 px-3 py-1.5 text-xs font-medium text-[#3a3652] backdrop-blur transition hover:bg-white"
            >
              导出报告
            </button>
          </div>
        </header>

        {/* 统计行：成长值 | 优势能力 | 成长潜力 | 待提升能力 */}
        {stats.length > 0 && (
          <div className="mt-5 grid grid-cols-2 gap-4 xl:grid-cols-4">
            {stats.map((s) => (
              <div key={s.label} className="rounded-2xl border border-[#cfc9e4]/60 bg-white/70 p-4 backdrop-blur-sm">
                <p className="text-xs text-[#5f5787]">{s.label}</p>
                <p className="mt-1.5 truncate text-xl font-bold text-[#2c2947]">{s.value}</p>
                <p className="mt-1 text-[11px] text-[#8b84a8]">{s.sub}</p>
              </div>
            ))}
          </div>
        )}

        {/* 主体三栏：能力雷达 | 成长趋势 | 人生轨迹 */}
        <div className="mt-5 grid grid-cols-1 gap-5 xl:grid-cols-[300px_1fr_280px]">
          {/* 能力雷达图 */}
          <section className="rounded-2xl border border-[#cfc9e4]/60 bg-white/70 p-4 backdrop-blur-sm">
            <h2 className="text-sm font-medium text-[#2c2947]">能力雷达图</h2>
            {loading || trendsLoading ? (
              <div className="mt-3 h-56 animate-pulse rounded-xl bg-[#f0eff9]" />
            ) : trendsError || lastIdx < 0 ? (
              <p className="py-16 text-center text-sm text-[#8b84a8]">数据积累中</p>
            ) : (
              <div className="mt-2 h-60">
                <ResponsiveContainer width="100%" height="100%">
                  <RadarChart data={radarData} cx="50%" cy="50%" outerRadius="72%">
                    <PolarGrid stroke="#cfc9e4" />
                    <PolarAngleAxis dataKey="dim" tick={{ fill: '#5f5787', fontSize: 11 }} />
                    <Radar
                      dataKey="value"
                      stroke={RADAR_COLOR}
                      fill={RADAR_COLOR}
                      fillOpacity={0.35}
                    />
                  </RadarChart>
                </ResponsiveContainer>
              </div>
            )}
          </section>

          {/* 能力成长趋势 */}
          <section className="rounded-2xl border border-[#cfc9e4]/60 bg-white/70 p-4 backdrop-blur-sm">
            <div className="flex items-center justify-between">
              <h2 className="text-sm font-medium text-[#2c2947]">能力成长趋势</h2>
              <span className="text-xs text-[#8b84a8]">{periodMeta.label}</span>
            </div>
            <div className="mt-3">
              {loading || trendsLoading ? (
                <div className="h-72 animate-pulse rounded-xl bg-[#f0eff9]" />
              ) : trendsError ? (
                <p className="py-16 text-center text-sm text-[#8b84a8]">加载失败，请刷新重试</p>
              ) : trendsEmpty ? (
                <div className="flex flex-col items-center gap-2 py-16 text-center">
                  <span className="text-3xl">🌱</span>
                  <p className="text-sm text-[#8b84a8]">数据积累中，继续记录将生成趋势图</p>
                </div>
              ) : (
                <>
                  {(trends.dataPoints ?? 0) < 3 && (
                    <p className="mb-2 rounded-lg bg-gold-100 px-3 py-1.5 text-center text-xs text-gold-600">
                      数据积累中：已有 {trends.dataPoints ?? 0} 个数据点，满 3 个后趋势更准确
                    </p>
                  )}
                  <div className="h-64">
                    <TrendChart trends={trends} light />
                  </div>
                </>
              )}
            </div>
          </section>

          {/* 人生轨迹 */}
          <section className="rounded-2xl border border-[#cfc9e4]/60 bg-white/70 p-4 backdrop-blur-sm">
            <div className="flex items-center justify-between">
              <h2 className="text-sm font-medium text-[#2c2947]">
                人生轨迹
                {!loading && !timelineError && (
                  <span className="ml-2 text-xs font-normal text-[#8b84a8]">共 {events.length} 条</span>
                )}
              </h2>
              <button
                type="button"
                onClick={() => void toggleTimeline()}
                className="text-xs text-iris-600 transition hover:text-[#2c2947]"
              >
                {timelineExpanded ? '收起 ↑' : '查看全部 ↓'}
              </button>
            </div>
            <div className="mt-4">
              {loading ? (
                <div className="h-64 animate-pulse rounded-xl bg-[#f0eff9]" />
              ) : timelineError ? (
                <p className="rounded-xl border border-[#cfc9e4]/60 bg-white/60 p-5 text-sm text-[#8b84a8]">
                  加载失败，请刷新重试
                </p>
              ) : (
                <Timeline events={events} onEventClick={handleEventClick} expanded={timelineExpanded} />
              )}
            </div>
          </section>
        </div>

        {/* 底部：AI 总结 */}
        <div className="mt-5 pb-6">
          <AISummaryCard
            summary={summary}
            loading={summaryLoading}
            error={summaryError}
            periodLabel={periodMeta.summaryLabel}
          />
        </div>

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
