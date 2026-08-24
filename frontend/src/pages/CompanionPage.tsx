import { useEffect, useRef, useState } from 'react'
import { CompanionChatPanel, type CompanionChatPanelHandle } from '../components/room/CompanionChat'
import { Sidebar } from '../components/Sidebar'
import { useAuth } from '../context/AuthContext'
import { getGoals } from '../api/goals'
import { getRecentRecords } from '../api/records'
import { getSettings } from '../api/settings'
import type { Goal, LifeRecord, MergedSettings } from '../lib/types'
import logoImg from '../assets/logo.png'

interface MemoryItem {
  icon: string
  text: string
}

/** 快捷指令：点击直接发给小伴 */
const QUICK_ACTIONS: Array<{ label: string; icon: string; prompt: string }> = [
  { label: '复盘总结', icon: '📝', prompt: '帮我复盘一下今天的收获' },
  { label: '目标拆解', icon: '🎯', prompt: '帮我拆解一下当前的目标' },
  { label: '习惯分析', icon: '📊', prompt: '帮我分析一下我最近的记录习惯' },
  { label: '灵感启发', icon: '💡', prompt: '给我一点灵感启发' },
  { label: '情绪陪伴', icon: '💞', prompt: '陪我聊聊今天的情绪' },
  { label: '资料整理', icon: '🗂️', prompt: '帮我整理一下最近的资料' },
]

/** AI 伙伴专属对话页（/companion）：左侧聊天流 + 右侧记忆与信息面板 */
export default function CompanionPage() {
  const { state } = useAuth()
  const panelRef = useRef<CompanionChatPanelHandle>(null)
  const [memories, setMemories] = useState<MemoryItem[]>([])

  // 记忆条目：真实数据（目标/记录/生日）优先，缺数据时用设计稿占位
  useEffect(() => {
    let cancelled = false
    const load = async () => {
      const [goalsRes, recordsRes, settingsRes] = await Promise.allSettled([
        getGoals('all'),
        getRecentRecords(5),
        getSettings(),
      ])
      if (cancelled) return
      const goals = goalsRes.status === 'fulfilled' ? goalsRes.value : ([] as Goal[])
      const records = recordsRes.status === 'fulfilled' ? recordsRes.value : ([] as LifeRecord[])
      const settings = settingsRes.status === 'fulfilled' ? settingsRes.value : (null as MergedSettings | null)

      const activeGoal = goals.filter((g) => g.status === 'active').sort((a, b) => b.updatedAt.localeCompare(a.updatedAt))[0]
      const studyRecord = records.find(
        (r) => r.tags?.some((t) => ['学习', '读书', '课程', '知识'].some((w) => t.includes(w))),
      )
      const birthdate = settings?.profile?.birthdate
      const nightHours = records.filter((r) => {
        const h = new Date(r.recordedAt).getHours()
        return h >= 18 || h < 6
      }).length
      const eveningPreference =
        records.length >= 3 ? `喜欢在${nightHours * 2 >= records.length ? '晚上' : '白天'}记录和思考` : '喜欢记录和思考生活的点滴'

      const items: MemoryItem[] = [
        { icon: '🌙', text: eveningPreference },
        ...(activeGoal ? [{ icon: '📈', text: `正在提升${activeGoal.title}` }] : []),
        ...(activeGoal ? [{ icon: '🎯', text: `目标：${activeGoal.title}` }] : []),
        ...(studyRecord
          ? [{ icon: '📚', text: `最近在学习：${studyRecord.tags?.[0] ?? '新知识'}` }]
          : []),
        { icon: '🌿', text: '偏好安静的环境' },
        ...(birthdate ? [{ icon: '🎂', text: `生日：${Number(birthdate.slice(5, 7))}月${Number(birthdate.slice(8, 10))}日` }] : []),
      ]
      setMemories(items)
    }
    void load()
    return () => {
      cancelled = true
    }
  }, [])

  // 路由守卫已保证登录且资料存在，此处兜底返回空
  if (state.status !== 'authed' || !state.profile) return null

  const { profile, companion } = state.profile

  return (
    <div className="flex h-screen overflow-hidden bg-[#e7e4f4]">
      <Sidebar activeKey="companion" variant="light" />

      <main className="flex min-w-0 flex-1 flex-col overflow-hidden p-5 lg:p-6">
        {/* 页头：品牌 + 标题 + 标语 */}
        <header className="mb-4 flex shrink-0 items-center gap-3 px-1">
          <img src={logoImg} alt="LifeOS" className="h-8 w-8 object-contain" />
          <span className="text-sm font-medium tracking-wide text-[#5f5787]">LifeOS</span>
          <span className="h-4 w-px bg-[#cfc9e4]" />
          <h1 className="text-lg font-semibold text-[#2c2947]">AI伙伴</h1>
          <span className="ml-1 hidden text-sm text-[#5f5787] md:inline">懂你、记得你、陪你成长</span>
        </header>

        {/* 聊天流 + 记忆面板 */}
        <div className="flex min-h-0 flex-1 gap-4">
          {/* 左侧：聊天面板（浅色） */}
          <div className="home-card min-w-0 flex-1 overflow-hidden">
            <CompanionChatPanel
              ref={panelRef}
              companion={companion}
              nickname={profile.nickname}
              variant="light"
            />
          </div>

          {/* 右侧：记忆与信息（浅薰衣草，与左侧导航栏同色系） */}
          <aside className="home-card hidden w-[300px] shrink-0 flex-col overflow-hidden lg:flex">
            <div className="flex items-center justify-between border-b border-[#cfc9e4]/60 px-4 py-3">
              <p className="text-sm font-semibold text-[#2c2947]">记忆与信息</p>
              <span className="text-xs text-[#5f5787]">查看全部 »</span>
            </div>

            {/* 记忆条目 */}
            <div className="flex-1 space-y-2 overflow-y-auto p-3">
              {memories.map((m) => (
                <div key={m.text} className="flex items-start gap-2.5 rounded-xl bg-white/55 px-3 py-2.5">
                  <span className="shrink-0 text-sm">{m.icon}</span>
                  <p className="text-xs leading-relaxed text-[#3a3652]">{m.text}</p>
                </div>
              ))}
            </div>

            {/* 我能帮你：快捷指令 */}
            <div className="border-t border-[#cfc9e4]/60 p-3">
              <p className="px-1 pb-2 text-xs font-medium text-[#47426e]">我能帮你</p>
              <div className="grid grid-cols-2 gap-2">
                {QUICK_ACTIONS.map((action) => (
                  <button
                    key={action.label}
                    type="button"
                    onClick={() => panelRef.current?.send(action.prompt)}
                    className="rounded-lg bg-white/60 px-2.5 py-2 text-xs text-[#3a3652] transition hover:bg-white hover:text-[#5a52a8]"
                  >
                    {action.icon} {action.label}
                  </button>
                ))}
              </div>
            </div>
          </aside>
        </div>
      </main>
    </div>
  )
}
