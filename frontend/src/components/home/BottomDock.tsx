import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { ChevronDown, ChevronUp } from 'lucide-react'

interface BottomDockProps {
  onQuickRecord: () => void
  onNewGoal: () => void
}

interface DockAction {
  label: string
  icon: string
  /** 图标底色 */
  color: string
  run: () => void
}

/** 底部快捷栏（深色毛玻璃 dock）：可折叠收放，展开为 7 个快捷操作 */
export function BottomDock({ onQuickRecord, onNewGoal }: BottomDockProps) {
  const navigate = useNavigate()
  const [collapsed, setCollapsed] = useState(false)
  const [toast, setToast] = useState<string | null>(null)

  const showToast = (text: string) => {
    setToast(text)
    window.setTimeout(() => setToast(null), 2000)
  }

  const actions: DockAction[] = [
    { label: '新建记录', icon: '📝', color: 'bg-pink-100', run: onQuickRecord },
    { label: '新建目标', icon: '🎯', color: 'bg-sky-100', run: onNewGoal },
    { label: '今日复盘', icon: '🌙', color: 'bg-purple-100', run: onQuickRecord },
    { label: '成长分析', icon: '📈', color: 'bg-emerald-100', run: () => navigate('/growth') },
    { label: '时间轴', icon: '🕐', color: 'bg-cyan-100', run: () => navigate('/records?view=timeline') },
    { label: '灵感笔记', icon: '💡', color: 'bg-amber-100', run: onQuickRecord },
    { label: '自定义', icon: '⚙️', color: 'bg-slate-100', run: () => showToast('自定义快捷入口即将上线') },
  ]

  return (
    <div className="px-6 pb-4">
      {collapsed ? (
        /* 收起：悬浮小胶囊 */
        <button
          type="button"
          onClick={() => setCollapsed(false)}
          title="展开快捷入口"
          className="mx-auto flex items-center gap-1.5 rounded-full border border-[#cfc9e4]/70 bg-white/55 px-4 py-2 text-xs text-[#3a3652] shadow-[0_8px_24px_rgba(90,80,140,0.15)] backdrop-blur-xl transition hover:bg-white/75"
        >
          ⚡ 快捷入口
          <ChevronUp size={14} />
        </button>
      ) : (
        /* 展开：快捷操作栏（flex-wrap 移动端换行；pr-[72px] 桌面端右侧给全局 AI 伙伴悬浮窗留空） */
        <div className="relative mx-auto flex max-w-[1400px] flex-wrap items-center gap-2 rounded-2xl border border-[#cfc9e4]/70 bg-white/55 pl-5 pr-5 py-2 shadow-[0_10px_30px_rgba(90,80,140,0.15)] backdrop-blur-xl sm:pr-[72px]">
          <span className="mr-3 shrink-0 text-xs font-medium tracking-wide text-[#5f5787]">快捷入口</span>
          {actions.map((action) => (
            <button
              key={action.label}
              type="button"
              onClick={action.run}
              className="flex shrink-0 items-center gap-2 rounded-xl px-3 py-1.5 text-xs font-medium text-[#3a3652] transition hover:bg-white/70"
            >
              <span className={`flex h-7 w-7 items-center justify-center rounded-lg text-sm ${action.color}`}>
                {action.icon}
              </span>
              {action.label}
            </button>
          ))}

          {/* 折叠按钮 */}
          <button
            type="button"
            onClick={() => setCollapsed(true)}
            title="收起快捷入口"
            className="ml-auto flex shrink-0 items-center justify-center rounded-lg p-1.5 text-[#8b84a8] transition hover:bg-white/70 hover:text-[#3a3652]"
          >
            <ChevronDown size={16} />
          </button>

          {toast && (
            <span className="animate-fade-in absolute bottom-full left-1/2 mb-2 -translate-x-1/2 rounded-lg bg-night-800 px-3 py-1.5 text-xs text-slate-200 shadow-lg">
              {toast}
            </span>
          )}
        </div>
      )}
    </div>
  )
}
