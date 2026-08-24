import { useEffect, useState } from 'react'
import { Check, Inbox, X } from 'lucide-react'
import { getPendingRequests, handleFriendRequest } from '../api/social'
import { getErrorMessage } from '../lib/api'
import { avatarStyleOf } from '../lib/constants'
import type { PendingRequestItem } from '../lib/types'

interface FriendRequestsModalProps {
  onClose: () => void
  /** 处理完成后回调（刷新好友列表与请求角标） */
  onChanged: () => void
}

/** 好友请求弹窗：同意 / 拒绝 */
export function FriendRequestsModal({ onClose, onChanged }: FriendRequestsModalProps) {
  const [requests, setRequests] = useState<PendingRequestItem[]>([])
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    getPendingRequests()
      .then(setRequests)
      .catch((err) => setError(getErrorMessage(err)))
  }, [])

  const handle = async (requestId: string, status: 'accepted' | 'rejected') => {
    setError(null)
    try {
      await handleFriendRequest(requestId, status)
      setRequests(await getPendingRequests())
      onChanged()
    } catch (err) {
      setError(getErrorMessage(err))
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
            <Inbox size={18} strokeWidth={1.8} className="text-iris-300" />
            好友请求
          </h2>
          <button
            type="button"
            onClick={onClose}
            className="rounded-lg p-1.5 text-slate-400 transition hover:bg-[#f0eff9] hover:text-[#2c2947]"
          >
            <X size={18} strokeWidth={1.8} />
          </button>
        </header>

        {error && <p className="mt-3 text-xs text-red-500">{error}</p>}

        <div className="mt-4 space-y-2.5">
          {requests.length === 0 ? (
            <p className="py-8 text-center text-sm text-[#8b84a8]">没有待处理的好友请求 📭</p>
          ) : (
            requests.map((request) => {
              const styleMeta = avatarStyleOf(request.user.avatarStyle)
              return (
                <div
                  key={request.requestId}
                  className="flex items-center gap-3 rounded-xl border border-[#cfc9e4] bg-white/5 p-3.5"
                >
                  <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-iris-500 to-sky-400 text-lg">
                    {styleMeta?.emoji ?? '✦'}
                  </span>
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-medium text-[#2c2947]">{request.user.nickname}</p>
                    <p className="text-xs text-[#8b84a8]">请求添加你为好友</p>
                  </div>
                  <button
                    type="button"
                    onClick={() => void handle(request.requestId, 'accepted')}
                    className="flex items-center gap-1 rounded-lg bg-gradient-to-r from-blue-500/80 to-purple-500/80 px-3 py-1.5 text-xs text-white"
                  >
                    <Check size={13} />
                    同意
                  </button>
                  <button
                    type="button"
                    onClick={() => void handle(request.requestId, 'rejected')}
                    className="flex items-center gap-1 rounded-lg border border-[#cfc9e4] px-3 py-1.5 text-xs text-slate-400 transition hover:border-red-400/40 hover:text-red-500"
                  >
                    <X size={13} />
                    拒绝
                  </button>
                </div>
              )
            })
          )}
        </div>
      </div>
    </div>
  )
}
