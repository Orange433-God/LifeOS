import { useState } from 'react'
import { ChevronDown } from 'lucide-react'
import type { LifeRecord } from '../../lib/types'

interface TimelineSidebarProps {
  records: LifeRecord[]
  selectedDate: string
  onSelectDate: (dateKey: string) => void
}

/** 日期键 YYYY-MM-DD（本地时区） */
const dateKeyOf = (iso: string): string => {
  const d = new Date(iso)
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
}

const todayKey = (): string => dateKeyOf(new Date().toISOString())

interface DayGroup {
  dateKey: string
  label: string
  count: number
  isToday: boolean
}

interface MonthGroup {
  monthKey: string
  label: string
  days: DayGroup[]
}

/** 左栏时间轴：按月份分组（可折叠），日期项带记录数与今日标注 */
export function TimelineSidebar({ records, selectedDate, onSelectDate }: TimelineSidebarProps) {
  const [collapsed, setCollapsed] = useState<Set<string>>(new Set())

  // 按 月 → 日 分组（降序）
  const months = new Map<string, MonthGroup>()
  for (const record of records) {
    const d = new Date(record.recordedAt)
    const monthKey = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`
    const dateKey = dateKeyOf(record.recordedAt)
    if (!months.has(monthKey)) {
      months.set(monthKey, {
        monthKey,
        label: `${d.getFullYear()}年${d.getMonth() + 1}月`,
        days: [],
      })
    }
    const group = months.get(monthKey)!
    let day = group.days.find((x) => x.dateKey === dateKey)
    if (!day) {
      day = {
        dateKey,
        label: `${d.getMonth() + 1}月${d.getDate()}日`,
        count: 0,
        isToday: dateKey === todayKey(),
      }
      group.days.push(day)
    }
    day.count += 1
  }

  const monthList = [...months.values()].sort((a, b) => (a.monthKey < b.monthKey ? 1 : -1))

  const toggleMonth = (monthKey: string) => {
    setCollapsed((prev) => {
      const next = new Set(prev)
      if (next.has(monthKey)) next.delete(monthKey)
      else next.add(monthKey)
      return next
    })
  }

  if (monthList.length === 0) {
    return (
      <p className="rounded-xl border border-[#cfc9e4]/60 bg-white/70 p-4 text-xs text-[#8b84a8]">
        还没有记录，点右上角「新建记录」写下第一笔吧
      </p>
    )
  }

  return (
    <div className="space-y-3">
      {monthList.map((month) => {
        const isCollapsed = collapsed.has(month.monthKey)
        return (
          <div key={month.monthKey}>
            <button
              type="button"
              onClick={() => toggleMonth(month.monthKey)}
              className="flex w-full items-center gap-1.5 rounded-lg px-2 py-1.5 text-sm font-medium text-[#2c2947] transition hover:bg-[#f0eff9]"
            >
              <ChevronDown
                size={14}
                className={`shrink-0 text-[#8b84a8] transition-transform ${isCollapsed ? '-rotate-90' : ''}`}
              />
              {month.label}
              <span className="ml-auto text-xs font-normal text-[#8b84a8]">
                {month.days.length} 天
              </span>
            </button>

            {!isCollapsed && (
              <ul className="mt-1 space-y-0.5">
                {month.days.map((day) => {
                  const selected = day.dateKey === selectedDate
                  return (
                    <li key={day.dateKey}>
                      <button
                        type="button"
                        onClick={() => onSelectDate(day.dateKey)}
                        className={`flex w-full items-center gap-2 rounded-lg px-2 py-1.5 pl-6 text-sm transition ${
                          selected
                            ? 'bg-gradient-to-r from-blue-500/70 to-purple-500/70 font-medium text-white'
                            : 'text-[#5f5787] hover:bg-[#f0eff9] hover:text-[#3a3652]'
                        }`}
                      >
                        <span>{day.label}</span>
                        {day.isToday && (
                          <span className="rounded-full bg-iris-500/20 px-1.5 py-0.5 text-[10px] text-iris-600">
                            今天
                          </span>
                        )}
                        <span className={`ml-auto text-xs ${selected ? 'text-white/80' : 'text-[#8b84a8]'}`}>
                          {day.count}条
                        </span>
                      </button>
                    </li>
                  )
                })}
              </ul>
            )}
          </div>
        )
      })}
    </div>
  )
}
