import { Cloud, Palette, Plus, Undo2 } from 'lucide-react'
import { avatarStyleOf, tagIconOf } from '../lib/constants'
import { USER_LEVEL } from '../lib/mockData'
import type { ProfileBundle } from '../lib/types'

interface RightPanelProps {
  bundle: ProfileBundle
}

export function RightPanel({ bundle }: RightPanelProps) {
  const { profile } = bundle
  const styleMeta = avatarStyleOf(profile.avatarStyle)
  const xpPercent = Math.round((USER_LEVEL.xp / USER_LEVEL.xpMax) * 100)

  return (
    <aside className="hidden w-72 shrink-0 flex-col gap-5 overflow-y-auto border-l border-white/[0.06] bg-white/[0.02] p-5 xl:flex">
      {/* 用户卡：Avatar + 等级经验条 */}
      <section className="glass-panel p-5 text-center">
        <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-gradient-to-br from-iris-500 to-sky-400 text-3xl shadow-[0_8px_24px_rgba(122,135,245,0.4)]">
          {styleMeta?.emoji ?? '✦'}
        </div>
        <p className="mt-3 font-semibold text-white">{profile.nickname}</p>
        <p className="mt-1 text-xs text-gold-400">
          Lv.{USER_LEVEL.level} · {USER_LEVEL.title}
        </p>
        <div className="mt-3">
          <div className="flex justify-between text-xs text-slate-400">
            <span>经验值</span>
            <span>
              {USER_LEVEL.xp.toLocaleString()} / {USER_LEVEL.xpMax.toLocaleString()}
            </span>
          </div>
          <div className="mt-1.5 h-1.5 rounded-full bg-white/10">
            <div
              className="h-1.5 rounded-full bg-gradient-to-r from-gold-400 to-gold-500"
              style={{ width: `${xpPercent}%` }}
            />
          </div>
        </div>
        <div className="mt-4 flex flex-wrap justify-center gap-1.5">
          {profile.preferenceTags.map((tag) => (
            <span
              key={tag}
              className="rounded-full border border-white/10 bg-white/[0.05] px-2.5 py-1 text-xs text-slate-300"
            >
              {tagIconOf(tag)} {tag}
            </span>
          ))}
        </div>
      </section>

      {/* 快捷入口 */}
      <section className="glass-panel p-4">
        <h3 className="text-xs font-medium tracking-widest text-slate-500">快捷入口</h3>
        <div className="mt-3 grid grid-cols-2 gap-3">
          {[
            { label: '云空间', icon: Cloud },
            { label: '自定义', icon: Palette },
          ].map(({ label, icon: Icon }) => (
            <button
              key={label}
              type="button"
              title="阶段 2 开放"
              className="flex flex-col items-center gap-1.5 rounded-xl border border-white/[0.06] bg-white/[0.04] py-3 text-xs text-slate-300 transition hover:border-iris-400/40 hover:text-white"
            >
              <Icon size={18} strokeWidth={1.8} className="text-iris-300" />
              {label}
            </button>
          ))}
        </div>
      </section>

      {/* 新建 / 复盘 */}
      <section className="flex gap-3">
        <button
          type="button"
          title="阶段 2 开放"
          className="btn-gradient flex flex-1 items-center justify-center gap-1.5"
        >
          <Plus size={16} strokeWidth={2} />
          新建
        </button>
        <button
          type="button"
          title="阶段 2 开放"
          className="flex flex-1 items-center justify-center gap-1.5 rounded-xl border border-white/10 py-2.5 text-sm text-slate-300 transition hover:border-iris-400/40 hover:text-white"
        >
          <Undo2 size={15} strokeWidth={1.8} />
          复盘
        </button>
      </section>
    </aside>
  )
}
