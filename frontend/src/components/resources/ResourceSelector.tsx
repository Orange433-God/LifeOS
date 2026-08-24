import { useEffect, useState } from 'react'
import { Check, X } from 'lucide-react'
import { getRelatedResources, getResources, linkResource } from '../../api/resources'
import { getErrorMessage } from '../../lib/api'
import { RESOURCE_TYPE_META } from '../../lib/constants'
import type { ResourceItem } from '../../lib/types'

interface ResourceSelectorProps {
  targetType: 'goal' | 'record'
  targetId: string
  myUserId: string
  onClose: () => void
  onChanged: () => void
}

/** 资源选择器：列出我的资源，勾选后批量关联到目标/记录 */
export function ResourceSelector({ targetType, targetId, myUserId, onClose, onChanged }: ResourceSelectorProps) {
  const [all, setAll] = useState<ResourceItem[]>([])
  const [linkedIds, setLinkedIds] = useState<Set<string>>(new Set())
  const [selected, setSelected] = useState<Set<string>>(new Set())
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    Promise.all([getResources({ limit: 100 }), getRelatedResources(targetType, targetId)])
      .then(([list, linked]) => {
        setAll(list.items.filter((r) => r.userId === myUserId))
        const ids = new Set(linked.map((r) => r.id))
        setLinkedIds(ids)
        setSelected(new Set(ids))
      })
      .catch((err) => setError(getErrorMessage(err)))
  }, [targetType, targetId, myUserId])

  const toggle = (id: string) => {
    setSelected((prev) => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
  }

  const save = async () => {
    setSaving(true)
    setError(null)
    try {
      // 新增关联
      for (const id of selected) {
        if (!linkedIds.has(id)) await linkResource(id, targetType, targetId)
      }
      onChanged()
      onClose()
    } catch (err) {
      setError(getErrorMessage(err))
      setSaving(false)
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center px-4">
      <button type="button" aria-label="关闭" onClick={onClose} className="absolute inset-0 cursor-default bg-night-950/60 backdrop-blur-[3px]" />
      <div className="glass-panel animate-fade-in relative z-10 flex max-h-[80vh] w-full max-w-lg flex-col p-6">
        <header className="flex items-center justify-between">
          <h3 className="text-lg font-semibold text-[#2c2947]">选择关联资源</h3>
          <button type="button" onClick={onClose} className="rounded-lg p-1.5 text-[#5f5787] hover:bg-[#f0eff9] hover:text-[#2c2947]">
            <X size={18} strokeWidth={1.8} />
          </button>
        </header>

        <div className="mt-4 flex-1 space-y-2 overflow-y-auto">
          {all.length === 0 && <p className="py-6 text-center text-sm text-[#8b84a8]">你还没有上传过资源，去资源中心上传一些吧</p>}
          {all.map((r) => {
            const meta = RESOURCE_TYPE_META[r.type] ?? RESOURCE_TYPE_META.link!
            const isSelected = selected.has(r.id)
            return (
              <label key={r.id} className={`flex cursor-pointer items-center gap-3 rounded-xl border px-3 py-2.5 text-sm transition ${isSelected ? 'border-iris-400/50 bg-iris-500/10 text-[#2c2947]' : 'border-[#cfc9e4]/60 bg-white/60 text-[#3a3652] hover:border-iris-400/30'}`}>
                <input type="checkbox" checked={isSelected} onChange={() => toggle(r.id)} className="h-4 w-4 shrink-0 accent-indigo-500" />
                <span className="shrink-0">{meta.icon}</span>
                <span className="min-w-0 flex-1 truncate">{r.name}</span>
                <span className="shrink-0 text-xs text-[#8b84a8]">{r.category}</span>
              </label>
            )
          })}
        </div>

        {error && <p className="mt-3 text-xs text-red-500">{error}</p>}

        <div className="mt-4 flex justify-end gap-3">
          <button type="button" onClick={onClose} className="rounded-xl border border-[#cfc9e4] px-4 py-2 text-sm text-[#3a3652] hover:text-[#2c2947]">取消</button>
          <button type="button" onClick={() => void save()} disabled={saving} className="btn-gradient flex items-center gap-1.5 disabled:opacity-50">
            {saving && <span className="h-3.5 w-3.5 animate-spin rounded-full border-2 border-white/30 border-t-white" />}
            <Check size={15} />
            确认关联（{selected.size}）
          </button>
        </div>
      </div>
    </div>
  )
}
