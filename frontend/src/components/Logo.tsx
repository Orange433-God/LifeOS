import logoImg from '../assets/logo.png'

interface LogoProps {
  size?: 'md' | 'lg'
  /** 深色背景下的白色文字变体 */
  dark?: boolean
}

/** 产品 Logo：产品logo.png 图标 + LifeOS 字标 */
export function Logo({ size = 'md', dark = false }: LogoProps) {
  const box = size === 'lg' ? 'h-12 w-12' : 'h-10 w-10'
  const text = size === 'lg' ? 'text-2xl' : 'text-lg'
  return (
    <div className="flex items-center gap-2.5">
      <img src={logoImg} alt="LifeOS" className={`${box} object-contain`} />
      <span className={`font-semibold tracking-wide ${dark ? 'text-white' : 'text-warm-800'} ${text}`}>
        LifeOS
      </span>
    </div>
  )
}
