import type { ReactNode } from 'react'
import type { RoomLayoutEnvironment } from '../../lib/types'

/** 窗外风景：按 windowView 切换场景 */
const WINDOW_SCENES: Record<string, { emoji: string; bg: string }> = {
  city: { emoji: '🏙️', bg: 'linear-gradient(to bottom, #1e293b, #334155)' },
  forest: { emoji: '🌲', bg: 'linear-gradient(to bottom, #14532d, #1c2b21)' },
  sea: { emoji: '🌊', bg: 'linear-gradient(to bottom, #0c4a6e, #155e75)' },
}

interface RoomContainerProps {
  theme: string
  environment: RoomLayoutEnvironment
  children: ReactNode
}

/** 房间背景层：墙壁、地板、窗户与灯光氛围（2D 俯视 + 立体层次感） */
export function RoomContainer({ theme, environment, children }: RoomContainerProps) {
  const scene = WINDOW_SCENES[environment.windowView] ?? WINDOW_SCENES.city!
  const warm = environment.lighting === 'warm'

  return (
    <div
      data-theme={theme}
      className="relative h-full w-full overflow-hidden rounded-3xl border border-white/10 shadow-glass-lg"
    >
      {/* 基础背景（theme 渐变） */}
      <div className="absolute inset-0 bg-gradient-to-b from-night-800 via-night-900 to-night-950" />

      {/* 灯光氛围：稳定力 ≥ 70 为暖光，否则冷光 */}
      <div
        className="absolute inset-0 transition-opacity duration-700"
        style={{
          background: warm
            ? 'radial-gradient(60% 45% at 50% 16%, rgba(236, 169, 74, 0.16), transparent 70%), radial-gradient(70% 60% at 50% 100%, rgba(236, 169, 74, 0.07), transparent 75%)'
            : 'radial-gradient(60% 45% at 50% 16%, rgba(94, 200, 240, 0.12), transparent 70%), radial-gradient(70% 60% at 50% 100%, rgba(122, 135, 245, 0.06), transparent 75%)',
        }}
      />

      {/* 窗户（顶部中央） */}
      <div
        className="absolute left-1/2 top-[3%] h-[26%] w-[38%] -translate-x-1/2 overflow-hidden rounded-2xl border border-white/10 shadow-inner"
        style={{ background: scene.bg }}
      >
        <span className="absolute inset-0 flex items-center justify-center text-6xl opacity-80">
          {scene.emoji}
        </span>
        {/* 玻璃反光 */}
        <span className="absolute inset-0 bg-gradient-to-br from-white/15 via-transparent to-transparent" />
      </div>

      {/* 地板（下 2/3） */}
      <div className="room-floor absolute inset-x-0 bottom-0 h-[68%]" />

      {/* 物品层 */}
      <div className="absolute inset-0">{children}</div>
    </div>
  )
}
