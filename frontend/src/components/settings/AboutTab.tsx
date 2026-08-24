import { SettingRow } from './SettingRow'
import logoImg from '../../assets/logo.png'

interface AboutTabProps {
  onNotice: (message: string) => void
}

/** 关于 LifeOS Tab：版本信息 + 占位链接 */
export function AboutTab({ onNotice }: AboutTabProps) {
  return (
    <div className="space-y-5">
      <section className="rounded-2xl border border-[#cfc9e4]/60 bg-[#f0eff9] backdrop-blur-xl">
        <h2 className="border-b border-white/5 px-4 py-3 text-sm font-medium text-[#2c2947]">关于 LifeOS</h2>
        <SettingRow
          label="版本信息"
          value={
            <span className="flex items-center gap-1.5">
              v0.1.0
              <span className="rounded-full bg-emerald-500/15 px-2 py-0.5 text-[10px] text-emerald-600">最新版本</span>
            </span>
          }
        />
        <SettingRow label="帮助文档" onClick={() => onNotice('帮助文档即将开放')} />
        <SettingRow label="反馈与建议" onClick={() => onNotice('反馈渠道即将开放')} />
        <SettingRow label="用户协议" onClick={() => onNotice('用户协议页面即将开放')} />
        <SettingRow label="隐私政策" onClick={() => onNotice('隐私政策页面即将开放')} />
      </section>

      <div className="rounded-2xl border border-[#cfc9e4]/60 bg-white/60 p-6 text-center backdrop-blur-sm">
        <img src={logoImg} alt="LifeOS" className="mx-auto h-14 w-14 object-contain" />
        <p className="mt-2 font-medium text-[#3a3652]">LifeOS</p>
        <p className="mt-1 text-sm text-[#8b84a8]">愿此身，行至山海。</p>
      </div>
    </div>
  )
}
