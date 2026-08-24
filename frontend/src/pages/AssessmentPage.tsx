import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { ArrowLeft, ChevronLeft } from 'lucide-react'
import { api, getErrorMessage } from '../lib/api'
import { DIMENSION_LABELS } from '../lib/constants'
import type {
  ApiResponse,
  AssessmentBundle,
  AssessmentQuestion,
  AssessmentSubmitResult,
} from '../lib/types'

export default function AssessmentPage() {
  const navigate = useNavigate()
  const [questions, setQuestions] = useState<AssessmentQuestion[]>([])
  const [index, setIndex] = useState(0)
  const [answers, setAnswers] = useState<Record<string, number>>({})
  const [loading, setLoading] = useState(true)
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    const init = async () => {
      try {
        // 已有测评记录 → 直接去结果页
        const existing = await api.get<ApiResponse<AssessmentBundle | null>>('/assessment')
        if (existing.data.success && existing.data.data) {
          navigate('/assessment/result', { replace: true })
          return
        }
        const q = await api.get<ApiResponse<AssessmentQuestion[]>>('/assessment/questions')
        if (!q.data.success || !q.data.data) throw new Error(q.data.message ?? '加载题目失败')
        setQuestions(q.data.data)
      } catch (err) {
        setError(getErrorMessage(err))
      } finally {
        setLoading(false)
      }
    }
    void init()
  }, [navigate])

  const current = questions[index]
  const answered = current ? answers[current.id] : undefined

  const selectOption = async (value: number) => {
    if (!current || submitting) return
    const nextAnswers = { ...answers, [current.id]: value }
    setAnswers(nextAnswers)

    // 最后一题：自动提交
    if (index >= questions.length - 1) {
      setSubmitting(true)
      setError(null)
      try {
        const res = await api.post<ApiResponse<AssessmentSubmitResult>>('/assessment/submit', {
          answers: nextAnswers,
        })
        if (!res.data.success) throw new Error(res.data.message ?? '提交失败')
        navigate('/assessment/result', { replace: true })
      } catch (err) {
        setError(getErrorMessage(err))
        setSubmitting(false)
      }
      return
    }
    setIndex(index + 1)
  }

  if (loading) {
    return (
      <div className="night-background flex h-screen items-center justify-center">
        <div className="h-10 w-10 animate-spin rounded-full border-4 border-white/10 border-t-iris-400" />
      </div>
    )
  }

  if (error && questions.length === 0) {
    return (
      <div className="night-background flex h-screen flex-col items-center justify-center gap-4 px-6 text-center">
        <p className="text-slate-300">{error}</p>
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

  if (!current) return null

  const progress = (index / questions.length) * 100

  return (
    <div className="night-background flex min-h-screen flex-col px-6 py-6">
      {/* 返回首页 */}
      <div className="mx-auto w-full max-w-2xl">
        <button
          type="button"
          onClick={() => navigate('/')}
          className="flex items-center gap-1.5 text-sm text-slate-400 transition hover:text-white"
        >
          <ArrowLeft size={16} strokeWidth={1.8} />
          返回首页
        </button>
      </div>

      <div className="mx-auto mt-6 w-full max-w-2xl">
        {/* 进度 */}
        <div className="flex items-center justify-between text-sm">
          <span className="text-slate-400">
            第 <span className="font-semibold text-white">{index + 1}</span>/{questions.length} 题
          </span>
          <span className="text-iris-300">{Math.round(progress)}%</span>
        </div>
        <div className="mt-2 h-1.5 rounded-full bg-white/10">
          <div
            className="progress-gradient h-1.5 rounded-full transition-all duration-300"
            style={{ width: `${progress}%` }}
          />
        </div>

        {/* 题目卡片（key 变化触发淡入动画） */}
        <div key={current.id} className="glass-panel animate-fade-in mt-8 p-8">
          <span className="rounded-full border border-iris-400/30 bg-iris-500/10 px-3 py-1 text-xs text-iris-300">
            {DIMENSION_LABELS[current.dimension]}
          </span>
          <h1 className="mt-4 text-xl font-medium leading-relaxed text-white">{current.question}</h1>
          <div className="mt-8 space-y-3">
            {current.options.map((opt) => {
              const selected = answered === opt.value
              return (
                <button
                  key={opt.value}
                  type="button"
                  disabled={submitting}
                  onClick={() => void selectOption(opt.value)}
                  className={`w-full rounded-xl border px-4 py-3 text-left text-sm transition ${
                    selected
                      ? 'border-iris-400/60 bg-iris-500/15 text-white'
                      : 'border-white/10 bg-white/[0.04] text-slate-300 hover:border-iris-400/40 hover:text-white'
                  }`}
                >
                  {opt.label}
                </button>
              )
            })}
          </div>
          {submitting && (
            <p className="mt-5 text-center text-sm text-slate-400">正在生成你的初始人生画像…</p>
          )}
          {error && <p className="mt-5 text-center text-sm text-red-400">{error}</p>}
        </div>

        {/* 上一题 */}
        <div className="mt-6 flex justify-center">
          {index > 0 && !submitting && (
            <button
              type="button"
              onClick={() => setIndex(index - 1)}
              className="flex items-center gap-1 rounded-xl border border-white/10 px-4 py-2 text-sm text-slate-300 transition hover:border-iris-400/40 hover:text-white"
            >
              <ChevronLeft size={15} strokeWidth={1.8} />
              上一题
            </button>
          )}
        </div>
      </div>
    </div>
  )
}
