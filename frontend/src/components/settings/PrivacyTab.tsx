import { useNavigate } from 'react-router-dom'
import { useAuth } from '../../context/AuthContext'
import type { MergedSettings } from '../../lib/types'
import { SettingRow } from './SettingRow'

const ROOM_ACCESS_LABELS: Record<string, string> = {
  private: '仅自己',
  friends_only: '仅好友',
  public: '公开',
}

interface PrivacyTabProps {
  data: MergedSettings
  onNotice: (message: string) => void
}

/** 隐私与安全 Tab：隐私概览 + 跳转隐私设置页 + 占位项 */
export function PrivacyTab({ data, onNotice }: PrivacyTabProps) {
  const { state } = useAuth()
  const navigate = useNavigate()

  if (state.status !== 'authed' || !state.profile) return null
  const { privacy } = data

  return (
    <div className="space-y-5">
      <section className="rounded-2xl border border-[#cfc9e4]/60 bg-[#f0eff9] backdrop-blur-xl">
        <h2 className="border-b border-white/5 px-4 py-3 text-sm font-medium text-[#2c2947]">隐私与安全</h2>
        <SettingRow
          label="隐私权限管理"
          value={`房间：${ROOM_ACCESS_LABELS[privacy.roomAccess] ?? privacy.roomAccess} · 好友访问：${privacy.allowRoomVisit ? '允许' : '关闭'}`}
          onClick={() => navigate('/settings/privacy')}
        />
        <SettingRow label="修改密码" value="即将开放" onClick={() => onNotice('修改密码功能即将开放')} />
        <SettingRow label="登录设备管理" value="即将开放" onClick={() => onNotice('设备管理功能即将开放')} />
        <SettingRow label="两步验证" value={<span className="text-[#8b84a8]">未开启</span>} onClick={() => onNotice('两步验证即将开放')} />
      </section>
    </div>
  )
}
