import { ChevronRight } from 'lucide-react'
import type { ReactNode } from 'react'

interface SettingRowProps {
  label: string
  /** 当前值/说明（右侧） */
  value?: ReactNode
  /** 点击整行触发（link/input 类） */
  onClick?: () => void
  /** 行尾自定义控件（开关等） */
  control?: ReactNode
  danger?: boolean
}

/** 通用设置行：左标签 + 右值/箭头/控件，分割线由父级控制 */
export function SettingRow({ label, value, onClick, control, danger }: SettingRowProps) {
  return (
    <div
      role={onClick ? 'button' : undefined}
      tabIndex={onClick ? 0 : undefined}
      onClick={onClick}
      onKeyDown={onClick ? (e) => e.key === 'Enter' && onClick() : undefined}
      className={`flex w-full items-center justify-between gap-3 border-b border-white/5 px-4 py-3.5 text-left transition ${
        onClick ? 'cursor-pointer hover:bg-white/60' : ''
      }`}
    >
      <span className={`text-sm ${danger ? 'text-red-500' : 'text-[#3a3652]'}`}>{label}</span>
      <span className="flex min-w-0 items-center gap-2">
        {value !== undefined && (
          <span className="max-w-[220px] truncate text-sm text-[#5f5787]">{value}</span>
        )}
        {control}
        {onClick && <ChevronRight size={15} strokeWidth={1.8} className="shrink-0 text-[#8b84a8]" />}
      </span>
    </div>
  )
}
