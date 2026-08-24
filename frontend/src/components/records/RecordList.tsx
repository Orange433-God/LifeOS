import type { LifeRecord } from '../../lib/types'
import { RecordCard } from './RecordCard'

interface RecordListProps {
  records: LifeRecord[]
  selectedId: string | null
  onSelect: (record: LifeRecord) => void
  emptyText?: string
}

/** 中栏：记录卡片列表 */
export function RecordList({ records, selectedId, onSelect, emptyText }: RecordListProps) {
  if (records.length === 0) {
    return (
      <div className="flex flex-col items-center gap-2 rounded-xl border border-[#cfc9e4]/60 bg-white/60 px-4 py-10 text-center">
        <span className="text-2xl">✨</span>
        <p className="text-sm text-[#8b84a8]">{emptyText ?? '今天还没有记录，记录下你的想法吧 ✨'}</p>
      </div>
    )
  }

  return (
    <div className="space-y-3">
      {records.map((record) => (
        <RecordCard
          key={record.id}
          record={record}
          selected={record.id === selectedId}
          onClick={() => onSelect(record)}
        />
      ))}
    </div>
  )
}
