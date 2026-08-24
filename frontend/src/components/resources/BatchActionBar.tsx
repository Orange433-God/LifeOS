import { useState } from 'react'
import { FolderInput, Trash2 } from 'lucide-react'
import { RESOURCE_CATEGORY_OPTIONS } from '../../lib/constants'

interface BatchActionBarProps {
  selectedCount: number
  onDelete: () => void
  onMove: (category: string) => void
  busy: boolean
}

/** 批量操作栏：删除选中 / 移动到分类 */
export function BatchActionBar({ selectedCount, onDelete, onMove, busy }: BatchActionBarProps) {
  const [category, setCategory] = useState('')
  const [showMove, setShowMove] = useState(false)

  return (
    <div className="animate-fade-in flex flex-wrap items-center gap-3 rounded-xl border border-iris-400/30 bg-iris-500/10 px-4 py-2.5 backdrop-blur">
      <span className="text-sm text-[#2c2947]">已选中 {selectedCount} 个资源</span>
      <button
        type="button"
        onClick={onDelete}
        disabled={busy}
        className="flex items-center gap-1 rounded-lg border border-red-400/40 bg-red-500/10 px-3 py-1.5 text-xs text-red-500 transition hover:bg-red-500/20 disabled:opacity-50"
      >
        <Trash2 size={13} />
        删除选中
      </button>
      <div className="flex items-center gap-2">
        <button
          type="button"
          onClick={() => setShowMove((v) => !v)}
          disabled={busy}
          className="flex items-center gap-1 rounded-lg border border-[#cfc9e4] px-3 py-1.5 text-xs text-[#3a3652] transition hover:border-iris-400/40 hover:text-[#2c2947] disabled:opacity-50"
        >
          <FolderInput size={13} />
          移动到分类
        </button>
        {showMove && (
          <select
            value={category}
            onChange={(e) => setCategory(e.target.value)}
            className="rounded-lg border border-[#cfc9e4] bg-night-800/80 px-2.5 py-1.5 text-xs text-[#3a3652] outline-none"
          >
            <option value="">选择分类…</option>
            {Object.values(RESOURCE_CATEGORY_OPTIONS).flat().map((c) => (
              <option key={c} value={c}>{c}</option>
            ))}
          </select>
        )}
        {showMove && (
          <button
            type="button"
            onClick={() => {
              if (category) {
                onMove(category)
                setShowMove(false)
                setCategory('')
              }
            }}
            disabled={!category || busy}
            className="rounded-lg bg-gradient-to-r from-blue-500/80 to-purple-500/80 px-3 py-1.5 text-xs text-[#2c2947] disabled:opacity-50"
          >
            确认移动
          </button>
        )}
      </div>
    </div>
  )
}
