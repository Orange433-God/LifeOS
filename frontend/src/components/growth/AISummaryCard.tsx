import type { GrowthSummary } from '../../lib/types'

interface AISummaryCardProps {
  summary: GrowthSummary | null
  loading: boolean
  error: boolean
  periodLabel: string
}

/** AI 人生总结卡片：加载三点动画 / 错误提示 / 完整总结 */
export function AISummaryCard({ summary, loading, error, periodLabel }: AISummaryCardProps) {
  return (
    <div className="rounded-2xl border border-[#cfc9e4]/60 bg-white/75 p-8 text-center backdrop-blur-xl">
      <span className="rounded-full border border-iris-400/30 bg-iris-500/10 px-3 py-1 text-xs text-iris-600">
        🤖 AI 这样看你
      </span>

      {loading ? (
        <div className="mt-6 flex flex-col items-center gap-3">
          <span className="typing-dots inline-flex items-center">
            <span />
            <span />
            <span />
          </span>
          <p className="text-sm text-[#5f5787]">AI 正在回顾你的人生轨迹…</p>
        </div>
      ) : error || !summary ? (
        <p className="mt-6 text-sm text-[#5f5787]">加载失败，请刷新重试</p>
      ) : (
        <>
          <p className="mt-4 text-2xl font-semibold text-[#2c2947]">{summary.title}</p>
          <p className="mx-auto mt-3 max-w-2xl leading-loose text-[#3a3652]">{summary.content}</p>
          <p className="mx-auto mt-4 max-w-xl text-sm text-gold-600">💡 {summary.advice}</p>
        </>
      )}

      <p className="mt-6 text-xs text-[#8b84a8]">基于你过去{periodLabel}的数据生成</p>
    </div>
  )
}
