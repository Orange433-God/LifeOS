import { useCallback, useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Inbox, Search, Send, Trophy, UserMinus, UserPlus, Users } from 'lucide-react'
import { deleteFriend, getFriends, getPendingRequests, getVisitStats } from '../api/social'
import { AddFriendModal } from '../components/AddFriendModal'
import { FriendRequestsModal } from '../components/FriendRequestsModal'
import { Sidebar } from '../components/Sidebar'
import { useAuth } from '../context/AuthContext'
import { getErrorMessage } from '../lib/api'
import { avatarStyleOf } from '../lib/constants'
import { USER_LEVEL } from '../lib/mockData'
import defaultAvatar from '../assets/dashboard-avatar.png'
import type { FriendItem, SearchUser, VisitStatItem } from '../lib/types'

/** 统计卡片 */
function StatCard({ label, value, trend, note }: { label: string; value: string | number; trend?: string; note?: string }) {
  return (
    <div className="rounded-xl border border-[#cfc9e4]/60 bg-white/70 p-4 backdrop-blur-sm">
      <p className="text-sm text-[#5f5787]">{label}</p>
      <p className="mt-1.5 text-2xl font-bold text-[#2c2947]">{value}</p>
      <p className="mt-1 text-xs text-[#8b84a8]">
        {trend ? <span className="text-emerald-600">↑ {trend}</span> : note ?? '—'}
      </p>
    </div>
  )
}

/** 好友行 */
function FriendRow({ friend, onVisit, onRemove }: { friend: FriendItem; onVisit: () => void; onRemove: () => void }) {
  const styleMeta = avatarStyleOf(friend.user.avatarStyle)
  return (
    <li className="group flex items-center gap-3 rounded-lg px-2 py-2 transition hover:bg-[#f0eff9]">
      <button type="button" onClick={onVisit} className="flex min-w-0 flex-1 items-center gap-3 text-left">
        <span className="relative flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-iris-500 to-sky-400 text-lg">
          {styleMeta?.emoji ?? '✦'}
          <span
            className={`absolute -bottom-0.5 -right-0.5 h-2.5 w-2.5 rounded-full border-2 border-night-900 ${
              friend.user.online ? 'bg-emerald-400' : 'bg-slate-600'
            }`}
          />
        </span>
        <span className="min-w-0">
          <span className="flex items-center gap-1.5">
            <span className="truncate text-sm font-medium text-[#2c2947]">{friend.user.nickname}</span>
            <span className="shrink-0 rounded bg-iris-100 px-1 py-0.5 text-[10px] text-iris-600">Lv.3</span>
          </span>
          <span className="mt-0.5 block truncate text-xs text-[#8b84a8]">
            {friend.user.lifeStage ?? 'LifeOS 用户'}
            <span className={`ml-2 ${friend.user.online ? 'text-emerald-600' : 'text-[#8b84a8]'}`}>
              {friend.user.online ? '在线' : '离线/隐身'}
            </span>
          </span>
        </span>
      </button>
      <button
        type="button"
        onClick={onRemove}
        title="解除好友"
        className="rounded-lg p-1.5 text-[#8b84a8] opacity-0 transition hover:text-red-500 group-hover:opacity-100"
      >
        <UserMinus size={14} strokeWidth={1.8} />
      </button>
    </li>
  )
}

/** 排行榜行 */
function LeaderboardRow({ item, rank }: { item: VisitStatItem; rank: number }) {
  const styleMeta = avatarStyleOf(item.avatarStyle)
  const isFirst = rank === 1
  return (
    <div
      className={`flex items-center gap-3 rounded-xl border p-3 ${
        isFirst
          ? 'border-gold-400/50 bg-gradient-to-r from-gold-500/15 to-transparent'
          : 'border-[#cfc9e4]/60 bg-white/5'
      }`}
    >
      <span
        className={`flex h-7 w-7 shrink-0 items-center justify-center rounded-full text-sm font-bold ${
          isFirst ? 'bg-gold-400 text-night-900' : 'bg-[#d8d4e8] text-[#3a3652]'
        }`}
      >
        {rank}
      </span>
      <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-iris-500 to-sky-400 text-base">
        {styleMeta?.emoji ?? '✦'}
      </span>
      <span className="min-w-0 flex-1 truncate text-sm text-[#2c2947]">{item.nickname}</span>
      <span className="shrink-0 text-xs text-slate-400">互动 {item.count}</span>
    </div>
  )
}

/** 社交链接页：搜索 + 统计 + 好友/动态双栏 + 推荐小组 + 互动排行榜 */
export default function FriendsPage() {
  const { state } = useAuth()
  const navigate = useNavigate()
  const [friends, setFriends] = useState<FriendItem[]>([])
  const [pendingCount, setPendingCount] = useState(0)
  const [visitStats, setVisitStats] = useState<{ thisWeek: VisitStatItem[]; thisMonth: VisitStatItem[] }>({ thisWeek: [], thisMonth: [] })
  const [toast, setToast] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [friendsExpanded, setFriendsExpanded] = useState(false)
  const [leaderboardExpanded, setLeaderboardExpanded] = useState(false)

  // 顶部搜索
  const [keyword, setKeyword] = useState('')
  const [debounced, setDebounced] = useState('')
  const [searchResults, setSearchResults] = useState<SearchUser[]>([])
  const [searching, setSearching] = useState(false)
  const [requestedIds, setRequestedIds] = useState<Set<string>>(new Set())
  const [notice, setNotice] = useState<string | null>(null)

  const [addOpen, setAddOpen] = useState(false)
  const [requestsOpen, setRequestsOpen] = useState(false)

  const load = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const [fs, rs, stats] = await Promise.all([getFriends(), getPendingRequests(), getVisitStats()])
      setFriends(fs)
      setPendingCount(rs.length)
      setVisitStats(stats)
    } catch (err) {
      setError(getErrorMessage(err))
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    if (!toast) return
    const timer = setTimeout(() => setToast(null), 2500)
    return () => clearTimeout(timer)
  }, [toast])

  useEffect(() => {
    void load()
  }, [load])

  // 搜索防抖
  useEffect(() => {
    const timer = setTimeout(() => setDebounced(keyword), 300)
    return () => clearTimeout(timer)
  }, [keyword])

  useEffect(() => {
    const q = debounced.trim()
    if (q === '') {
      setSearchResults([])
      setSearching(false)
      return
    }
    setSearching(true)
    let cancelled = false
    import('../api/social')
      .then(({ searchUsers }) => searchUsers(q))
      .then((list) => {
        if (!cancelled) setSearchResults(list)
      })
      .catch(() => undefined)
      .finally(() => {
        if (!cancelled) setSearching(false)
      })
    return () => {
      cancelled = true
    }
  }, [debounced])

  if (state.status !== 'authed' || !state.profile) return null
  const { profile } = state.profile

  const interactCount = visitStats.thisWeek.reduce((sum, v) => sum + v.count, 0)
  const visibleFriends = friendsExpanded ? friends : friends.slice(0, 8)
  const visibleBoard = leaderboardExpanded ? visitStats.thisWeek : visitStats.thisWeek.slice(0, 5)

  const handleSendRequest = async (user: SearchUser) => {
    setNotice(null)
    try {
      const { sendFriendRequest } = await import('../api/social')
      await sendFriendRequest(user.id)
      setRequestedIds((prev) => new Set(prev).add(user.id))
      setNotice(`已向 ${user.nickname} 发送好友请求 ✉️`)
    } catch (err) {
      setNotice(getErrorMessage(err))
    }
  }

  const handleRemove = async (friend: FriendItem) => {
    if (!window.confirm(`确定与 ${friend.user.nickname} 解除好友关系吗？`)) return
    try {
      await deleteFriend(friend.friendshipId)
      setFriends((prev) => prev.filter((f) => f.friendshipId !== friend.friendshipId))
    } catch (err) {
      setError(getErrorMessage(err))
    }
  }

  return (
    <div className="flex h-screen overflow-hidden bg-[#ece9f7]">
      <Sidebar activeKey="social" variant="light" />

      <main className="min-w-0 flex-1 overflow-y-auto p-6 lg:p-8">
        {/* 1️⃣ 顶部：标题 + 搜索栏 + 操作入口 */}
        <header className="flex flex-wrap items-center justify-between gap-4">
          <h1 className="flex items-center gap-2 text-2xl font-semibold text-white">
            <Users size={24} strokeWidth={1.8} className="text-iris-300" />
            社交链接
          </h1>
          <div className="flex items-center gap-3">
            {/* 搜索框（用户/动态/话题占位，动态与话题后续阶段开放） */}
            <div className="relative">
              <div className="flex w-72 items-center gap-2 rounded-xl border border-[#cfc9e4] bg-[#f0eff9]/80 px-3 py-2 backdrop-blur">
                <Search size={15} strokeWidth={1.8} className="shrink-0 text-[#8b84a8]" />
                <input
                  value={keyword}
                  onChange={(e) => setKeyword(e.target.value)}
                  placeholder="搜索用户、动态、话题.."
                  maxLength={30}
                  className="w-full bg-transparent text-sm text-slate-200 placeholder-slate-500 outline-none"
                />
              </div>
              {/* 搜索结果下拉 */}
              {debounced.trim() !== '' && (
                <div className="glass-panel animate-fade-in absolute left-0 right-0 top-full z-30 mt-2 max-h-72 overflow-y-auto p-2">
                  {searching ? (
                    <p className="px-2 py-2 text-xs text-[#8b84a8]">搜索中…</p>
                  ) : searchResults.length === 0 ? (
                    <p className="px-2 py-2 text-xs text-[#8b84a8]">
                      没有找到匹配的用户（动态/话题搜索即将开放）
                    </p>
                  ) : (
                    searchResults.map((user) => {
                      const meta = avatarStyleOf(user.avatarStyle)
                      const requested = requestedIds.has(user.id)
                      return (
                        <div key={user.id} className="flex items-center gap-2.5 rounded-lg px-2 py-2 hover:bg-[#f0eff9]">
                          <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-iris-500 to-sky-400 text-sm">
                            {meta?.emoji ?? '✦'}
                          </span>
                          <span className="min-w-0 flex-1">
                            <span className="block truncate text-sm text-[#2c2947]">{user.nickname}</span>
                            <span className="block truncate text-xs text-[#8b84a8]">{user.lifeStage ?? 'LifeOS 用户'}</span>
                          </span>
                          <button
                            type="button"
                            onClick={() => void handleSendRequest(user)}
                            disabled={requested}
                            className="rounded-lg border border-iris-400/40 bg-iris-500/10 px-2.5 py-1 text-xs text-iris-300 hover:bg-iris-500/20 disabled:opacity-50"
                          >
                            {requested ? '已发送' : '添加'}
                          </button>
                        </div>
                      )
                    })
                  )}
                </div>
              )}
            </div>
            <button
              type="button"
              onClick={() => setRequestsOpen(true)}
              className="relative flex items-center gap-1.5 rounded-xl border border-[#cfc9e4] px-3 py-2 text-sm text-[#3a3652] transition hover:border-iris-400/40 hover:text-[#2c2947]"
            >
              <Inbox size={15} strokeWidth={1.8} />
              好友请求
              {pendingCount > 0 && (
                <span className="rounded-full bg-red-500/80 px-1.5 py-0.5 text-[10px] text-white">{pendingCount}</span>
              )}
            </button>
            <button type="button" onClick={() => setAddOpen(true)} className="btn-gradient flex items-center gap-1.5">
              <UserPlus size={15} strokeWidth={2} />
              添加好友
            </button>
          </div>
        </header>

        {notice && <p className="mt-3 text-xs text-iris-300">{notice}</p>}
        {error && <p className="mt-3 text-xs text-red-500">{error}</p>}

        {/* 导航 Tab：好友 / 社区 / 动态广场 / 小组 / 排行榜 */}
        <nav className="mt-5 flex gap-6 border-b border-[#cfc9e4]/70">
          {[
            { key: 'friends', label: '好友', target: 'sec-friends' },
            { key: 'community', label: '社区', target: '' },
            { key: 'moments', label: '动态广场', target: 'sec-moments' },
            { key: 'groups', label: '小组', target: 'sec-groups' },
            { key: 'rank', label: '排行榜', target: 'sec-rank' },
          ].map((tab) => (
            <button
              key={tab.key}
              type="button"
              onClick={() => {
                if (tab.target) {
                  document.getElementById(tab.target)?.scrollIntoView({ behavior: 'smooth', block: 'start' })
                } else {
                  setToast('社区功能即将开放 ✨')
                }
              }}
              className={`relative pb-2.5 text-sm transition ${tab.key === 'friends' ? 'font-semibold text-[#2c2947]' : 'text-[#5f5787] hover:text-[#3a3652]'}`}
            >
              {tab.label}
              {tab.key === 'friends' && (
                <span className="absolute inset-x-0 -bottom-px h-0.5 rounded-full bg-gradient-to-r from-blue-500 to-purple-500" />
              )}
            </button>
          ))}
        </nav>

        {/* 2️⃣ 社交数据统计卡片 */}
        <div className="mt-5 grid grid-cols-2 gap-4 lg:grid-cols-4">
          <StatCard label="好友数量" value={friends.length} trend={friends.length > 0 ? '较上月 +0' : undefined} note="暂无历史数据" />
          <StatCard label="加入小组" value={0} note="小组功能即将开放" />
          <StatCard label="互动次数" value={interactCount} note="本周房间互动（真实）" />
          <StatCard label="获得点赞" value={0} note="动态功能即将开放" />
        </div>

        {/* 3️⃣ 好友列表 + 动态广场（左 40% : 右 60%） */}
        <div className="mt-5 grid gap-5 lg:grid-cols-[2fr_3fr]">
          {/* 左栏：好友列表 */}
          <section id="sec-friends" className="rounded-2xl border border-[#cfc9e4]/60 bg-white/70 p-5 backdrop-blur-xl">
            <div className="flex items-center justify-between">
              <h2 className="text-sm font-medium text-[#2c2947]">好友列表</h2>
              <button
                type="button"
                onClick={() => setFriendsExpanded((v) => !v)}
                className="text-xs text-iris-600 transition hover:text-[#2c2947]"
              >
                {friendsExpanded ? '收起 ↑' : '查看全部 ↓'}
              </button>
            </div>

            {loading ? (
              <div className="mt-3 h-40 animate-pulse rounded-xl bg-[#f0eff9]/80" />
            ) : friends.length === 0 ? (
              <p className="mt-6 text-center text-sm text-[#8b84a8]">
                还没有好友——点右上角「添加好友」发出第一份邀请吧 👋
              </p>
            ) : (
              <ul className="mt-2 max-h-[340px] space-y-0.5 overflow-y-auto">
                {visibleFriends.map((friend) => (
                  <FriendRow
                    key={friend.friendshipId}
                    friend={friend}
                    onVisit={() => navigate(`/visit/${friend.user.id}`)}
                    onRemove={() => void handleRemove(friend)}
                  />
                ))}
              </ul>
            )}

            {/* 底部自己的卡片（头像与全局一致：自定义上传优先，默认虚拟形象） */}
            <div className="mt-4 flex items-center gap-3 rounded-xl border border-[#cfc9e4]/60 bg-white/60 p-3">
              <span className="flex h-10 w-10 shrink-0 items-center justify-center overflow-hidden rounded-full bg-gradient-to-br from-iris-500 to-sky-400 text-lg">
                <img
                  src={profile.avatarUrl || defaultAvatar}
                  alt="头像"
                  className="h-full w-full object-cover"
                />
              </span>
              <div className="min-w-0 flex-1">
                <p className="text-sm font-medium text-[#2c2947]">
                  {profile.nickname} <span className="text-xs text-[#8b84a8]">Lv.{USER_LEVEL.level}</span>
                </p>
                <div className="mt-1.5 h-1.5 rounded-full bg-[#d8d4e8]">
                  <div
                    className="h-1.5 rounded-full bg-gradient-to-r from-blue-500 to-purple-500"
                    style={{ width: `${Math.round((USER_LEVEL.xp / USER_LEVEL.xpMax) * 100)}%` }}
                  />
                </div>
                <p className="mt-1 text-[10px] text-[#8b84a8]">
                  经验值 {USER_LEVEL.xp}/{USER_LEVEL.xpMax}
                </p>
              </div>
            </div>
          </section>

          {/* 右栏：动态广场 */}
          <section id="sec-moments" className="rounded-2xl border border-[#cfc9e4]/60 bg-white/70 p-5 backdrop-blur-xl">
            <div className="flex items-center justify-between">
              <h2 className="text-sm font-medium text-[#2c2947]">动态广场</h2>
              <button
                type="button"
                title="动态功能即将开放（下一阶段）"
                disabled
                className="flex items-center gap-1.5 rounded-lg bg-gradient-to-r from-blue-500/60 to-purple-500/60 px-3 py-1.5 text-xs text-white/70"
              >
                <Send size={13} />
                发布动态
              </button>
            </div>
            <div className="mt-6 flex flex-col items-center gap-2 py-10 text-center">
              <span className="text-3xl">🌊</span>
              <p className="text-sm text-[#8b84a8]">动态广场即将开放</p>
              <p className="text-xs text-[#8b84a8]">届时你可以分享成长瞬间，#话题 与好友互动</p>
            </div>
          </section>
        </div>

        {/* 4️⃣ 推荐小组 */}
        <section id="sec-groups" className="mt-5">
          <div className="flex items-center justify-between">
            <h2 className="text-sm font-medium tracking-widest text-[#5f5787]">推荐小组</h2>
            <button
              type="button"
              title="小组功能即将开放"
              className="text-xs text-[#8b84a8] transition hover:text-[#3a3652]"
            >
              查看全部 →
            </button>
          </div>
          <div className="mt-3 flex gap-4 overflow-x-auto pb-1">
            <div className="flex w-full min-w-0 items-center justify-center gap-3 rounded-xl border border-dashed border-[#b8b2d4] bg-white/60 px-6 py-8 text-center backdrop-blur-sm">
              <span className="text-2xl">👥</span>
              <div className="text-left">
                <p className="text-sm text-slate-400">小组功能即将开放</p>
                <p className="mt-0.5 text-xs text-[#8b84a8]">之后你可以加入兴趣小组，找到同频的伙伴</p>
              </div>
            </div>
          </div>
        </section>

        {/* 5️⃣ 互动排行榜（本周） */}
        <section id="sec-rank" className="mt-5 pb-6">
          <div className="flex items-center justify-between">
            <h2 className="flex items-center gap-2 text-sm font-medium tracking-widest text-[#5f5787]">
              <Trophy size={15} strokeWidth={1.8} className="text-gold-400" />
              互动排行榜（本周）
            </h2>
            <button
              type="button"
              onClick={() => setLeaderboardExpanded((v) => !v)}
              className="text-xs text-iris-600 transition hover:text-[#2c2947]"
            >
              {leaderboardExpanded ? '收起 ↑' : '查看全部 ↓'}
            </button>
          </div>
          <div className="mt-3">
            {visibleBoard.length === 0 ? (
              <p className="rounded-xl border border-[#cfc9e4]/60 bg-white/60 p-5 text-sm text-[#8b84a8]">
                本周还没有互动——好友参观你的房间后会出现在这里
              </p>
            ) : (
              <div className="grid gap-2.5 sm:grid-cols-2 xl:grid-cols-5">
                {visibleBoard.map((item, index) => (
                  <LeaderboardRow key={item.userId} item={item} rank={index + 1} />
                ))}
              </div>
            )}
          </div>
        </section>
      </main>

      {/* 弹窗 */}
      {addOpen && <AddFriendModal onClose={() => setAddOpen(false)} />}
      {requestsOpen && (
        <FriendRequestsModal
          onClose={() => setRequestsOpen(false)}
          onChanged={() => {
            void load()
          }}
        />
      )}

      {/* 占位提示 */}
      {toast && (
        <div className="pointer-events-none fixed bottom-6 left-1/2 z-50 -translate-x-1/2">
          <p className="animate-fade-in whitespace-nowrap rounded-xl bg-night-800 px-5 py-2.5 text-sm text-slate-200 shadow-lg">
            {toast}
          </p>
        </div>
      )}
    </div>
  )
}
