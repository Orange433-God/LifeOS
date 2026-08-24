import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Radar, RadarChart, PolarGrid, PolarAngleAxis, ResponsiveContainer } from 'recharts'
import { Sparkles, Sprout, TrendingUp } from 'lucide-react'
import { api, getErrorMessage } from '../lib/api'
import { DIMENSION_LABELS, DIMENSION_ORDER } from '../lib/constants'
import type { ApiResponse, AssessmentBundle } from '../lib/types'

export default function AssessmentResultPage() {
  const navigate = useNavigate()
  const [bundle, setBundle] = useState<AssessmentBundle | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    const init = async () => {
      try {
        const { data } = await api.get<ApiResponse<AssessmentBundle | null>>('/assessment')
        if (!data.success) throw new Error(data.message ?? '加载测评结果失败')
        // 未完成测评 → 自动回到问卷页
        if (!data.data || !data.data.attributes) {
          navigate('/assessment', { replace: true })
          return
        }
        setBundle(data.data)
      } catch (err) {
        setError(getErrorMessage(err))
      } finally {
        setLoading(false)
      }
    }
    void init()
  }, [navigate])

  if (loading) {
    return (
      <div className="night-background flex h-screen items-center justify-center">
        <div className="h-10 w-10 animate-spin rounded-full border-4 border-white/10 border-t-iris-400" />
      </div>
    )
  }

  if (error || !bundle) {
    return (
      <div className="night-background flex h-screen flex-col items-center justify-center gap-4 px-6 text-center">
        <p className="text-slate-300">{error ?? '加载失败'}</p>
        <button
          type="button"
          onClick={() => navigate('/')}
          className="rounded-xl border border-white/10 px-4 py-2 text-sm text-slate-300 hover:text-white"
        >
          返回首页
        </button>
      </div>
    )
  }

  const { assessment, attributes } = bundle
  const { resultSummary } = assessment
  const radarData = DIMENSION_ORDER.map((dim) => ({
    label: DIMENSION_LABELS[dim],
    score: attributes[dim],
  }))

  return (
    <div className="night-background min-h-screen overflow-y-auto px-6 py-10">
      <div className="mx-auto w-full max-w-3xl">
        {/* 标题 */}
        <header className="text-center">
          <span className="rounded-full border border-iris-400/30 bg-iris-500/10 px-4 py-1.5 text-xs text-iris-300">
            🧭 初始画像
          </span>
          <h1 className="mt-4 text-3xl font-semibold text-white">你的初始人生画像已生成</h1>
          <p className="mt-3 leading-relaxed text-slate-400">{resultSummary.currentState}</p>
        </header>

        {/* 七维雷达图 */}
        <section className="glass-panel mt-8 p-6">
          <h2 className="text-sm font-medium tracking-widest text-slate-400">七维生命属性</h2>
          <div className="mt-2 h-80">
            <ResponsiveContainer width="100%" height="100%">
              <RadarChart data={radarData} cx="50%" cy="50%" outerRadius="72%">
                <PolarGrid stroke="rgba(255,255,255,0.12)" />
                <PolarAngleAxis dataKey="label" tick={{ fill: '#94A3B8', fontSize: 13 }} />
                <Radar
                  dataKey="score"
                  stroke="#7A87F5"
                  fill="#7A87F5"
                  fillOpacity={0.35}
                  strokeWidth={2}
                />
              </RadarChart>
            </ResponsiveContainer>
          </div>
        </section>

        {/* 优势 / 成长空间 */}
        <div className="mt-5 grid gap-5 md:grid-cols-2">
          <section className="glass-panel p-6">
            <h2 className="flex items-center gap-2 font-medium text-white">
              <Sparkles size={16} strokeWidth={1.8} className="text-gold-400" />
              你的优势
            </h2>
            <ul className="mt-4 space-y-4">
              {resultSummary.strengths.map((item) => (
                <li key={item.dimension} className="rounded-xl border border-white/[0.06] bg-white/[0.04] p-4">
                  <div className="flex items-center justify-between">
                    <p className="font-medium text-white">{item.label}</p>
                    <span className="rounded-full bg-iris-500/20 px-2.5 py-0.5 text-xs font-medium text-iris-300">
                      {item.score}
                    </span>
                  </div>
                  <p className="mt-1.5 text-sm leading-relaxed text-slate-400">{item.description}</p>
                </li>
              ))}
            </ul>
          </section>

          <section className="glass-panel p-6">
            <h2 className="flex items-center gap-2 font-medium text-white">
              <Sprout size={16} strokeWidth={1.8} className="text-emerald-400" />
              成长空间
            </h2>
            <ul className="mt-4 space-y-4">
              {resultSummary.challenges.map((item) => (
                <li key={item.dimension} className="rounded-xl border border-white/[0.06] bg-white/[0.04] p-4">
                  <div className="flex items-center justify-between">
                    <p className="font-medium text-white">{item.label}</p>
                    <span className="rounded-full bg-white/10 px-2.5 py-0.5 text-xs font-medium text-slate-300">
                      {item.score}
                    </span>
                  </div>
                  <p className="mt-1.5 text-sm leading-relaxed text-slate-400">{item.description}</p>
                </li>
              ))}
            </ul>
          </section>
        </div>

        {/* 成长方向 */}
        <section className="glass-panel mt-5 p-6">
          <h2 className="flex items-center gap-2 font-medium text-white">
            <TrendingUp size={16} strokeWidth={1.8} className="text-iris-300" />
            成长方向
          </h2>
          <p className="mt-3 leading-loose text-slate-300">「{resultSummary.growthDirection}」</p>
        </section>

        {/* 进入我的世界 */}
        <div className="mt-8 flex justify-center pb-4">
          <button
            type="button"
            onClick={() => navigate('/', { replace: true })}
            className="btn-gradient px-8 py-3 text-base"
          >
            🏠 进入我的世界
          </button>
        </div>
      </div>
    </div>
  )
}
