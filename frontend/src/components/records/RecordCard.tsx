import { MOOD_META, RECORD_TYPE_ICONS } from '../../lib/constants'
import type { LifeRecord } from '../../lib/types'

interface RecordCardProps {
  record: LifeRecord
  selected: boolean
  onClick: () => void
}

const formatTime = (iso: string): string => {
  const d = new Date(iso)
  return `${d.getFullYear()}/${String(d.getMonth() + 1).padStart(2, '0')}/${String(d.getDate()).padStart(2, '0')} ${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`
}

/** 浅色标签配色 */
const TAG_STYLES: Record<string, string> = {
  学习: 'border-sky-300/50 bg-sky-100 text-sky-700',
  工作: 'border-orange-300/50 bg-orange-100 text-orange-700',
  生活: 'border-emerald-300/50 bg-emerald-100 text-emerald-700',
  情绪: 'border-pink-300/50 bg-pink-100 text-pink-700',
  灵感: 'border-purple-300/50 bg-purple-100 text-purple-700',
}
const tagColor = (tag: string): string => TAG_STYLES[tag] ?? 'border-[#cfc9e4] bg-white text-[#5f5787]'

/** 记录卡片（浅色）：类型图标 + 标题 + 摘要 + AI总结 + 心情 + 时间 + 标签 */
export function RecordCard({ record, selected, onClick }: RecordCardProps) {
  const preview = (record.summary ?? record.rawContent).slice(0, 40)
  const mood = record.mood ? MOOD_META[record.mood] : null

  return (
    <button
      type="button"
      onClick={onClick}
      className={`w-full rounded-xl border bg-white/75 p-4 text-left backdrop-blur-sm transition-transform duration-200 hover:scale-[1.01] hover:bg-white ${
        selected ? 'border-iris-400/70 ring-1 ring-iris-400/40' : 'border-[#cfc9e4]/60'
      }`}
    >
      <div className="flex items-start justify-between gap-2">
        <p className="min-w-0 truncate font-semibold text-[#2c2947]">
          <span className="mr-1.5">{RECORD_TYPE_ICONS[record.type] ?? '📝'}</span>
          {record.title ?? '未命名记录'}
        </p>
        <span className="shrink-0 text-[11px] text-[#8b84a8]">{formatTime(record.recordedAt).slice(11)}</span>
      </div>
      <p className="mt-1 truncate text-sm text-[#5f5787]">{preview}</p>

      {/* AI 总结块 */}
      {record.summary && (
        <div className="mt-2 rounded-lg border border-iris-300/40 bg-iris-100/40 px-2.5 py-1.5">
          <p className="text-[10px] font-medium text-iris-600">✦ AI总结</p>
          <p className="mt-0.5 line-clamp-2 text-[11px] leading-relaxed text-[#4a4570]">{record.summary}</p>
        </div>
      )}

      <div className="mt-2 flex flex-wrap items-center gap-1.5">
        {mood && (
          <span className="rounded-full border border-pink-300/50 bg-pink-100 px-2 py-0.5 text-[11px] text-pink-700">
            {mood.emoji} {mood.label}
          </span>
        )}
        {record.tags.slice(0, 4).map((tag) => (
          <span key={tag} className={`rounded-full border px-2 py-0.5 text-[11px] ${tagColor(tag)}`}>
            # {tag}
          </span>
        ))}
      </div>
    </button>
  )
}
