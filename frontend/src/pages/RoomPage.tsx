import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { BarChart3, Layers, PenLine, Plus, Settings, Store, UserPlus, X } from 'lucide-react'
import { Sidebar } from '../components/Sidebar'
import { CompanionChat } from '../components/room/CompanionChat'
import { QuickRecordModal } from '../components/room/QuickRecordModal'
import { ACTION_TOASTS, RoomItem } from '../components/room/RoomItem'
import { useAuth } from '../context/AuthContext'
import { api } from '../lib/api'
import { DIMENSION_ORDER } from '../lib/constants'
import roomBg from '../assets/room-bg.jpg'
import companionAvatar from '../assets/companion-avatar.png'
import type { RoomLayoutItem } from '../lib/types'

type ModeKey = 'orbit' | 'decorate' | 'tour'
const MODES: Array<{ key: ModeKey; label: string }> = [
  { key: 'orbit', label: '空间视角' },
  { key: 'decorate', label: '布置模式' },
  { key: 'tour', label: '漫游模式' },
]

/** 空间商店主题（占位数据，来自效果图） */
const THEMES = [
  { name: '原木书房', icon: '🪑', desc: '温润的原木风格，适合专注学习与思考', inUse: true },
  { name: '星空小屋', icon: '🌌', desc: '静谧的星空主题，助你放松身心', inUse: false },
  { name: '极简白', icon: '⬜', desc: '简约纯净，让思维更加清晰', inUse: false },
  { name: '赛博空间', icon: '🤖', desc: '未来科技感主题，充满想象力', inUse: false },
]

const THEME_TABS = ['我的主题', '官方主题', '收藏主题']

/** 房间物品 → 新背景图家具位置（VL 定位的归一化百分比） */
const FURNITURE_SPOTS: Record<string, { x: number; y: number }> = {
  desk: { x: 50, y: 32 }, // 书桌
  bookshelf: { x: 48, y: 18 }, // 书架
  creative: { x: 13, y: 56 }, // 画架 → 床左侧空地
  explore: { x: 62, y: 18 }, // 旅行地图 → 书架右侧墙面
  health: { x: 72, y: 42 }, // 绿植
  memory: { x: 20, y: 18 }, // 照片墙 → 床头上方墙
  stable: { x: 62, y: 75 }, // 舒适座椅 → 沙发
  execute: { x: 50, y: 41 }, // 计划本 → 书桌前
}

/** 数字空间：全屏 3D 房间（鼠标旋转/缩放/平移）+ 效果图风格悬浮 UI */
export default function RoomPage() {
  const { state } = useAuth()
  const navigate = useNavigate()
  const [mode, setMode] = useState<ModeKey>('orbit')
  const [toast, setToast] = useState<string | null>(null)
  const [guideVisible, setGuideVisible] = useState(false)
  const [chatOpen, setChatOpen] = useState(false)
  const [quickOpen, setQuickOpen] = useState(false)
  const [storeOpen, setStoreOpen] = useState(false)
  const [themeTab, setThemeTab] = useState(0)
  const [plusOne, setPlusOne] = useState(false)
  const [now, setNow] = useState(new Date())

  // 路由守卫已保证登录且资料存在
  if (state.status !== 'authed' || !state.profile) return null
  const bundle = state.profile
  const { profile, room, companion, attributes } = bundle
  const customConfig = room.customConfig as { hasEntered?: boolean }

  // 时钟（30s 刷新）
  useEffect(() => {
    const timer = setInterval(() => setNow(new Date()), 30000)
    return () => clearInterval(timer)
  }, [])

  // 首次进入引导
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

  const dismissGuide = async () => {
    setGuideVisible(false)
    try {
      await api.post('/room/entered')
    } catch {
      // 标记失败不阻塞体验
    }
  }

  const showToast = (msg: string) => setToast(msg)
  const switchMode = (key: ModeKey) => {
    if (key === 'decorate') {
      showToast('布置模式即将上线，敬请期待 ✨')
      return
    }
    setMode(key)
  }

  const roomItems: RoomLayoutItem[] = (bundle.roomLayout.items ?? []).map((item) => ({
    ...item,
    ...(FURNITURE_SPOTS[item.type] ?? { x: 45, y: 45 }),
  }))
  const handleItemClick = (item: RoomLayoutItem) => {
    if (item.action === 'goals') {
      navigate('/goals')
      return
    }
    if (item.action === 'records') {
      navigate('/records')
      return
    }
    const message = item.action ? ACTION_TOASTS[item.action] : null
    setToast(message ?? `「${item.label}」互动功能即将开放 ✨`)
  }

  const handleRecordSaved = () => {
    setPlusOne(true)
    window.setTimeout(() => setPlusOne(false), 1000)
  }

  const spaceValue = DIMENSION_ORDER.reduce((sum, key) => sum + (attributes[key] ?? 0), 0)
  const timeText = `${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`
  const dateText = `${now.getMonth() + 1}月${now.getDate()}日 周${'日一二三四五六'[now.getDay()]}`

  return (
    <div className="night-background flex h-screen overflow-hidden">
      <Sidebar activeKey="room" variant="light" />

      <div className="relative flex min-w-0 flex-1 flex-col">
        {/* 2D 房间背景（效果图中央房间面板裁切，全屏铺满；漫游模式 = 缓慢环游缩放） */}
        <img
          src={roomBg}
          alt=""
          aria-hidden
          className="absolute inset-0 h-full w-full object-cover"
          style={mode === 'tour' ? { animation: 'room-tour 18s ease-in-out infinite alternate' } : undefined}
        />

        {/* 顶部渐隐，保证标题可读 */}
        <div className="pointer-events-none absolute inset-x-0 top-0 h-40 bg-gradient-to-b from-[#0d1322]/75 via-[#0d1322]/25 to-transparent" />
        <div className="pointer-events-none absolute inset-x-0 bottom-0 h-32 bg-gradient-to-t from-[#0d1322]/75 to-transparent" />

        {/* 房间物品热点（原有交互：悬停看名字、点击跳转/提示） */}
        <div className="absolute inset-0 z-[5]">
          {roomItems.map((item) => (
            <RoomItem key={item.id} item={item} onClick={handleItemClick} />
          ))}
        </div>


        {/* 顶部：标题 + 操作按钮 */}
        <header className="pointer-events-none absolute inset-x-6 top-4 z-10 flex items-start justify-between">
          <div>
            <h1 className="text-2xl font-semibold text-white">我的房间</h1>
            <p className="mt-1 hidden text-sm text-slate-400 sm:block">这是属于你的空间，记录、思考、成长的地方</p>
          </div>
          <div className="pointer-events-auto flex gap-2">
            <button
              type="button"
              onClick={() => showToast('空间设置即将上线 ✨')}
              className="glass-panel flex items-center gap-1.5 px-3.5 py-2 text-sm text-slate-200 transition hover:text-white"
            >
              <Settings size={15} strokeWidth={1.8} />
              空间设置
            </button>
            <button
              type="button"
              onClick={() => showToast('邀请好友功能即将上线 ✨')}
              className="glass-panel hidden items-center gap-1.5 px-3.5 py-2 text-sm text-slate-200 transition hover:text-white sm:flex"
            >
              <UserPlus size={15} strokeWidth={1.8} />
              邀请好友
            </button>
          </div>
        </header>

        {/* 模式切换（top-24：位于标题与副标题之下，不重叠） */}
        <div className="pointer-events-none absolute left-6 top-24 z-10">
          <div className="glass-panel pointer-events-auto flex gap-1 p-1">
            {MODES.map((m) => (
              <button
                key={m.key}
                type="button"
                onClick={() => switchMode(m.key)}
                className={`rounded-lg px-3.5 py-1.5 text-sm transition ${
                  mode === m.key
                    ? 'bg-gradient-to-r from-iris-500/90 to-sky-400/80 font-medium text-white shadow-[0_4px_14px_rgba(122,135,245,0.35)]'
                    : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                {m.label}
              </button>
            ))}
          </div>
        </div>

        {/* 右侧：天气 + 时间 + 悬浮小部件（移动端隐藏，避免与模式 Tab 重叠） */}
        <aside className="pointer-events-none absolute right-6 top-16 z-10 hidden w-40 flex-col gap-3 sm:flex">
          <div className="glass-panel pointer-events-auto p-3 text-center">
            <p className="text-xs text-slate-400">23° 晴</p>
            <p className="mt-1 text-2xl font-semibold tabular-nums text-white">{timeText}</p>
            <p className="mt-0.5 text-xs text-slate-400">{dateText}</p>
          </div>
          <div className="pointer-events-auto flex flex-col gap-2">
            <button
              type="button"
              onClick={() => showToast('心得功能即将上线 ✨')}
              className="glass-panel px-3 py-2 text-left text-sm text-slate-300 transition hover:text-white"
            >
              💭 心得
            </button>
            <button
              type="button"
              onClick={() => setQuickOpen(true)}
              className="glass-panel px-3 py-2 text-left text-sm text-slate-300 transition hover:text-white"
            >
              📝 便签
            </button>
          </div>
        </aside>

        {/* 底部栏：小伴问候 + 空间值 + 房间操作 */}
        <div className="pointer-events-none absolute inset-x-6 bottom-4 z-10 flex items-center gap-3">
          {/* 小伴气泡（点击对话） */}
          <button
            type="button"
            onClick={() => setChatOpen(true)}
            className="glass-panel pointer-events-auto flex items-center gap-2.5 px-4 py-2.5 text-left transition hover:border-iris-400/40"
          >
            <img
              src={companionAvatar}
              alt={companion.name}
              className="h-8 w-8 rounded-full object-cover"
            />
            <span className="max-w-[140px] truncate text-sm text-slate-200 sm:max-w-none">{companion.name}：舒适度很好，保持吧！</span>
          </button>

          {/* 空间值（移动端隐藏） */}
          <div className="glass-panel pointer-events-auto hidden px-4 py-2.5 text-sm sm:block">
            <span className="text-slate-400">空间值 </span>
            <span className="font-semibold text-gold-400">{spaceValue}</span>
          </div>

          {/* 右侧操作（pr-[72px] 桌面端给全局 AI 伙伴悬浮窗留空；移动端只留空间商店） */}
          <div className="pointer-events-auto ml-auto flex gap-2 pr-0 sm:pr-[72px]">
            <button
              type="button"
              onClick={() => showToast('楼层系统即将上线 ✨')}
              className="glass-panel hidden items-center gap-1.5 px-3.5 py-2.5 text-sm text-slate-200 transition hover:text-white sm:flex"
            >
              <Layers size={15} strokeWidth={1.8} />
              切换楼层
            </button>
            <button
              type="button"
              onClick={() => showToast('物品库即将上线 ✨')}
              className="glass-panel hidden items-center gap-1.5 px-3.5 py-2.5 text-sm text-slate-200 transition hover:text-white sm:flex"
            >
              <Plus size={15} strokeWidth={1.8} />
              添加物品
            </button>
            <button
              type="button"
              onClick={() => setStoreOpen(true)}
              className="glass-panel flex items-center gap-1.5 px-3.5 py-2.5 text-sm text-slate-200 transition hover:text-white"
            >
              <Store size={15} strokeWidth={1.8} />
              空间商店
            </button>
          </div>
        </div>

        {/* 浮动按钮：快速记录 + 人生大盘 */}
        <button
          type="button"
          onClick={() => setQuickOpen(true)}
          title="快速记录"
          className="absolute bottom-20 right-6 z-20 flex h-12 w-12 items-center justify-center rounded-full bg-gradient-to-br from-iris-500 to-sky-400 text-white shadow-[0_8px_28px_rgba(122,135,245,0.5)] transition hover:scale-105 active:scale-95"
        >
          <PenLine size={20} strokeWidth={2} />
        </button>
        <button
          type="button"
          onClick={() => navigate('/dashboard')}
          title="查看人生大盘"
          className="glass-panel absolute bottom-[8.5rem] right-6 z-20 flex h-10 w-10 items-center justify-center text-slate-300 transition hover:border-iris-400/40 hover:text-white"
        >
          <BarChart3 size={16} strokeWidth={1.8} />
        </button>
        {plusOne && (
          <span className="animate-rise-fade pointer-events-none absolute bottom-28 right-9 z-20 text-lg font-bold text-gold-400">
            +1
          </span>
        )}

        {/* 首次进入引导 */}
        {guideVisible && (
          <div className="absolute inset-0 z-40 flex items-center justify-center bg-night-950/40 backdrop-blur-[2px]">
            <div className="glass-panel-strong mx-6 w-full max-w-sm p-6 text-center">
              <p className="text-4xl">🏠</p>
              <h2 className="mt-3 text-lg font-semibold text-white">欢迎来到你的数字空间</h2>
              <p className="mt-2 text-sm leading-relaxed text-slate-400">
                这是属于你的数字空间：漫游模式可以自动环游房间，点小伴可以聊天，右下角随时记下灵感。
              </p>
              <button type="button" onClick={() => void dismissGuide()} className="btn-gradient mt-5 w-full">
                开始探索
              </button>
            </div>
          </div>
        )}

        {/* 空间商店抽屉 */}
        {storeOpen && (
          <div className="absolute inset-0 z-30 flex flex-col justify-end bg-night-950/30">
            <button
              type="button"
              aria-label="关闭空间商店"
              onClick={() => setStoreOpen(false)}
              className="absolute inset-0 cursor-default"
            />
            <div className="glass-panel-strong animate-slide-in-right relative z-10 mx-auto mb-4 w-full max-w-3xl rounded-2xl p-5">
              <div className="flex items-center justify-between">
                <h2 className="text-lg font-semibold text-white">空间商店</h2>
                <button
                  type="button"
                  onClick={() => setStoreOpen(false)}
                  className="text-slate-400 transition hover:text-white"
                >
                  <X size={18} />
                </button>
              </div>

              {/* 主题分类 Tab */}
              <div className="mt-3 flex gap-1 border-b border-white/[0.08] pb-2">
                {THEME_TABS.map((tab, i) => (
                  <button
                    key={tab}
                    type="button"
                    onClick={() => setThemeTab(i)}
                    className={`rounded-lg px-3 py-1.5 text-sm transition ${
                      themeTab === i
                        ? 'bg-white/[0.08] font-medium text-white'
                        : 'text-slate-400 hover:text-slate-200'
                    }`}
                  >
                    {tab}
                  </button>
                ))}
              </div>

              {/* 主题卡片 */}
              <div className="mt-3 grid grid-cols-2 gap-3 lg:grid-cols-4">
                {THEMES.map((theme) => (
                  <button
                    key={theme.name}
                    type="button"
                    onClick={() => showToast(theme.inUse ? '正在使用该主题 ✨' : '主题切换功能即将上线 ✨')}
                    className="glass-panel relative p-3.5 text-left transition hover:border-iris-400/40"
                  >
                    {theme.inUse && (
                      <span className="absolute right-2.5 top-2.5 rounded-full bg-iris-500/90 px-2 py-0.5 text-[10px] text-white">
                        使用中
                      </span>
                    )}
                    <p className="text-2xl">{theme.icon}</p>
                    <p className="mt-2 text-sm font-medium text-white">{theme.name}</p>
                    <p className="mt-1 text-xs leading-relaxed text-slate-400">{theme.desc}</p>
                  </button>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* 占位交互提示 */}
        {toast && (
          <div className="pointer-events-none absolute bottom-32 left-1/2 z-40 -translate-x-1/2">
            <p className="glass-panel-strong animate-fade-in whitespace-nowrap px-5 py-2.5 text-sm text-slate-200">
              {toast}
            </p>
          </div>
        )}

        {/* AI 伙伴对话面板 */}
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
      </div>
    </div>
  )
}
