import {
  Bot,
  DoorOpen,
  Gauge,
  Home,
  Library,
  LogOut,
  Menu,
  NotebookPen,
  Settings,
  Target,
  TrendingUp,
  Users,
  type LucideIcon,
} from 'lucide-react'
import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { getFriends } from '../api/social'
import { getStorageUsage } from '../api/resources'
import { StorageManager } from './resources/StorageManager'
import { GlobalSearch } from './GlobalSearch'
import { useAuth } from '../context/AuthContext'
import { formatBytes, SLOGAN } from '../lib/constants'
import { USER_LEVEL } from '../lib/mockData'
import defaultAvatar from '../assets/dashboard-avatar.png'
import { Logo } from './Logo'

interface NavItem {
  key: string
  label: string
  icon: LucideIcon
}

/** 侧边栏底部：云空间使用情况 + 管理入口 */
function StorageUsageBar({ light = false }: { light?: boolean }) {
  const [open, setOpen] = useState(false)
  const [usage, setUsage] = useState<{ used: number; total: number; usedPercent: number } | null>(null)

  useEffect(() => {
    getStorageUsage()
      .then(setUsage)
      .catch(() => {
        // 用量加载失败不打扰用户
      })
  }, [])

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        title="管理存储空间"
        className={`mb-3 w-full rounded-lg px-2.5 py-2 text-left transition ${
          light ? 'bg-[#e4e1f2] hover:bg-[#ddd9ee]' : 'bg-white/[0.04] hover:bg-white/[0.08]'
        }`}
      >
        <div
          className={`flex items-center justify-between text-[11px] ${light ? 'text-[#8b84a8]' : 'text-slate-500'}`}
        >
          <span>☁️ 云空间</span>
          <span>
            {usage ? formatBytes(usage.used) : '—'} / {usage ? formatBytes(usage.total) : '10 GB'}
          </span>
        </div>
        <div className={`mt-1.5 h-1 rounded-full ${light ? 'bg-[#d3cfec]' : 'bg-white/10'}`}>
          <div
            className="h-1 rounded-full bg-gradient-to-r from-blue-500 to-purple-500 transition-all duration-500"
            style={{ width: `${Math.min(usage?.usedPercent ?? 0, 100)}%` }}
          />
        </div>
      </button>
      {open && <StorageManager onClose={() => setOpen(false)} />}
    </>
  )
}

/** 侧边栏底部：在线好友数（MVP 以 showOnlineStatus 映射，非实时） */
function OnlineFriendCount({ onOpen, light = false }: { onOpen: () => void; light?: boolean }) {
  const [count, setCount] = useState(0)

  useEffect(() => {
    let cancelled = false
    getFriends()
      .then((friends) => {
        if (!cancelled) setCount(friends.filter((f) => f.user.online).length)
      })
      .catch(() => {
        // 好友列表加载失败不打扰用户
      })
    return () => {
      cancelled = true
    }
  }, [])

  if (count === 0) return null

  return (
    <button
      type="button"
      onClick={onOpen}
      title="打开好友列表"
      className={`flex w-full items-center gap-1.5 rounded-lg px-2 py-1.5 text-[11px] transition ${
        light ? 'text-emerald-600 hover:bg-white/70' : 'text-emerald-400 hover:bg-white/[0.06]'
      }`}
    >
      <span className="h-1.5 w-1.5 rounded-full bg-emerald-400" />
      在线 {count} 人
    </button>
  )
}

/** 主导航（其余未接入项为占位，阶段 7+ 逐步开放） */
const NAV_ITEMS: NavItem[] = [
  { key: 'home', label: '首页', icon: Home },
  { key: 'room', label: '数字空间', icon: DoorOpen },
  { key: 'companion', label: 'AI伙伴', icon: Bot },
  { key: 'dashboard', label: '人生大盘', icon: Gauge },
  { key: 'records', label: '人生记录', icon: NotebookPen },
  { key: 'goals', label: '目标与行动', icon: Target },
  { key: 'growth', label: '成长分析', icon: TrendingUp },
  { key: 'social', label: '社交链接', icon: Users },
  { key: 'resources', label: '资源中心', icon: Library },
  { key: 'settings', label: '设置中心', icon: Settings },
]

/** 已接入路由的导航目标 */
const NAV_TARGETS: Record<string, string> = {
  home: '/',
  room: '/room',
  companion: '/companion',
  dashboard: '/dashboard',
  records: '/records',
  goals: '/goals',
  growth: '/growth',
  social: '/friends',
  resources: '/resources',
  settings: '/settings',
}

interface SidebarProps {
  /** 当前激活的导航项 key（默认 home） */
  activeKey?: string
  /** dark：深色玻璃（默认，其他页面）；light：浅薰衣草（首页） */
  variant?: 'dark' | 'light'
}

export function Sidebar({ activeKey = 'home', variant = 'dark' }: SidebarProps) {
  const { state, logout } = useAuth()
  const navigate = useNavigate()
  const light = variant === 'light'

  if (state.status !== 'authed' || !state.profile) return null
  const { profile } = state.profile

  const handleLogout = async () => {
    await logout()
    navigate('/login', { replace: true })
  }

  const [mobileOpen, setMobileOpen] = useState(false)

  return (
    <>
      {/* 移动端菜单按钮（<1024px 侧边栏折叠为抽屉） */}
      <button
        type="button"
        onClick={() => setMobileOpen(true)}
        className="fixed left-4 top-4 z-40 rounded-xl border border-white/10 bg-white/10 p-2 text-slate-300 backdrop-blur lg:hidden"
      >
        <Menu size={18} strokeWidth={1.8} />
      </button>
      {mobileOpen && (
        <button
          type="button"
          aria-label="关闭菜单"
          onClick={() => setMobileOpen(false)}
          className="fixed inset-0 z-40 bg-night-950/60 backdrop-blur-[2px] lg:hidden"
        />
      )}

      <aside
        className={`fixed inset-y-0 left-0 z-50 flex w-56 flex-col transition-transform lg:relative lg:w-56 lg:translate-x-0 ${
          mobileOpen ? 'translate-x-0' : '-translate-x-full'
        } ${
          light
            ? 'border-r border-[#dcd9ec]/70 bg-[#f0eff9]/85 backdrop-blur-xl'
            : 'border-r border-white/[0.06] bg-night-950/95 backdrop-blur-xl lg:bg-white/[0.02]'
        }`}
      >
        {/* Logo + Slogan + 全局搜索（浅色变体：搜索在顶栏，此处不显示） */}
        <div className="px-5 pb-2 pt-6">
          <Logo dark={!light} />
          {!light && <p className="mt-1.5 pl-1 text-[11px] tracking-widest text-slate-500">{SLOGAN}</p>}
        </div>
        {!light && <GlobalSearch />}

        {/* 导航 */}
        <nav className="mt-3 flex-1 space-y-1 overflow-y-auto px-3">
          {NAV_ITEMS.map(({ key, label, icon: Icon }) => {
            const active = key === activeKey
            return (
              <button
                key={key}
                type="button"
                title={active ? undefined : NAV_TARGETS[key] ? undefined : '后续阶段开放'}
                onClick={() => {
                  const target = NAV_TARGETS[key]
                  if (target) navigate(target)
                  setMobileOpen(false)
                }}
                className={`flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-sm transition ${
                  active
                    ? light
                      ? 'bg-white font-medium text-[#5a52a8] shadow-sm'
                      : 'bg-gradient-to-r from-iris-500/90 to-sky-400/80 font-medium text-white shadow-[0_4px_16px_rgba(122,135,245,0.35)]'
                    : light
                      ? 'text-[#7a7496] hover:bg-white/70 hover:text-[#3f3a5e]'
                      : 'text-slate-400 hover:bg-white/[0.06] hover:text-slate-200'
                }`}
              >
                <Icon size={18} strokeWidth={1.8} />
                {label}
              </button>
            )
          })}
        </nav>

        {/* 底部：云空间 + 在线好友 + 用户信息 */}
        <div className={`border-t p-4 ${light ? 'border-[#dcd9ec]' : 'border-white/[0.06]'}`}>
          <StorageUsageBar light={light} />
          <OnlineFriendCount onOpen={() => navigate('/friends')} light={light} />
          <div className="mt-3 flex items-center gap-2.5">
            <span className="flex h-9 w-9 shrink-0 items-center justify-center overflow-hidden rounded-full bg-gradient-to-br from-iris-500 to-sky-400 text-lg">
              <img
                src={profile.avatarUrl || defaultAvatar}
                alt="头像"
                className="h-full w-full object-cover"
              />
            </span>
            <div className="min-w-0 flex-1">
              <p className={`truncate text-sm font-medium ${light ? 'text-[#3f3a5e]' : 'text-white'}`}>
                {profile.nickname}
              </p>
              <p className={`truncate text-[11px] ${light ? 'text-[#8b84a8]' : 'text-slate-500'}`}>
                Lv.{USER_LEVEL.level} · {USER_LEVEL.title}
              </p>
            </div>
            <button
              type="button"
              onClick={() => void handleLogout()}
              title="退出登录"
              className={`transition ${light ? 'text-[#9a94b8] hover:text-[#5a52a8]' : 'text-slate-500 hover:text-slate-200'}`}
            >
              <LogOut size={16} strokeWidth={1.8} />
            </button>
          </div>
          {/* 浅色变体：经验条（与设计稿一致） */}
          {light && (
            <div className="mt-3">
              <div className="flex items-center justify-between text-[10px] text-[#9a94b8]">
                <span>经验值 {USER_LEVEL.xp}/{USER_LEVEL.xpMax}</span>
              </div>
              <div className="mt-1 h-1.5 overflow-hidden rounded-full bg-[#d3cfec]">
                <div
                  className="h-1.5 rounded-full bg-gradient-to-r from-iris-400 to-sky-400"
                  style={{ width: `${Math.min((USER_LEVEL.xp / USER_LEVEL.xpMax) * 100, 100)}%` }}
                />
              </div>
            </div>
          )}
        </div>
      </aside>
    </>
  )
}
