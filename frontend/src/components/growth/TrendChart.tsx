import { useState } from 'react'
import {
  CartesianGrid,
  Legend,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts'
import type { DimensionKey, GrowthTrends } from '../../lib/types'

/** 7 属性固定配色（按设计规格） */
const SERIES: Array<{ key: DimensionKey; label: string; color: string }> = [
  { key: 'explore', label: '探索力', color: '#60A5FA' },
  { key: 'learn', label: '学习力', color: '#34D399' },
  { key: 'execute', label: '执行力', color: '#A78BFA' },
  { key: 'create', label: '创造力', color: '#F472B6' },
  { key: 'health', label: '健康力', color: '#6EE7B7' },
  { key: 'connect', label: '连接力', color: '#FBBF24' },
  { key: 'stable', label: '稳定力', color: '#F87171' },
]

const tooltipStyle = {
  background: '#131B30',
  border: '1px solid rgba(255,255,255,0.12)',
  borderRadius: 12,
  fontSize: 12,
  color: '#E2E8F0',
} as const

interface TrendChartProps {
  trends: GrowthTrends
  /** compact：小容器模式（缩小图例/坐标/边距，填满父容器高度） */
  compact?: boolean
  /** light：浅色卡片上的浅色形态（默认深色形态） */
  light?: boolean
}

/** 属性变化趋势折线图：7 条线，图例可点击切换显示/隐藏 */
export function TrendChart({ trends, compact = false, light = false }: TrendChartProps) {
  const [hidden, setHidden] = useState<Set<string>>(new Set())

  const lineData = trends.labels.map((label, i) => ({
    label,
    explore: trends.explore[i],
    learn: trends.learn[i],
    execute: trends.execute[i],
    create: trends.create[i],
    health: trends.health[i],
    connect: trends.connect[i],
    stable: trends.stable[i],
  }))

  const toggle = (key: string) => {
    setHidden((prev) => {
      const next = new Set(prev)
      if (next.has(key)) next.delete(key)
      else next.add(key)
      return next
    })
  }

  return (
    <div className={compact ? 'flex h-full min-h-0 flex-col' : ''}>
      {/* 图例（可点击） */}
      <div className={`flex shrink-0 flex-wrap ${compact ? 'gap-1' : 'gap-2'}`}>
        {SERIES.map(({ key, label, color }) => {
          const isHidden = hidden.has(key)
          return (
            <button
              key={key}
              type="button"
              onClick={() => toggle(key)}
              className={`flex items-center rounded-full border transition ${
                compact ? 'gap-1 px-1.5 py-0.5 text-[9px]' : 'gap-1.5 px-2.5 py-1 text-xs'
              } ${
                isHidden
                  ? light
                    ? 'border-[#cfc9e4] text-[#a9a3c4]'
                    : 'border-white/10 text-slate-600'
                  : light
                    ? 'border-[#cfc9e4] bg-white/70 text-[#5f5787] hover:border-iris-400/50'
                    : 'border-white/10 bg-white/[0.05] text-slate-300 hover:border-iris-400/40'
              }`}
            >
              <span
                className={`rounded-full ${compact ? 'h-1.5 w-1.5' : 'h-2 w-2'}`}
                style={{ background: isHidden ? '#334155' : color }}
              />
              {label}
            </button>
          )
        })}
      </div>

      <div className={compact ? 'mt-1 min-h-0 flex-1' : 'mt-4 h-80'}>
        <ResponsiveContainer width="100%" height="100%">
          <LineChart data={lineData} margin={compact ? { top: 4, right: 4, bottom: 0, left: 0 } : { top: 8, right: 12, bottom: 0, left: 0 }}>
            <CartesianGrid stroke={light ? 'rgba(30,25,60,0.08)' : 'rgba(255,255,255,0.1)'} vertical={false} />
            <XAxis
              dataKey="label"
              tick={{ fill: light ? '#5f5787' : 'rgba(255,255,255,0.6)', fontSize: compact ? 8 : 11 }}
              tickLine={false}
              axisLine={{ stroke: light ? 'rgba(30,25,60,0.15)' : 'rgba(255,255,255,0.15)' }}
              minTickGap={compact ? 24 : 32}
            />
            <YAxis
              domain={[0, 100]}
              tick={{ fill: light ? '#5f5787' : 'rgba(255,255,255,0.6)', fontSize: compact ? 8 : 11 }}
              tickLine={false}
              axisLine={false}
              width={compact ? 18 : 32}
            />
            <Tooltip contentStyle={tooltipStyle} labelStyle={{ color: 'rgba(255,255,255,0.6)' }} />
            <Legend wrapperStyle={{ display: 'none' }} />
            {SERIES.filter((s) => !hidden.has(s.key)).map(({ key, label, color }) => (
              <Line
                key={key}
                type="monotone"
                dataKey={key}
                name={label}
                stroke={color}
                strokeWidth={compact ? 1.5 : 2}
                dot={compact ? false : { r: 3 }}
                activeDot={{ r: 4 }}
                animationDuration={600}
              />
            ))}
          </LineChart>
        </ResponsiveContainer>
      </div>
    </div>
  )
}
