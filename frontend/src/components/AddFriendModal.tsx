import { useEffect, useState } from 'react'
import { Search, UserPlus, X } from 'lucide-react'
import { searchUsers, sendFriendRequest } from '../api/social'
import { getErrorMessage } from '../lib/api'
import { avatarStyleOf } from '../lib/constants'
import type { SearchUser } from '../lib/types'

interface AddFriendModalProps {
  onClose: () => void
}

/** 添加好友弹窗：防抖搜索 + 发送请求 */
export function AddFriendModal({ onClose }: AddFriendModalProps) {
  const [keyword, setKeyword] = useState('')
  const [debounced, setDebounced] = useState('')
  const [results, setResults] = useState<SearchUser[]>([])
  const [searching, setSearching] = useState(false)
  const [requestedIds, setRequestedIds] = useState<Set<string>>(new Set())
  const [notice, setNotice] = useState<string | null>(null)

  useEffect(() => {
    const timer = setTimeout(() => setDebounced(keyword), 300)
    return () => clearTimeout(timer)
  }, [keyword])

  useEffect(() => {
    const q = debounced.trim()
    if (q === '') {
      setResults([])
      setSearching(false)
      return
    }
    setSearching(true)
    let cancelled = false
    searchUsers(q)
      .then((list) => {
        if (!cancelled) setResults(list)
      })
      .catch((err) => {
        if (!cancelled) setNotice(getErrorMessage(err))
      })
      .finally(() => {
        if (!cancelled) setSearching(false)
      })
    return () => {
      cancelled = true
    }
  }, [debounced])

  const handleSend = async (user: SearchUser) => {
    setNotice(null)
    try {
      await sendFriendRequest(user.id)
      setRequestedIds((prev) => new Set(prev).add(user.id))
      setNotice(`已向 ${user.nickname} 发送好友请求 ✉️`)
    } catch (err) {
      setNotice(getErrorMessage(err))
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center px-4">
      <button
        type="button"
        aria-label="关闭"
        onClick={onClose}
        className="absolute inset-0 cursor-default bg-night-950/60 backdrop-blur-[3px]"
      />
      <div className="glass-panel animate-fade-in relative z-10 max-h-[80vh] w-full max-w-lg overflow-y-auto p-6">
        <header className="flex items-center justify-between">
          <h2 className="flex items-center gap-2 text-lg font-semibold text-white">
            <UserPlus size={18} strokeWidth={1.8} className="text-iris-300" />
            添加好友
          </h2>
          <button
            type="button"
            onClick={onClose}
            className="rounded-lg p-1.5 text-slate-400 transition hover:bg-[#f0eff9] hover:text-[#2c2947]"
          >
            <X size={18} strokeWidth={1.8} />
          </button>
        </header>

        <div className="mt-4 flex items-center gap-2 rounded-xl border border-[#cfc9e4] bg-[#f0eff9]/80 px-3 py-2.5 backdrop-blur">
          <Search size={15} strokeWidth={1.8} className="shrink-0 text-[#8b84a8]" />
          <input
            value={keyword}
            onChange={(e) => setKeyword(e.target.value)}
            placeholder="按昵称搜索其他用户…"
            maxLength={30}
            autoFocus
            className="w-full bg-transparent text-sm text-slate-200 placeholder-slate-500 outline-none"
          />
        </div>

        {notice && <p className="mt-3 text-xs text-iris-300">{notice}</p>}

        <div className="mt-4 space-y-2.5">
          {searching && <p className="text-xs text-[#8b84a8]">搜索中…</p>}
          {!searching && debounced.trim() !== '' && results.length === 0 && !notice && (
            <p className="text-sm text-[#8b84a8]">没有找到匹配的用户</p>
          )}
          {results.map((user) => {
            const styleMeta = avatarStyleOf(user.avatarStyle)
            const requested = requestedIds.has(user.id)
            return (
              <div
                key={user.id}
                className="flex items-center gap-3 rounded-xl border border-[#cfc9e4] bg-white/5 p-3.5"
              >
                <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-iris-500 to-sky-400 text-lg">
                  {styleMeta?.emoji ?? '✦'}
                </span>
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-medium text-[#2c2947]">{user.nickname}</p>
                  <p className="truncate text-xs text-[#8b84a8]">{user.lifeStage ?? 'LifeOS 用户'}</p>
                </div>
                <button
                  type="button"
                  onClick={() => void handleSend(user)}
                  disabled={requested}
                  className="flex items-center gap-1 rounded-lg border border-iris-400/40 bg-iris-500/10 px-3 py-1.5 text-xs text-iris-300 transition hover:bg-iris-500/20 disabled:opacity-50"
                >
                  <UserPlus size={13} />
                  {requested ? '已发送' : '添加'}
                </button>
              </div>
            )
          })}
        </div>
      </div>
    </div>
  )
}
