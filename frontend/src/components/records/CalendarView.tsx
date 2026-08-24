import { useState } from 'react'
import { ChevronLeft, ChevronRight } from 'lucide-react'
import type { LifeRecord } from '../../lib/types'

interface CalendarViewProps {
  records: LifeRecord[]
  selectedDate: string
  onSelectDate: (dateKey: string) => void
}

const WEEKDAYS = ['一', '二', '三', '四', '五', '六', '日']

const dateKeyOf = (d: Date): string =>
  `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`

/** 日历视图：月度网格，有记录的日期显示蓝紫圆点，今天高亮 */
export function CalendarView({ records, selectedDate, onSelectDate }: CalendarViewProps) {
  const [monthCursor, setMonthCursor] = useState<Date>(() => {
    const d = new Date()
    d.setDate(1)
    return d
  })

  // 每天记录数
  const countByDay = new Map<string, number>()
  for (const record of records) {
    const key = dateKeyOf(new Date(record.recordedAt))
    countByDay.set(key, (countByDay.get(key) ?? 0) + 1)
  }

  const year = monthCursor.getFullYear()
  const month = monthCursor.getMonth()
  const firstWeekday = (new Date(year, month, 1).getDay() + 6) % 7 // 周一=0
  const daysInMonth = new Date(year, month + 1, 0).getDate()
  const todayKey = dateKeyOf(new Date())

  const cells: Array<{ day: number; dateKey: string } | null> = []
  for (let i = 0; i < firstWeekday; i++) cells.push(null)
  for (let day = 1; day <= daysInMonth; day++) {
    cells.push({ day, dateKey: dateKeyOf(new Date(year, month, day)) })
  }

  const shiftMonth = (delta: number) => {
    setMonthCursor(new Date(year, month + delta, 1))
  }

  return (
    <div className="rounded-xl border border-[#cfc9e4]/60 bg-white/70 p-4 backdrop-blur-sm">
      {/* 月份导航 */}
      <div className="flex items-center justify-between px-1">
        <button
          type="button"
          onClick={() => shiftMonth(-1)}
          className="rounded-lg p-1 text-[#5f5787] transition hover:bg-[#f0eff9] hover:text-[#2c2947]"
        >
          <ChevronLeft size={16} />
        </button>
        <p className="text-sm font-medium text-[#2c2947]">
          {year}年{month + 1}月
        </p>
        <button
          type="button"
          onClick={() => shiftMonth(1)}
          className="rounded-lg p-1 text-[#5f5787] transition hover:bg-[#f0eff9] hover:text-[#2c2947]"
        >
          <ChevronRight size={16} />
        </button>
      </div>

      {/* 星期表头 */}
      <div className="mt-2 grid grid-cols-7 gap-1 text-center">
        {WEEKDAYS.map((w) => (
          <span key={w} className="py-1 text-[11px] text-[#8b84a8]">
            {w}
          </span>
        ))}
      </div>

      {/* 日期格子 */}
      <div className="mt-1 grid grid-cols-7 gap-1">
        {cells.map((cell, index) => {
          if (!cell) return <span key={`blank-${index}`} />
          const count = countByDay.get(cell.dateKey) ?? 0
          const isToday = cell.dateKey === todayKey
          const isSelected = cell.dateKey === selectedDate
          return (
            <button
              key={cell.dateKey}
              type="button"
              disabled={count === 0}
              onClick={() => onSelectDate(cell.dateKey)}
              className={`relative flex aspect-square flex-col items-center justify-center rounded-lg text-sm transition ${
                isSelected
                  ? 'bg-gradient-to-br from-blue-500/70 to-purple-500/70 font-medium text-white'
                  : count > 0
                    ? 'text-[#3a3652] hover:bg-[#f0eff9]'
                    : 'text-[#a9a3c4]'
              } ${isToday ? 'ring-1 ring-iris-400/60' : ''}`}
            >
              {cell.day}
              {count > 0 && (
                <span
                  className={`absolute bottom-1 h-1.5 w-1.5 rounded-full ${
                    isSelected ? 'bg-white' : 'bg-gradient-to-br from-blue-500 to-purple-500'
                  }`}
                />
              )}
            </button>
          )
        })}
      </div>
    </div>
  )
}
