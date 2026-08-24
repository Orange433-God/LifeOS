import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { BarChart3, ChevronDown, LogOut, PenLine } from 'lucide-react'
import { getRecentRecords } from '../../api/records'
import { api } from '../../lib/api'
import { avatarStyleOf, RECORD_TYPE_ICONS, RECORD_TYPE_LABELS } from '../../lib/constants'
import type { LifeRecord, ProfileBundle, RoomLayoutItem } from '../../lib/types'
import { AvatarDisplay } from './AvatarDisplay'
import { CompanionChat } from './CompanionChat'
import { CompanionDisplay } from './CompanionDisplay'
import { QuickRecordModal } from './QuickRecordModal'
import { RoomContainer } from './RoomContainer'
import { ACTION_TOASTS, RoomItem } from './RoomItem'

/** Avatar 固定在房间中央偏下，AI 伙伴在书桌旁 */
const AVATAR_POS = { x: 40, y: 70 }
const COMPANION_POS = { x: 65, y: 55 }

const greetingByHour = (): string => {
  const h = new Date().getHours()
  if (h >= 5 && h < 11) return '早上好'
  if (h >= 11 && h < 13) return '中午好'
  if (h >= 13 && h < 18) return '下午好'
  return '晚上好'
}

interface RoomViewProps {
  bundle: ProfileBundle
  onLogout: () => void
}

/** 数字房间主视图：背景 + 物品 + Avatar + AI 伙伴 + 状态条 + 快速记录 + 引导 + 占位交互 */
export function RoomView({ bundle, onLogout }: RoomViewProps) {
  const navigate = useNavigate()
  const { profile, room, companion, roomLayout } = bundle
  const [toast, setToast] = useState<string | null>(null)
  const [guideVisible, setGuideVisible] = useState(false)
  const [chatOpen, setChatOpen] = useState(false)
  const [quickOpen, setQuickOpen] = useState(false)
  const [records, setRecords] = useState<LifeRecord[]>([])
  const [recordsPreviewOpen, setRecordsPreviewOpen] = useState(false)
  const [plusOne, setPlusOne] = useState(false)

  const customConfig = room.customConfig as { hasEntered?: boolean }
  const styleMeta = avatarStyleOf(profile.avatarStyle)
  const daysUsed = Math.max(
    1,
    Math.ceil((Date.now() - new Date(profile.createdAt).getTime()) / 86_400_000),
  )

  // 最近记录（用于今日计数与预览）
  const refreshRecords = async () => {
    try {
      setRecords(await getRecentRecords(10))
    } catch {
      // 加载失败不阻塞房间交互
    }
  }

  useEffect(() => {
    void refreshRecords()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const todayCount = records.filter(
    (r) => new Date(r.recordedAt).toDateString() === new Date().toDateString(),
  ).length
  const recentPreview = records.slice(0, 3)

  // 首次进入房间：显示引导气泡
  useEffect(() => {
    if (!customConfig.hasEntered) setGuideVisible(true)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  // toast 自动消失
  useEffect(() => {
    if (!toast) return
    const timer = setTimeout(() => setToast(null), 2500)
    return () => clearTimeout(timer)
  }, [toast])

  const handleItemClick = (item: RoomLayoutItem) => {
    // 计划本 → 目标与行动页（已接入真实路由）
    if (item.action === 'goals') {
      navigate('/goals')
      return
    }
    const message = item.action ? ACTION_TOASTS[item.action] : null
    setToast(message ?? `「${item.label}」互动功能即将开放 ✨`)
  }

  const dismissGuide = async () => {
    setGuideVisible(false)
    try {
      await api.post('/room/entered')
    } catch {
      // 标记失败也不阻塞体验，下次进入时引导会再次出现
    }
  }

  const handleRecordSaved = () => {
    void refreshRecords()
    setPlusOne(true)
    window.setTimeout(() => setPlusOne(false), 1000)
  }

  return (
    <RoomContainer theme={roomLayout.theme} environment={roomLayout.environment}>
      {/* 家具与装饰（按属性动态生成） */}
      {roomLayout.items.map((item) => (
        <RoomItem key={item.id} item={item} onClick={handleItemClick} />
      ))}

      {/* 用户 Avatar 与 AI 伙伴 */}
      <AvatarDisplay
        profile={profile}
        x={AVATAR_POS.x}
        y={AVATAR_POS.y}
        onClick={() => setToast('这是你的数字分身 ✨')}
      />
      <CompanionDisplay
        companion={companion}
        x={COMPANION_POS.x}
        y={COMPANION_POS.y}
        onClick={() => setChatOpen(true)}
      />

      {/* 顶部状态条：问候 · 使用天数 · 今日记录（可点击展开预览） */}
      <div className="glass-panel absolute left-4 top-4 z-20 flex flex-wrap items-center gap-x-3 gap-y-1 px-4 py-2.5 text-sm">
        <span className="text-slate-300">
          {greetingByHour()}，<span className="font-semibold text-white">{profile.nickname}</span>
        </span>
        <span className="text-slate-600">·</span>
        <span className="text-slate-400">已陪伴 {daysUsed} 天</span>
        <span className="text-slate-600">·</span>
        <button
          type="button"
          onClick={() => setRecordsPreviewOpen((open) => !open)}
          className="flex items-center gap-1 text-slate-400 transition hover:text-white"
        >
          今日记录 {todayCount} 条
          <ChevronDown
            size={14}
            className={`transition-transform ${recordsPreviewOpen ? 'rotate-180' : ''}`}
          />
        </button>
      </div>

      {/* 最近记录预览 */}
      {recordsPreviewOpen && (
        <div className="glass-panel animate-fade-in absolute left-4 top-16 z-20 w-72 p-3">
          {recentPreview.length === 0 ? (
            <p className="px-2 py-1 text-xs text-slate-500">
              还没有记录，点右下角 <span className="text-iris-300">📝</span> 记下第一笔吧
            </p>
          ) : (
            <ul className="space-y-1">
              {recentPreview.map((record) => (
                <li key={record.id}>
                  <button
                    type="button"
                    onClick={() => setToast('记录详情页即将开放 ✨')}
                    className="flex w-full items-center gap-2 rounded-lg px-2 py-1.5 text-left text-xs text-slate-300 transition hover:bg-white/[0.06] hover:text-white"
                  >
                    <span className="shrink-0">{RECORD_TYPE_ICONS[record.type] ?? '📝'}</span>
                    <span className="min-w-0 flex-1 truncate">{record.title ?? record.rawContent}</span>
                    <span className="shrink-0 text-slate-500">{RECORD_TYPE_LABELS[record.type]}</span>
                  </button>
                </li>
              ))}
            </ul>
          )}
        </div>
      )}

      {/* 右上角：用户头像 + 登出 */}
      <div className="absolute right-4 top-4 z-20 flex items-center gap-2.5">
        <span
          title={profile.nickname}
          className="flex h-10 w-10 items-center justify-center rounded-full border border-white/15 bg-night-800/70 text-xl backdrop-blur"
        >
          {styleMeta?.emoji ?? '✦'}
        </span>
        <button
          type="button"
          onClick={onLogout}
          title="退出登录"
          className="glass-panel flex h-10 w-10 items-center justify-center text-slate-300 transition hover:text-white"
        >
          <LogOut size={16} strokeWidth={1.8} />
        </button>
      </div>

      {/* 快速记录浮动按钮（右下角，z 高于房间物品、低于对话面板） */}
      <button
        type="button"
        onClick={() => setQuickOpen(true)}
        title="快速记录"
        className="absolute bottom-5 right-5 z-30 flex h-14 w-14 items-center justify-center rounded-full bg-gradient-to-br from-iris-500 to-sky-400 text-white shadow-[0_8px_28px_rgba(122,135,245,0.5)] transition hover:scale-105 active:scale-95"
      >
        <PenLine size={22} strokeWidth={2} />
      </button>
      {/* 人生大盘快捷入口 */}
      <button
        type="button"
        onClick={() => navigate('/dashboard')}
        title="查看人生大盘"
        className="glass-panel absolute bottom-24 right-5 z-30 flex h-11 w-11 items-center justify-center text-slate-300 transition hover:border-iris-400/40 hover:text-white"
      >
        <BarChart3 size={18} strokeWidth={1.8} />
      </button>
      {plusOne && (
        <span className="animate-rise-fade pointer-events-none absolute bottom-16 right-7 z-30 text-lg font-bold text-gold-400">
          +1
        </span>
      )}

      {/* 首次进入引导 */}
      {guideVisible && (
        <div className="absolute inset-0 z-30 flex items-center justify-center bg-night-950/40 backdrop-blur-[2px]">
          <div className="glass-panel mx-6 w-full max-w-sm p-6 text-center">
            <p className="text-4xl">🏠</p>
            <h2 className="mt-3 text-lg font-semibold text-white">欢迎来到你的数字空间</h2>
            <p className="mt-2 text-sm leading-relaxed text-slate-400">
              房间会随着你的成长而变化——悬停物品查看名字，点击探索更多。试试点击书桌和小伴吧。
            </p>
            <button type="button" onClick={() => void dismissGuide()} className="btn-gradient mt-5 w-full">
              开始探索
            </button>
          </div>
        </div>
      )}

      {/* 占位交互提示 */}
      {toast && (
        <div className="pointer-events-none absolute bottom-6 left-1/2 z-30 -translate-x-1/2">
          <p className="glass-panel animate-fade-in whitespace-nowrap px-5 py-2.5 text-sm text-slate-200">
            {toast}
          </p>
        </div>
      )}

      {/* AI 伙伴对话面板（关闭即销毁，不保留历史） */}
      {chatOpen && (
        <CompanionChat
          companion={companion}
          nickname={profile.nickname}
          onClose={() => setChatOpen(false)}
        />
      )}

      {/* 快速记录模态框 */}
      {quickOpen && (
        <QuickRecordModal onClose={() => setQuickOpen(false)} onSaved={handleRecordSaved} />
      )}
    </RoomContainer>
  )
}
