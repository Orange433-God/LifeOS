import { useState } from 'react'
import { PenLine } from 'lucide-react'
import type { Companion, LifeRecord } from '../../lib/types'
import { CompanionChatPanel } from '../room/CompanionChat'
import { QuickRecordModal } from '../room/QuickRecordModal'
import companionAvatar from '../../assets/companion-avatar.png'

interface HomeHeroProps {
  nickname: string
  /** 使用天数 */
  days: number
  companion: Companion
  /** 最近一条记录（对话卡引用） */
  lastRecord: LifeRecord | null
  /** 数据变更后刷新首页数据 */
  onRefresh: () => void
}

/** 按时段问候 */
function greetingByHour(hour: number): string {
  if (hour < 6) return '夜深了'
  if (hour < 9) return '早上好'
  if (hour < 12) return '上午好'
  if (hour < 14) return '中午好'
  if (hour < 18) return '下午好'
  return '晚上好'
}

/** 问候区 + AI 伙伴欢迎卡（点击打开对话面板） */
export function HomeHero({ nickname, days, companion, lastRecord, onRefresh }: HomeHeroProps) {
  const [chatOpen, setChatOpen] = useState(false)
  const [quickOpen, setQuickOpen] = useState(false)

  const hour = new Date().getHours()
  const quote = lastRecord?.rawContent?.trim()

  return (
    <>
      {/* 问候（窄栏布局：按钮在文字下方） */}
      <div>
        <h1 className="text-2xl font-semibold text-[#2c2947]">
          {greetingByHour(hour)}，{nickname}
        </h1>
        <p className="mt-1.5 text-sm text-[#5f5787]">今天是你使用 LifeOS 的第 {days} 天</p>
        <button
          type="button"
          onClick={() => setQuickOpen(true)}
          className="btn-gradient mt-3 flex items-center gap-1.5 px-3.5 py-2"
        >
          <PenLine size={15} />
          去记录
        </button>
      </div>

      {/* AI 伙伴欢迎卡 */}
      <button
        type="button"
        onClick={() => setChatOpen(true)}
        className="home-card group mt-4 w-full p-3 text-left transition hover:brightness-[1.03]"
      >
        <div className="flex items-center gap-3">
          <img
            src={companionAvatar}
            alt={companion.name}
            className="h-10 w-10 shrink-0 rounded-full object-cover shadow-[0_4px_14px_rgba(255,160,90,0.4)]"
          />
          <div className="min-w-0">
            <p className="text-[11px] font-medium tracking-wide text-[#47426e]">AI 伙伴 · {companion.name}</p>
            <p className="mt-0.5 truncate text-[13px] leading-relaxed text-[#2b2847]">
              {quote ? `我记得你上次说「${quote.length > 18 ? `${quote.slice(0, 18)}…` : quote}」，` : ''}
              今天过得怎么样？需要我帮你复盘一下吗？
            </p>
          </div>
          <span className="ml-auto shrink-0 text-xs text-[#5f5787] transition group-hover:translate-x-0.5">聊聊 →</span>
        </div>
      </button>

      {/* 悬浮对话面板（关闭即销毁） */}
      {chatOpen && (
        <div className="fixed inset-0 z-40 flex justify-end">
          <button
            type="button"
            aria-label="关闭对话"
            onClick={() => setChatOpen(false)}
            className="absolute inset-0 cursor-default bg-night-950/40 backdrop-blur-[2px]"
          />
          <div className="glass-panel animate-slide-in-right relative z-10 m-4 flex h-[calc(100%-2rem)] w-full max-w-md flex-col overflow-hidden">
            <CompanionChatPanel companion={companion} nickname={nickname} onClose={() => setChatOpen(false)} />
          </div>
        </div>
      )}

      {quickOpen && (
        <QuickRecordModal
          onClose={() => setQuickOpen(false)}
          onSaved={() => {
            setQuickOpen(false)
            onRefresh()
          }}
        />
      )}
    </>
  )
}
