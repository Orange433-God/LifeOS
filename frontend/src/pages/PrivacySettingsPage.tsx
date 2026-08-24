import { useEffect, useState } from 'react'
import { Check, RefreshCw, ShieldCheck } from 'lucide-react'
import { getPrivacy, updatePrivacy } from '../api/social'
import { Sidebar } from '../components/Sidebar'
import { ToggleSwitch } from '../components/common/ToggleSwitch'
import { useAuth } from '../context/AuthContext'
import { getErrorMessage } from '../lib/api'
import type { PrivacySettings } from '../lib/types'

interface SettingRowProps {
  title: string
  description: string
  children: React.ReactNode
}

function SettingRow({ title, description, children }: SettingRowProps) {
  return (
    <div className="flex items-center justify-between gap-4 py-3.5">
      <div className="min-w-0">
        <p className="text-sm font-medium text-white/90">{title}</p>
        <p className="mt-0.5 text-xs text-slate-500">{description}</p>
      </div>
      {children}
    </div>
  )
}

/** 隐私设置页：分组卡片 + 开关/下拉 */
export default function PrivacySettingsPage() {
  const { state } = useAuth()
  const [settings, setSettings] = useState<PrivacySettings | null>(null)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [saved, setSaved] = useState(false)

  useEffect(() => {
    const load = async () => {
      try {
        setSettings(await getPrivacy())
      } catch (err) {
        setError(getErrorMessage(err))
      } finally {
        setLoading(false)
      }
    }
    void load()
  }, [])

  if (state.status !== 'authed' || !state.profile) return null

  const patch = (partial: Partial<PrivacySettings>) => {
    setSettings((prev) => (prev ? { ...prev, ...partial } : prev))
    setSaved(false)
  }

  const save = async () => {
    if (!settings || saving) return
    setSaving(true)
    setError(null)
    try {
      setSettings(await updatePrivacy(settings))
      setSaved(true)
    } catch (err) {
      setError(getErrorMessage(err))
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="night-background flex h-screen overflow-hidden">
      <Sidebar activeKey="settings" />

      <main className="min-w-0 flex-1 overflow-y-auto p-6 lg:p-8">
        <header>
          <h1 className="flex items-center gap-2 text-2xl font-semibold text-white">
            <ShieldCheck size={24} strokeWidth={1.8} className="text-iris-300" />
            隐私设置
          </h1>
          <p className="mt-1 text-sm text-white/60">社交完全可选——你可以随时回到只属于自己的空间</p>
        </header>

        <div className="mt-6 max-w-2xl space-y-5 pb-6">
          {loading ? (
            <div className="h-64 animate-pulse rounded-2xl bg-white/[0.05]" />
          ) : error && !settings ? (
            <div className="flex flex-col items-center gap-3 py-10 text-center">
              <p className="text-slate-300">{error}</p>
              <button type="button" onClick={() => window.location.reload()} className="btn-gradient flex items-center gap-1.5">
                <RefreshCw size={15} />
                刷新
              </button>
            </div>
          ) : settings ? (
            <>
              {/* 访问权限 */}
              <section className="rounded-2xl border border-white/10 bg-white/5 p-5 backdrop-blur-sm">
                <h2 className="text-sm font-medium tracking-widest text-white/60">房间访问</h2>
                <div className="mt-2 divide-y divide-white/5">
                  <SettingRow title="房间访问权限" description="谁可以进入你的数字空间">
                    <select
                      value={settings.roomAccess}
                      onChange={(e) => patch({ roomAccess: e.target.value as PrivacySettings['roomAccess'] })}
                      className="rounded-lg border border-white/10 bg-night-800/80 px-3 py-2 text-sm text-slate-200 outline-none"
                    >
                      <option value="private">仅自己</option>
                      <option value="friends_only">仅好友</option>
                      <option value="public">公开</option>
                    </select>
                  </SettingRow>
                  <SettingRow title="允许好友访问房间" description="关闭后等效于「仅自己」，任何人无法参观">
                    <ToggleSwitch checked={settings.allowRoomVisit} onChange={(v) => patch({ allowRoomVisit: v })} />
                  </SettingRow>
                </div>
              </section>

              {/* 资料可见性 */}
              <section className="rounded-2xl border border-white/10 bg-white/5 p-5 backdrop-blur-sm">
                <h2 className="text-sm font-medium tracking-widest text-white/60">个人资料</h2>
                <div className="mt-2 divide-y divide-white/5">
                  <SettingRow title="资料可见性" description="你的昵称与头像对谁可见">
                    <select
                      value={settings.profileVisibility}
                      onChange={(e) => patch({ profileVisibility: e.target.value as PrivacySettings['profileVisibility'] })}
                      className="rounded-lg border border-white/10 bg-night-800/80 px-3 py-2 text-sm text-slate-200 outline-none"
                    >
                      <option value="friends_only">仅好友</option>
                      <option value="public">公开</option>
                    </select>
                  </SettingRow>
                  <SettingRow title="显示在线状态" description="关闭后在好友列表中显示为离线/隐身">
                    <ToggleSwitch checked={settings.showOnlineStatus} onChange={(v) => patch({ showOnlineStatus: v })} />
                  </SettingRow>
                  <SettingRow title="允许被搜索到" description="关闭后他人无法通过昵称搜索到你">
                    <ToggleSwitch checked={settings.allowSearch} onChange={(v) => patch({ allowSearch: v })} />
                  </SettingRow>
                </div>
              </section>

              {error && <p className="text-xs text-red-400">{error}</p>}
              {saved && <p className="flex items-center gap-1 text-xs text-emerald-400"><Check size={13} /> 隐私设置已保存</p>}

              <button type="button" onClick={() => void save()} disabled={saving} className="btn-gradient flex items-center gap-2 disabled:opacity-50">
                {saving && <span className="h-3.5 w-3.5 animate-spin rounded-full border-2 border-white/30 border-t-white" />}
                {saving ? '保存中…' : '保存设置'}
              </button>
            </>
          ) : null}
        </div>
      </main>
    </div>
  )
}
