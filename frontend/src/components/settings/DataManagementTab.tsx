import { useState } from 'react'
import { Download } from 'lucide-react'
import { clearData, deleteAccount, exportData } from '../../api/settings'
import { getErrorMessage } from '../../lib/api'
import { useAuth } from '../../context/AuthContext'
import type { MergedSettings } from '../../lib/types'
import { SettingRow } from './SettingRow'

interface DataManagementTabProps {
  data: MergedSettings
  onNotice: (message: string) => void
  onAccountDeleted: () => void
}

/** 确认弹窗（可要求输入指定文本） */
function ConfirmModal({
  title,
  message,
  requireText,
  confirmLabel,
  danger,
  onConfirm,
  onClose,
}: {
  title: string
  message: string
  requireText?: string
  confirmLabel: string
  danger?: boolean
  onConfirm: () => Promise<void>
  onClose: () => void
}) {
  const [text, setText] = useState('')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const valid = requireText ? text === requireText : true

  const run = async () => {
    setBusy(true)
    setError(null)
    try {
      await onConfirm()
      onClose()
    } catch (err) {
      setError(getErrorMessage(err))
      setBusy(false)
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center px-4">
      <button type="button" aria-label="关闭" onClick={onClose} className="absolute inset-0 cursor-default bg-night-950/60 backdrop-blur-[3px]" />
      <div className="animate-fade-in relative z-10 w-full max-w-md rounded-2xl border border-[#cfc9e4]/60 bg-white/95 p-6 shadow-xl backdrop-blur-xl">
        <h3 className="text-lg font-semibold text-white">{title}</h3>
        <p className="mt-2 text-sm leading-relaxed text-[#5f5787]">{message}</p>
        {requireText && (
          <input
            value={text}
            onChange={(e) => setText(e.target.value)}
            placeholder={`请输入：${requireText}`}
            className="mt-4 w-full rounded-xl border border-[#cfc9e4] bg-[#f0eff9]/80 px-4 py-2.5 text-sm text-[#3a3652] placeholder-[#8b84a8] outline-none focus:border-red-400/50"
          />
        )}
        {error && <p className="mt-2 text-xs text-red-500">{error}</p>}
        <div className="mt-4 flex justify-end gap-3">
          <button type="button" onClick={onClose} className="rounded-xl border border-[#cfc9e4] px-4 py-2 text-sm text-[#3a3652] hover:text-[#2c2947]">取消</button>
          <button
            type="button"
            onClick={() => void run()}
            disabled={busy || !valid}
            className={`flex items-center gap-1.5 rounded-xl px-4 py-2 text-sm font-medium text-white transition disabled:opacity-40 ${
              danger ? 'bg-red-500/80 hover:bg-red-500' : 'bg-gradient-to-r from-blue-500 to-purple-500'
            }`}
          >
            {busy ? '处理中…' : confirmLabel}
          </button>
        </div>
      </div>
    </div>
  )
}

/** 数据管理 Tab：导出 / 分项清除 / 注销账户 */
export function DataManagementTab({ data, onNotice, onAccountDeleted }: DataManagementTabProps) {
  const { state } = useAuth()
  const [confirm, setConfirm] = useState<null | 'records' | 'goals' | 'all' | 'account'>(null)

  if (state.status !== 'authed' || !state.profile) return null
  const email = data.profile.email

  const handleExport = async () => {
    try {
      await exportData()
      onNotice('数据导出已开始下载 📦')
    } catch (err) {
      onNotice(getErrorMessage(err))
    }
  }

  const handleClear = async (scope: 'records' | 'goals' | 'all') => {
    await clearData(scope)
    onNotice('数据已清除')
  }

  return (
    <div className="space-y-5">
      <section className="rounded-2xl border border-[#cfc9e4]/60 bg-[#f0eff9] backdrop-blur-xl">
        <h2 className="border-b border-white/5 px-4 py-3 text-sm font-medium text-[#2c2947]">数据管理</h2>
        <SettingRow
          label="数据导出"
          value="导出所有个人数据（JSON）"
          control={<Download size={15} strokeWidth={1.8} className="text-iris-600" />}
          onClick={() => void handleExport()}
        />
        <SettingRow label="清除记录" value="删除全部人生记录" onClick={() => setConfirm('records')} />
        <SettingRow label="清除目标" value="删除全部目标与行动" onClick={() => setConfirm('goals')} />
        <SettingRow label="清除聊天" value="聊天记录暂存于 AI 服务，即将支持" onClick={() => onNotice('聊天记录清除即将开放')} />
        <SettingRow label="清除全部" value="记录 + 目标 + 属性快照" danger onClick={() => setConfirm('all')} />
      </section>

      <section className="rounded-2xl border border-red-400/20 bg-red-500/[0.04] backdrop-blur-xl">
        <h2 className="border-b border-white/5 px-4 py-3 text-sm font-medium text-[#2c2947]">危险操作</h2>
        <SettingRow
          label="注销账户"
          value="删除账户与全部数据，不可恢复"
          danger
          onClick={() => setConfirm('account')}
        />
      </section>

      {confirm === 'records' && (
        <ConfirmModal
          title="清除全部人生记录？"
          message="此操作不可恢复，确定要删除所有记录吗？"
          confirmLabel="确认清除"
          danger
          onClose={() => setConfirm(null)}
          onConfirm={() => handleClear('records')}
        />
      )}
      {confirm === 'goals' && (
        <ConfirmModal
          title="清除全部目标？"
          message="所有目标及其行动将被删除，此操作不可恢复。"
          confirmLabel="确认清除"
          danger
          onClose={() => setConfirm(null)}
          onConfirm={() => handleClear('goals')}
        />
      )}
      {confirm === 'all' && (
        <ConfirmModal
          title="清除全部数据？"
          message="将删除所有人生记录、目标与行动、属性快照。账号本身会保留。"
          requireText="确认清除"
          confirmLabel="清除全部"
          danger
          onClose={() => setConfirm(null)}
          onConfirm={() => handleClear('all')}
        />
      )}
      {confirm === 'account' && (
        <ConfirmModal
          title="注销账户？"
          message={`此操作将永久删除你的账户与全部数据。请输入你的注册邮箱（${email}）以确认。`}
          requireText={email}
          confirmLabel="永久注销"
          danger
          onClose={() => setConfirm(null)}
          onConfirm={async () => {
            await deleteAccount(email)
            onAccountDeleted()
          }}
        />
      )}
    </div>
  )
}
