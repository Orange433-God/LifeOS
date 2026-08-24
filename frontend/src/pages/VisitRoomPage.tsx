import { useEffect, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { ArrowLeft, Eye } from 'lucide-react'
import { recordVisit, visitRoom } from '../api/social'
import { RoomContainer } from '../components/room/RoomContainer'
import { RoomItem } from '../components/room/RoomItem'
import { Sidebar } from '../components/Sidebar'
import { useAuth } from '../context/AuthContext'
import { getErrorMessage } from '../lib/api'
import { avatarStyleOf } from '../lib/constants'
import companionAvatar from '../assets/companion-avatar.png'
import type { VisitRoomData } from '../lib/types'

const GUIDE_KEY = 'lifeos:visit-guide-shown'

/** 参观好友房间（只读）：Avatar/装饰可见，AI 伙伴离线、物品不可交互、无私密数据 */
export default function VisitRoomPage() {
  const { state } = useAuth()
  const navigate = useNavigate()
  const { userId } = useParams<{ userId: string }>()
  const [data, setData] = useState<VisitRoomData | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [guideVisible, setGuideVisible] = useState(false)

  useEffect(() => {
    if (!userId) return
    const load = async () => {
      setLoading(true)
      setError(null)
      try {
        const room = await visitRoom(userId)
        setData(room)
        // 记录访问（本人访问自己的房间不会进入此页，无需排除）
        void recordVisit(userId)
        if (!sessionStorage.getItem(GUIDE_KEY)) setGuideVisible(true)
      } catch (err) {
        setError(getErrorMessage(err))
      } finally {
        setLoading(false)
      }
    }
    void load()
  }, [userId])

  if (state.status !== 'authed' || !state.profile) return null

  const dismissGuide = () => {
    sessionStorage.setItem(GUIDE_KEY, '1')
    setGuideVisible(false)
  }

  const styleMeta = data ? avatarStyleOf(data.owner.avatarStyle) : null

  return (
    <div className="night-background flex h-screen overflow-hidden">
      <Sidebar activeKey="social" />

      <main className="min-w-0 flex-1 overflow-y-auto p-5 lg:p-8">
        {/* 顶部横幅 */}
        <div className="glass-panel mb-4 flex flex-wrap items-center justify-between gap-3 px-5 py-3.5">
          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={() => navigate('/friends')}
              className="flex items-center gap-1.5 text-sm text-slate-400 transition hover:text-white"
            >
              <ArrowLeft size={16} strokeWidth={1.8} />
              返回好友列表
            </button>
            {data && (
              <p className="flex items-center gap-2 text-sm text-slate-300">
                <Eye size={15} strokeWidth={1.8} className="text-iris-300" />
                你正在参观 <span className="font-semibold text-white">{data.owner.nickname}</span> 的数字空间
              </p>
            )}
          </div>
          {data && (
            <span className="rounded-full border border-white/10 bg-white/[0.05] px-3 py-1 text-xs text-slate-400">
              {data.companion.name} · {data.companion.personality} · 只读模式
            </span>
          )}
        </div>

        {loading ? (
          <div className="h-[70vh] animate-pulse rounded-3xl bg-white/[0.05]" />
        ) : error ? (
          <div className="flex h-[60vh] flex-col items-center justify-center gap-4 text-center">
            <span className="text-4xl">🔒</span>
            <p className="text-slate-300">{error}</p>
            <button
              type="button"
              onClick={() => navigate('/friends')}
              className="rounded-xl border border-white/10 px-4 py-2 text-sm text-slate-300 hover:text-white"
            >
              返回好友列表
            </button>
          </div>
        ) : !data ? null : (
          <RoomContainer theme={data.room.theme} environment={data.roomLayout.environment}>
            {/* 家具（只读：不可点击） */}
            {data.roomLayout.items.map((item) => (
              <RoomItem key={item.id} item={item} onClick={() => undefined} />
            ))}

            {/* 主人 Avatar（只读展示） */}
            <div
              className="absolute -translate-x-1/2 -translate-y-1/2"
              style={{ left: '40%', top: '70%' }}
            >
              <span className="flex h-16 w-16 items-center justify-center rounded-full border border-white/15 bg-night-800/70 text-4xl backdrop-blur">
                {styleMeta?.emoji ?? '✦'}
              </span>
              <p className="mt-1 text-center text-xs text-slate-400">{data.owner.nickname}</p>
            </div>

            {/* AI 伙伴：离线状态，不可交互 */}
            <div
              className="absolute -translate-x-1/2 -translate-y-1/2"
              style={{ left: '65%', top: '55%' }}
            >
              <span className="relative block">
                <img
                  src={companionAvatar}
                  alt="AI 伙伴（离线）"
                  className="h-14 w-14 rounded-full object-cover opacity-80 grayscale"
                />
                <span className="absolute -right-0.5 -top-0.5 h-3.5 w-3.5 rounded-full border-2 border-night-900 bg-slate-500" />
              </span>
              <p className="mt-1 text-center text-[11px] text-slate-500">离线 · 无法交互</p>
            </div>

            {/* 首次参观引导 */}
            {guideVisible && (
              <div className="absolute inset-0 z-30 flex items-center justify-center bg-night-950/40 backdrop-blur-[2px]">
                <div className="glass-panel mx-6 w-full max-w-sm p-6 text-center">
                  <p className="text-3xl">🏡</p>
                  <h3 className="mt-3 font-semibold text-white">参观模式</h3>
                  <p className="mt-2 text-sm leading-relaxed text-slate-400">
                    你可以参观好友的房间，但无法修改哦。对方的私人数据（记录、属性、目标）不会在这里展示。
                  </p>
                  <button type="button" onClick={dismissGuide} className="btn-gradient mt-5 w-full">
                    知道了
                  </button>
                </div>
              </div>
            )}
          </RoomContainer>
        )}
      </main>
    </div>
  )
}
