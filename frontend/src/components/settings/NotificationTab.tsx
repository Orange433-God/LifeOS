import { useState } from 'react'
import { updateNotification } from '../../api/settings'
import { getErrorMessage } from '../../lib/api'
import type { MergedSettings, UserSettingsData } from '../../lib/types'
import { ToggleSwitch } from '../common/ToggleSwitch'
import { SettingRow } from './SettingRow'

interface NotificationTabProps {
  data: MergedSettings
  onChanged: () => void
}

const NOTIFY_ITEMS: Array<{ key: keyof UserSettingsData; label: string; description: string }> = [
  { key: 'aiMessageNotify', label: 'AI伙伴消息提醒', description: '小伴回复时通知我' },
  { key: 'goalProgressNotify', label: '目标进度提醒', description: '目标阶段完成时提醒' },
  { key: 'growthAchieveNotify', label: '成长成就通知', description: '达成里程碑时庆祝一下' },
  { key: 'systemUpdateNotify', label: '系统更新通知', description: 'LifeOS 新功能上线提醒' },
  { key: 'activityRecommend', label: '活动与推荐', description: '个性化活动推荐' },
]

/** 通知设置 Tab：5 个开关 + 免打扰时段 */
export function NotificationTab({ data, onChanged }: NotificationTabProps) {
  const { settings } = data
  const [quietStart, setQuietStart] = useState(settings.quietStart ?? '22:00')
  const [quietEnd, setQuietEnd] = useState(settings.quietEnd ?? '08:00')
  const [savingQuiet, setSavingQuiet] = useState(false)
  const [notice, setNotice] = useState<string | null>(null)

  const toggle = async (key: keyof UserSettingsData, value: boolean) => {
    setNotice(null)
    try {
      await updateNotification({ [key]: value })
      onChanged()
    } catch (err) {
      setNotice(getErrorMessage(err))
    }
  }

  const saveQuiet = async () => {
    setSavingQuiet(true)
    setNotice(null)
    try {
      await updateNotification({ quietStart, quietEnd })
      onChanged()
      setNotice('免打扰时段已保存')
    } catch (err) {
      setNotice(getErrorMessage(err))
    } finally {
      setSavingQuiet(false)
    }
  }

  return (
    <div className="space-y-5">
      <section className="rounded-2xl border border-[#cfc9e4]/60 bg-[#f0eff9] backdrop-blur-xl">
        <h2 className="border-b border-white/5 px-4 py-3 text-sm font-medium text-[#2c2947]">消息通知</h2>
        {NOTIFY_ITEMS.map((item) => (
          <SettingRow
            key={item.key}
            label={item.label}
            value={item.description}
            control={
              <ToggleSwitch
                checked={Boolean(settings[item.key])}
                onChange={(v) => void toggle(item.key, v)}
              />
            }
          />
        ))}
      </section>

      <section className="rounded-2xl border border-[#cfc9e4]/60 bg-[#f0eff9] p-4 backdrop-blur-xl">
        <h2 className="text-sm font-medium text-[#2c2947]">免打扰时段</h2>
        <p className="mt-1 text-xs text-[#8b84a8]">在此时间段内不会收到任何通知</p>
        <div className="mt-3 flex items-center gap-3">
          <input
            type="time"
            value={quietStart}
            onChange={(e) => setQuietStart(e.target.value)}
            className="rounded-lg border border-[#cfc9e4] bg-[#f0eff9]/80 px-3 py-2 text-sm text-[#3a3652] outline-none [color-scheme:dark]"
          />
          <span className="text-[#8b84a8]">至</span>
          <input
            type="time"
            value={quietEnd}
            onChange={(e) => setQuietEnd(e.target.value)}
            className="rounded-lg border border-[#cfc9e4] bg-[#f0eff9]/80 px-3 py-2 text-sm text-[#3a3652] outline-none [color-scheme:dark]"
          />
          <button type="button" onClick={() => void saveQuiet()} disabled={savingQuiet} className="btn-gradient !px-4 !py-2 text-xs disabled:opacity-50">
            {savingQuiet ? '保存中…' : '保存'}
          </button>
        </div>
        {notice && <p className="mt-2 text-xs text-emerald-600">{notice}</p>}
      </section>
    </div>
  )
}
