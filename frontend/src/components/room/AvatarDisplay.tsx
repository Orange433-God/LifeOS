import { avatarStyleOf } from '../../lib/constants'
import type { UserProfile } from '../../lib/types'

/** 各头像风格的光晕颜色 */
const STYLE_GLOWS: Record<string, string> = {
  realistic: 'rgba(248, 190, 98, 0.4)',
  anime: 'rgba(244, 114, 182, 0.4)',
  future: 'rgba(94, 200, 240, 0.45)',
  fantasy: 'rgba(167, 139, 250, 0.45)',
  minimal: 'rgba(255, 255, 255, 0.3)',
}

interface AvatarDisplayProps {
  profile: UserProfile
  x: number
  y: number
  onClick?: () => void
}

/** 用户 Avatar：按 avatarStyle 展示 emoji 与对应风格光晕 */
export function AvatarDisplay({ profile, x, y, onClick }: AvatarDisplayProps) {
  const styleMeta = avatarStyleOf(profile.avatarStyle)
  const glow = STYLE_GLOWS[profile.avatarStyle] ?? 'rgba(122, 135, 245, 0.4)'

  return (
    <button
      type="button"
      onClick={onClick}
      className="group absolute -translate-x-1/2 -translate-y-1/2"
      style={{ left: `${x}%`, top: `${y}%` }}
    >
      <span
        className="animate-float-slow relative flex h-16 w-16 items-center justify-center rounded-full border border-white/15 bg-night-800/70 text-4xl backdrop-blur"
        style={{ boxShadow: `0 8px 28px ${glow}` }}
      >
        {styleMeta?.emoji ?? '✦'}
      </span>
      <span className="pointer-events-none absolute -top-8 left-1/2 -translate-x-1/2 whitespace-nowrap rounded-lg border border-white/10 bg-night-800/90 px-2.5 py-1 text-xs text-slate-200 opacity-0 backdrop-blur transition-opacity group-hover:opacity-100">
        {profile.nickname}
      </span>
    </button>
  )
}
