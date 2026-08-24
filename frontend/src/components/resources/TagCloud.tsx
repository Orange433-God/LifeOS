import type { TagCount } from '../../lib/types'

interface TagCloudProps {
  tags: TagCount[]
  active: string
  onSelect: (tag: string) => void
}

/** 标签云：字号随使用次数变化（12-20px），点击筛选 */
export function TagCloud({ tags, active, onSelect }: TagCloudProps) {
  if (tags.length === 0) return null

  const maxCount = Math.max(...tags.map((t) => t.count), 1)

  return (
    <div className="flex flex-wrap items-center gap-x-4 gap-y-2">
      <span className="text-xs text-[#8b84a8]">🏷️ 标签云</span>
      {tags.slice(0, 20).map(({ tag, count }) => {
        const fontSize = 12 + Math.round((count / maxCount) * 8)
        const isActive = active === tag
        return (
          <button
            key={tag}
            type="button"
            onClick={() => onSelect(isActive ? '' : tag)}
            className={`transition hover:text-iris-600 ${isActive ? 'font-semibold text-iris-600' : 'text-[#5f5787]'}`}
            style={{ fontSize }}
            title={`${count} 个资源`}
          >
            {tag}
          </button>
        )
      })}
    </div>
  )
}
