import { Plus } from 'lucide-react'
import type { Goal } from '../../lib/types'
import { GoalCard } from './GoalCard'

interface GoalGridProps {
  goals: Goal[]
  selectedId: string | null
  onSelect: (goal: Goal) => void
  onCreate: () => void
}

/** 目标卡片网格（含虚线「添加新目标」占位卡） */
export function GoalGrid({ goals, selectedId, onSelect, onCreate }: GoalGridProps) {
  return (
    <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
      {goals.map((goal) => (
        <GoalCard key={goal.id} goal={goal} selected={goal.id === selectedId} onClick={() => onSelect(goal)} />
      ))}

      {/* + 添加新目标占位卡片 */}
      <button
        type="button"
        onClick={onCreate}
        className="flex min-h-[132px] flex-col items-center justify-center gap-2 rounded-xl border border-dashed border-white/20 bg-white/[0.02] text-slate-500 backdrop-blur-sm transition-all duration-200 hover:scale-[1.02] hover:border-iris-400/40 hover:bg-white/5 hover:text-iris-600"
      >
        <Plus size={22} strokeWidth={1.8} />
        <span className="text-sm">添加新目标</span>
      </button>
    </div>
  )
}
