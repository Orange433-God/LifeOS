import { useCallback, useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { LogOut, RotateCcw, Settings as SettingsIcon } from 'lucide-react'
import { getSettings, resetSettings } from '../api/settings'
import { Sidebar } from '../components/Sidebar'
import { SettingsSidebar, type SettingsTabKey } from '../components/settings/SettingsSidebar'
import { ProfileTab } from '../components/settings/ProfileTab'
import { NotificationTab } from '../components/settings/NotificationTab'
import { PrivacyTab } from '../components/settings/PrivacyTab'
import { DataManagementTab } from '../components/settings/DataManagementTab'
import { AboutTab } from '../components/settings/AboutTab'
import { useAuth } from '../context/AuthContext'
import { getErrorMessage } from '../lib/api'
import { USER_LEVEL } from '../lib/mockData'
import defaultAvatar from '../assets/dashboard-avatar.png'
import type { MergedSettings } from '../lib/types'

/** 设置中心：左分类菜单 + 右设置项卡片列表 */
export default function SettingsPage() {
  const { state, logout } = useAuth()
  const navigate = useNavigate()
  const [tab, setTab] = useState<SettingsTabKey>('profile')
  const [data, setData] = useState<MergedSettings | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [notice, setNotice] = useState<string | null>(null)
  const [resetConfirm, setResetConfirm] = useState(false)
  const [logoutConfirm, setLogoutConfirm] = useState(false)

  const load = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      setData(await getSettings())
    } catch (err) {
      setError(getErrorMessage(err))
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    void load()
  }, [load])

  if (state.status !== 'authed' || !state.profile) return null
  const { profile } = state.profile

  const handleReset = async () => {
    setResetConfirm(false)
    try {
      await resetSettings()
      await load()
      setNotice('已恢复默认设置 ✅')
      window.setTimeout(() => setNotice(null), 2500)
    } catch (err) {
      setError(getErrorMessage(err))
    }
  }

  const handleLogout = async () => {
    setLogoutConfirm(false)
    await logout()
    navigate('/login', { replace: true })
  }

  return (
    <div className="flex h-screen overflow-hidden bg-[#ece9f7]">
      <Sidebar activeKey="settings" variant="light" />

      <main className="min-w-0 flex-1 overflow-y-auto p-6 lg:p-8">
        {/* 顶部：标题 + 恢复默认设置 */}
        <header className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h1 className="flex items-center gap-2 text-2xl font-semibold text-[#2c2947]">
              <SettingsIcon size={24} strokeWidth={1.8} className="text-iris-600" />
              设置中心
            </h1>
            <p className="mt-1 text-sm text-[#5f5787]">自定义你的 LifeOS 使用体验</p>
          </div>
          <button
            type="button"
            onClick={() => setResetConfirm(true)}
            className="flex items-center gap-1.5 rounded-xl border border-[#cfc9e4] px-3 py-2 text-xs text-[#5f5787] transition hover:border-iris-400/40 hover:text-[#2c2947]"
          >
            <RotateCcw size={14} strokeWidth={1.8} />
            恢复默认设置
          </button>
        </header>

        {notice && <p className="mt-3 text-xs text-emerald-600">{notice}</p>}

        {/* 上侧分类导航 + 设置项内容 */}
        <div className="mt-5">
          <SettingsSidebar active={tab} onChange={setTab} />

          <div className="mt-5 pb-6">
            {loading ? (
              <div className="h-80 animate-pulse rounded-2xl bg-[#f0eff9]/80" />
            ) : error && !data ? (
              <div className="flex flex-col items-center gap-3 py-12 text-center">
                <p className="text-[#3a3652]">{error}</p>
                <button type="button" onClick={() => void load()} className="btn-gradient">重试</button>
              </div>
            ) : !data ? null : tab === 'profile' ? (
              <ProfileTab data={data} onChanged={() => void load()} />
            ) : tab === 'notification' ? (
              <NotificationTab data={data} onChanged={() => void load()} />
            ) : tab === 'privacy' ? (
              <PrivacyTab data={data} onNotice={setNotice} />
            ) : tab === 'data' ? (
              <DataManagementTab
                data={data}
                onNotice={setNotice}
                onAccountDeleted={() => navigate('/register', { replace: true })}
              />
            ) : (
              <AboutTab onNotice={setNotice} />
            )}

            {/* 底部：退出登录 + 协议链接 */}
            <div className="mt-6 flex items-center justify-between">
              <button
                type="button"
                onClick={() => setLogoutConfirm(true)}
                className="text-sm text-red-500 transition hover:text-red-300"
              >
                退出登录
              </button>
              <div className="text-xs text-[#8b84a8]">
                <button type="button" onClick={() => setNotice('用户协议页面即将开放')} className="hover:text-[#5f5787]">用户协议</button>
                <span className="mx-1.5">·</span>
                <button type="button" onClick={() => setNotice('隐私政策页面即将开放')} className="hover:text-[#5f5787]">隐私政策</button>
              </div>
            </div>
          </div>
        </div>

        {/* 底部用户条 */}
        <div className="flex items-center gap-3 rounded-2xl border border-[#cfc9e4]/60 bg-white/60 px-4 py-3 backdrop-blur-sm">
          {/* 用户头像：自定义上传优先，默认虚拟形象（与侧边栏/顶栏一致） */}
          <span className="flex h-10 w-10 items-center justify-center overflow-hidden rounded-full bg-gradient-to-br from-iris-500 to-sky-400 text-lg">
            <img
              src={profile.avatarUrl || defaultAvatar}
              alt="头像"
              className="h-full w-full object-cover"
            />
          </span>
          <div className="min-w-0 flex-1">
            <p className="text-sm text-[#2c2947]">
              {profile.nickname} <span className="ml-1 text-xs text-[#8b84a8]">Lv.{USER_LEVEL.level}</span>
            </p>
            <div className="mt-1.5 h-1.5 max-w-xs rounded-full bg-[#d8d4e8]">
              <div
                className="h-1.5 rounded-full bg-gradient-to-r from-blue-500 to-purple-500"
                style={{ width: `${Math.round((USER_LEVEL.xp / USER_LEVEL.xpMax) * 100)}%` }}
              />
            </div>
          </div>
          <span className="text-xs text-[#8b84a8]">经验值 {USER_LEVEL.xp}/{USER_LEVEL.xpMax}</span>
        </div>
      </main>

      {/* 恢复默认确认 */}
      {resetConfirm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center px-4">
          <button type="button" aria-label="关闭" onClick={() => setResetConfirm(false)} className="absolute inset-0 cursor-default bg-night-950/60 backdrop-blur-[3px]" />
          <div className="animate-fade-in relative z-10 w-full max-w-md rounded-2xl border border-[#cfc9e4]/60 bg-white/90 p-6 shadow-xl backdrop-blur-xl">
            <h3 className="text-lg font-semibold text-[#2c2947]">恢复默认设置？</h3>
            <p className="mt-2 text-sm text-[#5f5787]">恢复所有设置到默认值，确定继续？</p>
            <div className="mt-4 flex justify-end gap-3">
              <button type="button" onClick={() => setResetConfirm(false)} className="rounded-xl border border-[#cfc9e4] px-4 py-2 text-sm text-[#3a3652] hover:text-[#2c2947]">取消</button>
              <button type="button" onClick={() => void handleReset()} className="btn-gradient">确认恢复</button>
            </div>
          </div>
        </div>
      )}

      {/* 退出登录确认 */}
      {logoutConfirm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center px-4">
          <button type="button" aria-label="关闭" onClick={() => setLogoutConfirm(false)} className="absolute inset-0 cursor-default bg-night-950/60 backdrop-blur-[3px]" />
          <div className="animate-fade-in relative z-10 w-full max-w-md rounded-2xl border border-[#cfc9e4]/60 bg-white/95 p-6 shadow-xl backdrop-blur-xl">
            <h3 className="flex items-center gap-2 text-lg font-semibold text-white">
              <LogOut size={18} strokeWidth={1.8} className="text-red-500" />
              退出登录？
            </h3>
            <p className="mt-2 text-sm text-[#5f5787]">确定要退出当前账号吗？</p>
            <div className="mt-4 flex justify-end gap-3">
              <button type="button" onClick={() => setLogoutConfirm(false)} className="rounded-xl border border-[#cfc9e4] px-4 py-2 text-sm text-[#3a3652] hover:text-[#2c2947]">取消</button>
              <button type="button" onClick={() => void handleLogout()} className="rounded-xl bg-red-500/80 px-4 py-2 text-sm font-medium text-white hover:bg-red-500">退出登录</button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
