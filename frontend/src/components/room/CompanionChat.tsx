import { forwardRef, useEffect, useImperativeHandle, useRef, useState } from 'react'
import { Send, X } from 'lucide-react'
import { streamCompanionChat } from '../../lib/companionApi'
import type { Companion } from '../../lib/types'
import companionAvatar from '../../assets/companion-avatar.png'

interface ChatMessage {
  role: 'user' | 'assistant'
  content: string
  suggestedAction?: string
}

/** 快捷开场白（仅首次打开时展示） */
const QUICK_PROMPTS = ['今天有点累', '聊聊我的成长', '给我一点鼓励']

interface CompanionChatPanelProps {
  companion: Companion
  nickname: string
  /** 提供时显示关闭按钮（悬浮形态使用，独立页面不需要） */
  onClose?: () => void
  /** dark：深色毛玻璃（悬浮形态，默认）；light：浅色（AI 伙伴页统一浅色主题） */
  variant?: 'dark' | 'light'
}

/** 对外暴露的指令句柄（供外部快捷指令直接发消息） */
export interface CompanionChatPanelHandle {
  send: (text: string) => void
}

/**
 * 聊天面板核心（无定位，填满父容器）：
 * 由悬浮形态 CompanionChat 与独立页面 CompanionPage 复用。
 * 组件卸载即销毁消息（不保留历史），流式逐字渲染 AI 回复。
 */
export const CompanionChatPanel = forwardRef<CompanionChatPanelHandle, CompanionChatPanelProps>(
  function CompanionChatPanel({ companion, nickname, onClose, variant = 'dark' }, ref) {
  const [messages, setMessages] = useState<ChatMessage[]>([
    {
      role: 'assistant',
      content: `${nickname}，我是${companion.name}。今天想聊点什么？`,
    },
  ])
  const [input, setInput] = useState('')
  const [streaming, setStreaming] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const scrollRef = useRef<HTMLDivElement>(null)

  // 新消息时自动滚到底部
  useEffect(() => {
    const el = scrollRef.current
    if (el) el.scrollTop = el.scrollHeight
  }, [messages])

  const send = async (text: string) => {
    const trimmed = text.trim()
    if (!trimmed || streaming) return

    setInput('')
    setError(null)
    setMessages((prev) => [
      ...prev,
      { role: 'user', content: trimmed },
      { role: 'assistant', content: '' },
    ])
    setStreaming(true)

    try {
      await streamCompanionChat(trimmed, {
        onDelta: (chunk) => {
          setMessages((prev) => {
            const next = [...prev]
            const last = next[next.length - 1]
            next[next.length - 1] = { ...last, content: last.content + chunk }
            return next
          })
        },
        onDone: (data) => {
          setMessages((prev) => {
            const next = [...prev]
            next[next.length - 1] = {
              role: 'assistant',
              content: data.reply || '（小伴暂时没想到说什么…）',
              suggestedAction: data.suggestedAction,
            }
            return next
          })
        },
        onError: (message) => {
          setError(message)
          // 移除空的 AI 占位气泡
          setMessages((prev) => {
            const next = [...prev]
            const last = next[next.length - 1]
            if (last.role === 'assistant' && last.content === '') next.pop()
            return next
          })
        },
      })
    } finally {
      setStreaming(false)
    }
  }

  // 对外暴露发送入口（右侧「我能帮你」快捷指令使用）
  useImperativeHandle(ref, () => ({ send }))

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    // isComposing：中文输入法选词回车不触发发送
    if (e.key === 'Enter' && !e.nativeEvent.isComposing) {
      e.preventDefault()
      void send(input)
    }
  }

  const isFirstRound = messages.length === 1
  const light = variant === 'light'

  return (
    <div className="flex h-full w-full flex-col overflow-hidden">
      {/* 头部 */}
      <header
        className={`flex items-center gap-3 border-b px-5 py-4 ${light ? 'border-[#cfc9e4]/60' : 'border-white/[0.06]'}`}
      >
        <span className="relative block h-10 w-10 shrink-0">
          <img
            src={companionAvatar}
            alt={companion.name}
            className="h-10 w-10 rounded-full object-cover"
          />
          <span
            className={`absolute -right-0.5 -top-0.5 h-2.5 w-2.5 rounded-full border-2 bg-emerald-400 ${
              light ? 'border-white' : 'border-night-900'
            }`}
          />
        </span>
        <div className="min-w-0 flex-1">
          <p className={`text-sm font-medium ${light ? 'text-[#2c2947]' : 'text-white'}`}>
            {companion.name}
            <span className={`ml-1.5 text-xs font-normal ${light ? 'text-[#5f5787]' : 'text-slate-400'}`}>
              · {companion.personality}
            </span>
          </p>
          <p className={`text-xs ${light ? 'text-emerald-600' : 'text-emerald-400'}`}>
            在线 · 关系阶段：{companion.relationshipStage}
          </p>
        </div>
        {onClose && (
          <button
            type="button"
            onClick={onClose}
            title="关闭"
            className={`rounded-lg p-1.5 transition ${
              light ? 'text-[#5f5787] hover:bg-black/5 hover:text-[#2c2947]' : 'text-slate-400 hover:bg-white/[0.06] hover:text-white'
            }`}
          >
            <X size={18} strokeWidth={1.8} />
          </button>
        )}
      </header>

      {/* 消息列表 */}
      <div ref={scrollRef} className="flex-1 space-y-3 overflow-y-auto px-4 py-4">
        {/* 日期分隔线 */}
        <p className={`pt-1 text-center text-[11px] ${light ? 'text-[#8b84a8]' : 'text-slate-500'}`}>今天</p>
        {messages.map((msg, index) => {
          const isUser = msg.role === 'user'
          const isStreamingBubble = !isUser && streaming && index === messages.length - 1
          return (
            <div key={index} className={`flex ${isUser ? 'justify-end' : 'justify-start'}`}>
              <div className="max-w-[85%]">
                <div
                  className={`whitespace-pre-wrap break-words rounded-2xl px-3.5 py-2.5 text-sm leading-relaxed ${
                    isUser
                      ? 'rounded-br-md bg-gradient-to-br from-iris-500 to-sky-500 text-white'
                      : light
                        ? 'rounded-bl-md border border-black/5 bg-white/80 text-[#3a3652] shadow-sm'
                        : 'rounded-bl-md border border-white/10 bg-white/[0.07] text-slate-200'
                  }`}
                >
                  {msg.content}
                  {isStreamingBubble && (
                    <>
                      {msg.content === '' ? (
                        <span className="typing-dots inline-flex items-center">
                          <span />
                          <span />
                          <span />
                        </span>
                      ) : (
                        <span className={`ml-0.5 animate-pulse ${light ? 'text-iris-500' : 'text-iris-300'}`}>▍</span>
                      )}
                    </>
                  )}
                </div>
                {!isUser && msg.suggestedAction && !isStreamingBubble && (
                  <p
                    className={`mt-1.5 inline-block rounded-full border px-3 py-1 text-xs ${
                      light
                        ? 'border-iris-400/40 bg-iris-500/10 text-iris-600'
                        : 'border-iris-400/30 bg-iris-500/10 text-iris-300'
                    }`}
                  >
                    ✨ {msg.suggestedAction}
                  </p>
                )}
              </div>
            </div>
          )
        })}
      </div>

      {/* 快捷开场白 */}
      {isFirstRound && !streaming && (
        <div className="flex flex-wrap gap-2 px-4 pb-2">
          {QUICK_PROMPTS.map((prompt) => (
            <button
              key={prompt}
              type="button"
              onClick={() => void send(prompt)}
              className={`rounded-full border px-3 py-1.5 text-xs transition ${
                light
                  ? 'border-[#cfc9e4] bg-white/70 text-[#5f5787] hover:border-iris-400/60 hover:text-[#5a52a8]'
                  : 'border-white/10 bg-white/[0.05] text-slate-300 hover:border-iris-400/40 hover:text-white'
              }`}
            >
              {prompt}
            </button>
          ))}
        </div>
      )}

      {error && <p className={`px-5 pb-2 text-xs ${light ? 'text-red-500' : 'text-red-400'}`}>{error}</p>}

      {/* 输入区 */}
      <div className={`border-t p-4 ${light ? 'border-[#cfc9e4]/60' : 'border-white/[0.06]'}`}>
        <div className="flex items-center gap-2.5">
          <input
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder={`和${companion.name}说点什么…`}
            disabled={streaming}
            className={`flex-1 rounded-xl border px-4 py-2.5 text-sm outline-none backdrop-blur transition focus:border-iris-400/50 focus:ring-2 focus:ring-iris-500/20 disabled:opacity-50 ${
              light
                ? 'border-[#cfc9e4] bg-white/80 text-[#3a3652] placeholder-[#8b84a8]'
                : 'border-white/10 bg-white/[0.05] text-slate-200 placeholder-slate-500'
            }`}
            maxLength={500}
          />
          <button
            type="button"
            onClick={() => void send(input)}
            disabled={streaming || !input.trim()}
            title="发送（Enter）"
            className="btn-gradient flex h-10 w-10 shrink-0 items-center justify-center !rounded-xl disabled:cursor-not-allowed disabled:opacity-40"
          >
            <Send size={16} strokeWidth={2} />
          </button>
        </div>
        <p className={`mt-2 text-[11px] ${light ? 'text-[#8b84a8]' : 'text-slate-600'}`}>
          Enter 发送 · 小伴通常几秒内开始回复 · 关闭面板后对话不保留
        </p>
      </div>
    </div>
  )
  },
)

interface CompanionChatProps {
  companion: Companion
  nickname: string
  onClose: () => void
}

/** 房间内的悬浮对话面板（毛玻璃覆盖层，关闭即销毁） */
export function CompanionChat({ companion, nickname, onClose }: CompanionChatProps) {
  return (
    <div className="absolute inset-0 z-40 flex justify-end">
      {/* 背景遮罩：点击关闭 */}
      <button
        type="button"
        aria-label="关闭对话"
        onClick={onClose}
        className="absolute inset-0 cursor-default bg-night-950/40 backdrop-blur-[2px]"
      />

      {/* 对话面板 */}
      <div className="glass-panel-strong animate-slide-in-right relative z-10 m-4 flex h-[calc(100%-2rem)] w-full max-w-md flex-col overflow-hidden">
        <CompanionChatPanel companion={companion} nickname={nickname} onClose={onClose} />
      </div>
    </div>
  )
}
