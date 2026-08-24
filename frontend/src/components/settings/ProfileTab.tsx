import { useRef, useState } from 'react'
import { X } from 'lucide-react'
import { updateAppearance, updateGeneral, updateProfile } from '../../api/settings'
import { getErrorMessage } from '../../lib/api'
import { resetAvatar, uploadAvatar } from '../../api/settings'
import defaultAvatar from '../../assets/dashboard-avatar.png'
import { AVATAR_STYLES } from '../../lib/constants'
import type { MergedSettings } from '../../lib/types'
import { SettingRow } from './SettingRow'

interface ProfileTabProps {
  data: MergedSettings
  onChanged: () => void
}

/** 通用编辑弹窗（文本/多行/日期/下拉） */
function EditModal({
  title,
  initial,
  type = 'text',
  options,
  onSave,
  onClose,
}: {
  title: string
  initial: string
  type?: 'text' | 'textarea' | 'date' | 'select'
  options?: Array<{ value: string; label: string }>
  onSave: (value: string) => Promise<void>
  onClose: () => void
}) {
  const [value, setValue] = useState(initial)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const save = async () => {
    setSaving(true)
    setError(null)
    try {
      await onSave(value)
      onClose()
    } catch (err) {
      setError(getErrorMessage(err))
      setSaving(false)
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center px-4">
      <button type="button" aria-label="关闭" onClick={onClose} className="absolute inset-0 cursor-default bg-night-950/60 backdrop-blur-[3px]" />
      <div className="animate-fade-in relative z-10 w-full max-w-md rounded-2xl border border-[#cfc9e4]/60 bg-white/95 p-6 shadow-xl backdrop-blur-xl">
        <header className="flex items-center justify-between">
          <h3 className="text-lg font-semibold text-[#2c2947]">{title}</h3>
          <button type="button" onClick={onClose} className="rounded-lg p-1.5 text-[#5f5787] hover:bg-[#f0eff9] hover:text-[#2c2947]">
            <X size={18} strokeWidth={1.8} />
          </button>
        </header>
        <div className="mt-4">
          {type === 'textarea' ? (
            <textarea value={value} onChange={(e) => setValue(e.target.value)} rows={4} maxLength={100} className="w-full resize-none rounded-xl border border-[#cfc9e4] bg-[#f0eff9]/80 px-4 py-2.5 text-sm text-[#3a3652] outline-none focus:border-iris-400/50" />
          ) : type === 'select' ? (
            <select value={value} onChange={(e) => setValue(e.target.value)} className="w-full rounded-xl border border-[#cfc9e4] bg-white px-3 py-2.5 text-sm text-[#3a3652] outline-none">
              {options?.map((o) => (
                <option key={o.value} value={o.value}>{o.label}</option>
              ))}
            </select>
          ) : type === 'date' ? (
            <input type="date" value={value} onChange={(e) => setValue(e.target.value)} className="w-full rounded-xl border border-[#cfc9e4] bg-[#f0eff9]/80 px-4 py-2.5 text-sm text-[#3a3652] outline-none [color-scheme:light]" />
          ) : (
            <input value={value} onChange={(e) => setValue(e.target.value)} maxLength={20} className="w-full rounded-xl border border-[#cfc9e4] bg-[#f0eff9]/80 px-4 py-2.5 text-sm text-[#3a3652] outline-none focus:border-iris-400/50" />
          )}
        </div>
        {error && <p className="mt-2 text-xs text-red-500">{error}</p>}
        <div className="mt-4 flex justify-end gap-3">
          <button type="button" onClick={onClose} className="rounded-xl border border-[#cfc9e4] px-4 py-2 text-sm text-[#3a3652] hover:text-[#2c2947]">取消</button>
          <button type="button" onClick={() => void save()} disabled={saving} className="btn-gradient disabled:opacity-50">{saving ? '保存中…' : '保存'}</button>
        </div>
      </div>
    </div>
  )
}

const THEME_COLORS = [
  { key: 'purple', label: '紫', cls: 'bg-purple-500' },
  { key: 'blue', label: '蓝', cls: 'bg-blue-500' },
  { key: 'green', label: '绿', cls: 'bg-emerald-500' },
  { key: 'pink', label: '粉', cls: 'bg-pink-500' },
] as const

const GENDER_OPTIONS = [
  { value: '', label: '保密' },
  { value: 'male', label: '男' },
  { value: 'female', label: '女' },
]

/** 个人信息 Tab：个人资料 + 外观 + 通用设置 */
export function ProfileTab({ data, onChanged }: ProfileTabProps) {
  const { profile, settings } = data
  const [modal, setModal] = useState<null | 'nickname' | 'bio' | 'birthdate' | 'gender' | 'avatar'>(null)
  const avatarInputRef = useRef<HTMLInputElement>(null)
  const [avatarDraft, setAvatarDraft] = useState<string>(profile.avatarStyle)
  const [notice, setNotice] = useState<string | null>(null)

  const genderLabel = profile.gender === 'male' ? '男' : profile.gender === 'female' ? '女' : '保密'

  const flash = (message: string) => {
    setNotice(message)
    window.setTimeout(() => setNotice(null), 2000)
  }

  const saveAvatar = async () => {
    try {
      await updateProfile({ avatarStyle: avatarDraft })
      setModal(null)
      onChanged()
      flash('头像风格已更新')
    } catch (err) {
      setNotice(getErrorMessage(err))
    }
  }

  return (
    <div className="space-y-5">
      {notice && <p className="text-xs text-emerald-600">{notice}</p>}

      {/* 个人资料 */}
      <section className="rounded-2xl border border-[#cfc9e4]/60 bg-white/70 backdrop-blur-xl">
        <h2 className="border-b border-white/5 px-4 py-3 text-sm font-medium text-[#2c2947]">个人资料</h2>
        <SettingRow
          label="头像"
          value={
            <>
              <span className="flex h-9 w-9 items-center justify-center overflow-hidden rounded-full bg-gradient-to-br from-iris-500 to-sky-400 text-lg">
                <img
                  src={profile.avatarUrl || defaultAvatar}
                  alt="头像"
                  className="h-full w-full object-cover"
                />
              </span>
              {profile.avatarUrl && (
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation()
                    void resetAvatar()
                      .then(() => {
                        onChanged()
                        setNotice('已恢复默认头像 ✅')
                      })
                      .catch((err) => setNotice(getErrorMessage(err)))
                  }}
                  className="rounded-lg border border-[#cfc9e4] px-2 py-1 text-[11px] text-[#5f5787] transition hover:border-iris-400/50 hover:text-[#2c2947]"
                >
                  恢复默认
                </button>
              )}
            </>
          }
          onClick={() => avatarInputRef.current?.click()}
        />
        <input
          ref={avatarInputRef}
          type="file"
          accept="image/*"
          className="hidden"
          onChange={(e) => {
            const file = e.target.files?.[0]
            if (!file) return
            void uploadAvatar(file)
              .then(() => {
                onChanged()
                setNotice('头像已更新 ✅')
              })
              .catch((err) => setNotice(getErrorMessage(err)))
          }}
        />
        <SettingRow label="用户ID" value={<span className="font-mono text-xs">{profile.uid ?? 100000}</span>} />
        <SettingRow label="昵称" value={profile.nickname} onClick={() => setModal('nickname')} />
        <SettingRow label="生日" value={profile.birthdate ? profile.birthdate.slice(0, 10) : '未设置'} onClick={() => setModal('birthdate')} />
        <SettingRow label="性别" value={genderLabel} onClick={() => setModal('gender')} />
        <SettingRow label="个人简介" value={profile.bio ? `${profile.bio.slice(0, 15)}…` : '未填写'} onClick={() => setModal('bio')} />
      </section>

      {/* 外观 */}
      <section className="rounded-2xl border border-[#cfc9e4]/60 bg-[#f0eff9] p-4 backdrop-blur-xl">
        <h2 className="text-sm font-medium text-[#2c2947]">主题与外观</h2>
        <div className="mt-3 space-y-4">
          <div>
            <p className="text-xs text-[#8b84a8]">主题模式</p>
            <div className="mt-2 grid grid-cols-3 gap-2">
              {[{ key: 'light', label: '浅色模式' }, { key: 'dark', label: '深色模式' }, { key: 'system', label: '跟随系统' }].map((m) => (
                <button
                  key={m.key}
                  type="button"
                  onClick={() => void updateAppearance({ themeMode: m.key as typeof settings.themeMode }).then(() => { onChanged(); flash('已保存') }).catch((e) => setNotice(getErrorMessage(e)))}
                  className={`rounded-lg border px-2 py-2 text-xs transition ${settings.themeMode === m.key ? 'border-transparent bg-gradient-to-r from-blue-500/70 to-purple-500/70 font-medium text-white' : 'border-[#cfc9e4] text-[#5f5787] hover:text-[#3a3652]'}`}
                >
                  {m.label}
                </button>
              ))}
            </div>
          </div>
          <div>
            <p className="text-xs text-[#8b84a8]">主题色</p>
            <div className="mt-2 flex gap-2.5">
              {THEME_COLORS.map((c) => (
                <button
                  key={c.key}
                  type="button"
                  title={c.label}
                  onClick={() => void updateAppearance({ themeColor: c.key }).then(() => { onChanged(); flash('已保存') }).catch((e) => setNotice(getErrorMessage(e)))}
                  className={`h-8 w-8 rounded-full ${c.cls} ${settings.themeColor === c.key ? 'ring-2 ring-white/80 ring-offset-2 ring-offset-white' : ''}`}
                />
              ))}
            </div>
          </div>
          <div>
            <p className="text-xs text-[#8b84a8]">界面密度</p>
            <div className="mt-2 grid grid-cols-3 gap-2">
              {[{ key: 'compact', label: '紧凑' }, { key: 'medium', label: '适中' }, { key: 'relaxed', label: '宽松' }].map((d) => (
                <button
                  key={d.key}
                  type="button"
                  onClick={() => void updateAppearance({ density: d.key as typeof settings.density }).then(() => { onChanged(); flash('已保存') }).catch((e) => setNotice(getErrorMessage(e)))}
                  className={`rounded-lg border px-2 py-2 text-xs transition ${settings.density === d.key ? 'border-transparent bg-gradient-to-r from-blue-500/70 to-purple-500/70 font-medium text-white' : 'border-[#cfc9e4] text-[#5f5787] hover:text-[#3a3652]'}`}
                >
                  {d.label}
                </button>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* 通用设置 */}
      <section className="rounded-2xl border border-[#cfc9e4]/60 bg-white/70 backdrop-blur-xl">
        <h2 className="border-b border-white/5 px-4 py-3 text-sm font-medium text-[#2c2947]">通用设置</h2>
        <SettingRow
          label="语言"
          control={
            <select
              value={settings.language}
              onChange={(e) => void updateGeneral({ language: e.target.value }).then(() => { onChanged(); flash('已保存') }).catch((err) => setNotice(getErrorMessage(err)))}
              className="rounded-lg border border-[#cfc9e4] bg-white px-2.5 py-1.5 text-sm text-[#3a3652] outline-none"
            >
              <option value="zh-CN">简体中文</option>
              <option value="en-US">English</option>
            </select>
          }
        />
        <SettingRow
          label="时间格式"
          control={
            <select
              value={settings.timeFormat}
              onChange={(e) => void updateGeneral({ timeFormat: e.target.value }).then(() => { onChanged(); flash('已保存') }).catch((err) => setNotice(getErrorMessage(err)))}
              className="rounded-lg border border-[#cfc9e4] bg-white px-2.5 py-1.5 text-sm text-[#3a3652] outline-none"
            >
              <option value="24h">24 小时制（20:30）</option>
              <option value="12h">12 小时制（08:30 PM）</option>
            </select>
          }
        />
        <SettingRow
          label="日期格式"
          control={
            <select
              value={settings.dateFormat}
              onChange={(e) => void updateGeneral({ dateFormat: e.target.value }).then(() => { onChanged(); flash('已保存') }).catch((err) => setNotice(getErrorMessage(err)))}
              className="rounded-lg border border-[#cfc9e4] bg-white px-2.5 py-1.5 text-sm text-[#3a3652] outline-none"
            >
              <option value="YYYY-MM-DD">YYYY-MM-DD</option>
              <option value="MM/DD/YYYY">MM/DD/YYYY</option>
              <option value="DD/MM/YYYY">DD/MM/YYYY</option>
            </select>
          }
        />
        <SettingRow
          label="一周开始于"
          control={
            <select
              value={settings.weekStart}
              onChange={(e) => void updateGeneral({ weekStart: e.target.value }).then(() => { onChanged(); flash('已保存') }).catch((err) => setNotice(getErrorMessage(err)))}
              className="rounded-lg border border-[#cfc9e4] bg-white px-2.5 py-1.5 text-sm text-[#3a3652] outline-none"
            >
              <option value="monday">星期一</option>
              <option value="sunday">星期日</option>
            </select>
          }
        />
        <SettingRow
          label="启动时打开"
          control={
            <select
              value={settings.startPage}
              onChange={(e) => void updateGeneral({ startPage: e.target.value }).then(() => { onChanged(); flash('已保存') }).catch((err) => setNotice(getErrorMessage(err)))}
              className="rounded-lg border border-[#cfc9e4] bg-white px-2.5 py-1.5 text-sm text-[#3a3652] outline-none"
            >
              <option value="home">首页</option>
              <option value="space">数字空间</option>
              <option value="dashboard">人生大盘</option>
            </select>
          }
        />
      </section>

      {/* 编辑弹窗 */}
      {modal === 'nickname' && (
        <EditModal title="修改昵称" initial={profile.nickname} onClose={() => setModal(null)} onSave={async (v) => { await updateProfile({ nickname: v.trim() }); onChanged() }} />
      )}
      {modal === 'bio' && (
        <EditModal title="个人简介（100 字内）" initial={profile.bio ?? ''} type="textarea" onClose={() => setModal(null)} onSave={async (v) => { await updateProfile({ bio: v.trim() }); onChanged() }} />
      )}
      {modal === 'birthdate' && (
        <EditModal title="选择生日" initial={profile.birthdate?.slice(0, 10) ?? ''} type="date" onClose={() => setModal(null)} onSave={async (v) => { await updateProfile({ birthdate: v || null }); onChanged() }} />
      )}
      {modal === 'gender' && (
        <EditModal title="性别" initial={profile.gender ?? ''} type="select" options={GENDER_OPTIONS} onClose={() => setModal(null)} onSave={async (v) => { await updateProfile({ gender: v || null }); onChanged() }} />
      )}
      {modal === 'avatar' && (
        <div className="fixed inset-0 z-50 flex items-center justify-center px-4">
          <button type="button" aria-label="关闭" onClick={() => setModal(null)} className="absolute inset-0 cursor-default bg-night-950/60 backdrop-blur-[3px]" />
          <div className="animate-fade-in relative z-10 w-full max-w-md rounded-2xl border border-[#cfc9e4]/60 bg-white/95 p-6 shadow-xl backdrop-blur-xl">
            <h3 className="text-lg font-semibold text-white">选择头像风格</h3>
            <div className="mt-4 grid grid-cols-5 gap-2">
              {AVATAR_STYLES.map((s) => (
                <button
                  key={s.key}
                  type="button"
                  onClick={() => setAvatarDraft(s.key)}
                  className={`flex flex-col items-center gap-1 rounded-xl border px-1 py-3 transition ${avatarDraft === s.key ? 'border-iris-400/60 bg-iris-500/10' : 'border-[#cfc9e4] hover:bg-[#f0eff9]/80'}`}
                >
                  <span className="text-2xl">{s.emoji}</span>
                  <span className="text-[10px] text-[#5f5787]">{s.label}</span>
                </button>
              ))}
            </div>
            {notice && <p className="mt-2 text-xs text-red-500">{notice}</p>}
            <div className="mt-4 flex justify-end gap-3">
              <button type="button" onClick={() => setModal(null)} className="rounded-xl border border-[#cfc9e4] px-4 py-2 text-sm text-[#3a3652] hover:text-[#2c2947]">取消</button>
              <button type="button" onClick={() => void saveAvatar()} className="btn-gradient">保存</button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
