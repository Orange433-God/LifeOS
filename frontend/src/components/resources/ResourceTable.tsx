import { RESOURCE_TYPE_META, formatBytes } from '../../lib/constants'
import type { ResourceItem } from '../../lib/types'

interface ResourceTableProps {
  items: ResourceItem[]
  onSelect: (item: ResourceItem) => void
  /** 多选模式：显示复选框列 */
  selectable?: boolean
  selectedIds?: Set<string>
  onToggleSelect?: (id: string) => void
}

const formatDate = (iso: string): string => {
  const d = new Date(iso)
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
}

/** 最近更新列表（表格：名称/类型/上传者/更新时间/大小，支持多选模式） */
export function ResourceTable({ items, onSelect, selectable = false, selectedIds, onToggleSelect }: ResourceTableProps) {
  if (items.length === 0) {
    return (
      <p className="rounded-xl border border-[#cfc9e4]/60 bg-white/60 px-4 py-8 text-center text-sm text-[#8b84a8]">
        暂无资源
      </p>
    )
  }

  return (
    <div className="overflow-x-auto rounded-xl border border-[#cfc9e4]/60 bg-white/60 backdrop-blur-sm">
      <table className="w-full min-w-[640px] text-left text-sm">
        <thead>
          <tr className="border-b border-white/5 text-xs text-[#8b84a8]">
            {selectable && <th className="w-10 px-4 py-3 font-normal" />}
            <th className="px-4 py-3 font-normal">资源名称</th>
            <th className="px-4 py-3 font-normal">类型</th>
            <th className="px-4 py-3 font-normal">上传者</th>
            <th className="px-4 py-3 font-normal">更新时间</th>
            <th className="px-4 py-3 font-normal">大小</th>
          </tr>
        </thead>
        <tbody>
          {items.map((item) => {
            const meta = RESOURCE_TYPE_META[item.type] ?? RESOURCE_TYPE_META.link!
            return (
              <tr
                key={item.id}
                onClick={() => onSelect(item)}
                className="cursor-pointer border-b border-white/5 transition hover:bg-white/70"
              >
                {selectable && (
                  <td className="px-4 py-3" onClick={(e) => e.stopPropagation()}>
                    <input
                      type="checkbox"
                      checked={selectedIds?.has(item.id) ?? false}
                      onChange={() => onToggleSelect?.(item.id)}
                      className="h-4 w-4 accent-indigo-500"
                    />
                  </td>
                )}
                <td className="px-4 py-3">
                  <span className="font-medium text-[#2c2947]">{item.name}</span>
                </td>
                <td className="px-4 py-3 text-[#5f5787]">
                  {meta.icon} {meta.label}
                </td>
                <td className="px-4 py-3 text-[#5f5787]">{item.uploaderName ?? '未知用户'}</td>
                <td className="px-4 py-3 text-[#8b84a8]">{formatDate(item.uploadedAt)}</td>
                <td className="px-4 py-3 text-[#8b84a8]">{formatBytes(item.fileSize)}</td>
              </tr>
            )
          })}
        </tbody>
      </table>
    </div>
  )
}
