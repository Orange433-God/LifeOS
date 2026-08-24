import { useEffect, useState } from 'react'
import { Trash2, X } from 'lucide-react'
import { getRelatedResources, unlinkResource } from '../../api/resources'
import { ResourceSelector } from '../resources/ResourceSelector'
import { getErrorMessage } from '../../lib/api'
import { MOOD_META, RECORD_TYPE_ICONS, RECORD_TYPE_LABELS } from '../../lib/constants'
import type { LifeRecord, ResourceItem } from '../../lib/types'

interface RecordDetailProps {
  record: LifeRecord | null
  related: LifeRecord[]
  onSelectRelated: (record: LifeRecord) => void
  onDelete: (record: LifeRecord) => void
  /** 当前用户 ID（关联资源功能需要） */
  myUserId: string
}

/** 浅色主题标签样式 */
const tagColor = (): string => 'border-[#cfc9e4] bg-white text-[#5f5787]'

const formatTime = (iso: string): string => {
  const d = new Date(iso)
  return `${d.getFullYear()}年${d.getMonth() + 1}月${d.getDate()}日 ${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`
}

/** 右栏：记录详情（完整内容 + AI 总结 + 心情 + 标签 + 相关记录 + 关联资源） */
export function RecordDetail({ record, related, onSelectRelated, onDelete, myUserId }: RecordDetailProps) {
  const [linkedResources, setLinkedResources] = useState<ResourceItem[]>([])
  const [selectorOpen, setSelectorOpen] = useState(false)
  const [linkError, setLinkError] = useState<string | null>(null)

  useEffect(() => {
    if (!record) return
    getRelatedResources('record', record.id)
      .then(setLinkedResources)
      .catch(() => setLinkedResources([]))
  }, [record?.id]) // eslint-disable-line react-hooks/exhaustive-deps

  const handleUnlink = async (resourceId: string) => {
    if (!record) return
    setLinkError(null)
    try {
      await unlinkResource(resourceId, 'record', record.id)
      setLinkedResources(await getRelatedResources('record', record.id))
    } catch (err) {
      setLinkError(getErrorMessage(err))
    }
  }

  if (!record) {
    return (
      <div className="flex h-full min-h-[200px] flex-col items-center justify-center gap-2 rounded-xl border border-[#cfc9e4]/60 bg-white/70 p-6 text-center">
        <span className="text-2xl">📖</span>
        <p className="text-sm text-slate-500">选择一条记录查看详情</p>
      </div>
    )
  }

  const mood = record.mood ? MOOD_META[record.mood] : null

  return (
    <div className="animate-fade-in space-y-4 rounded-xl border border-[#cfc9e4]/60 bg-white/75 p-5 backdrop-blur-sm">
      {/* 标题 + 删除 */}
      <div className="flex items-start justify-between gap-2">
        <h3 className="min-w-0 flex-1 break-words text-xl font-semibold text-[#2c2947]">
          <span className="mr-2">{RECORD_TYPE_ICONS[record.type] ?? '📝'}</span>
          {record.title ?? '未命名记录'}
        </h3>
        <button
          type="button"
          onClick={() => onDelete(record)}
          title="删除记录"
          className="shrink-0 rounded-lg p-1.5 text-[#8b84a8] transition hover:bg-[#f0eff9] hover:text-red-500"
        >
          <Trash2 size={15} strokeWidth={1.8} />
        </button>
      </div>

      {/* 类型 + 时间 */}
      <p className="text-xs text-[#8b84a8]">
        {RECORD_TYPE_LABELS[record.type] ?? record.type} · {formatTime(record.recordedAt)}
      </p>

      {/* 完整内容 */}
      <p className="whitespace-pre-wrap break-words leading-relaxed text-[#3a3652]">{record.rawContent}</p>

      {/* AI 总结 */}
      {record.summary && (
        <div className="rounded-xl border border-transparent bg-gradient-to-r from-blue-500/10 to-purple-500/10 p-4 [border-image:linear-gradient(to_right,rgba(96,165,250,0.4),rgba(167,139,250,0.4))_1]">
          <p className="flex items-center gap-1.5 text-xs text-iris-600">🤖 AI 总结</p>
          <p className="mt-1.5 text-sm leading-relaxed text-[#3a3652]">{record.summary}</p>
        </div>
      )}

      {/* 心情 */}
      {mood && (
        <div className="flex items-center gap-2.5 rounded-xl bg-[#f0eff9]/80 px-3 py-2.5">
          <span className="text-2xl">{mood.emoji}</span>
          <div>
            <p className="text-sm text-[#2c2947]">{mood.label}</p>
            <p className="text-[11px] text-[#8b84a8]">当时的心情</p>
          </div>
        </div>
      )}

      {/* 标签 */}
      {record.tags.length > 0 && (
        <div>
          <p className="text-xs text-[#8b84a8]">🏷️ 标签</p>
          <div className="mt-2 flex flex-wrap gap-1.5">
            {record.tags.map((tag) => (
              <span key={tag} className={`rounded-full border px-2.5 py-0.5 text-xs ${tagColor()}`}>
                # {tag}
              </span>
            ))}
          </div>
        </div>
      )}

      {/* 关联资源 */}
      <div>
        <div className="flex items-center justify-between">
          <p className="text-xs text-[#8b84a8]">🔗 关联资源</p>
          <button
            type="button"
            onClick={() => setSelectorOpen(true)}
            className="rounded-lg border border-iris-400/40 bg-iris-500/10 px-2.5 py-1 text-[11px] text-iris-600 transition hover:bg-iris-500/20"
          >
            + 添加
          </button>
        </div>
        {linkedResources.length === 0 ? (
          <p className="mt-2 text-xs text-[#8b84a8]">暂无关联资源</p>
        ) : (
          <ul className="mt-2 space-y-1.5">
            {linkedResources.map((r) => (
              <li key={r.id} className="flex items-center gap-2 rounded-lg bg-[#f0eff9]/80 px-2.5 py-1.5 text-xs">
                <span>{RECORD_TYPE_ICONS[r.type] ?? '📦'}</span>
                <span className="min-w-0 flex-1 truncate text-[#3a3652]">{r.name}</span>
                <button type="button" onClick={() => void handleUnlink(r.id)} title="解除关联" className="shrink-0 text-[#8b84a8] hover:text-red-500">
                  <X size={12} strokeWidth={1.8} />
                </button>
              </li>
            ))}
          </ul>
        )}
        {linkError && <p className="mt-1 text-[11px] text-red-500">{linkError}</p>}
      </div>

      {/* 相关记录 */}
      {related.length > 0 && (
        <div>
          <p className="text-xs text-[#8b84a8]">🔗 相关记录</p>
          <ul className="mt-2 space-y-1.5">
            {related.slice(0, 3).map((item) => (
              <li key={item.id}>
                <button
                  type="button"
                  onClick={() => onSelectRelated(item)}
                  className="flex w-full items-center gap-2 rounded-lg bg-[#f0eff9]/80 px-3 py-2 text-left text-xs text-[#3a3652] transition hover:bg-white hover:text-[#2c2947]"
                >
                  <span className="shrink-0">{RECORD_TYPE_ICONS[item.type] ?? '📝'}</span>
                  <span className="min-w-0 flex-1 truncate">{item.title ?? item.rawContent}</span>
                  <span className="shrink-0 text-[#8b84a8]">
                    {new Date(item.recordedAt).getMonth() + 1}/{new Date(item.recordedAt).getDate()}
                  </span>
                </button>
              </li>
            ))}
          </ul>
        </div>
      )}

      {/* 资源选择器 */}
      {selectorOpen && record && (
        <ResourceSelector
          targetType="record"
          targetId={record.id}
          myUserId={myUserId}
          onClose={() => setSelectorOpen(false)}
          onChanged={() => {
            void getRelatedResources('record', record.id).then(setLinkedResources).catch(() => undefined)
          }}
        />
      )}
    </div>
  )
}
