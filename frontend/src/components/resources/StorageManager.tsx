import { useEffect, useState } from 'react'
import { HardDrive, X } from 'lucide-react'
import { cleanupStorage, getStorageUsage } from '../../api/resources'
import { getErrorMessage } from '../../lib/api'
import { formatBytes } from '../../lib/constants'
import type { StorageUsage } from '../../lib/types'

interface StorageManagerProps {
  onClose: () => void
}

/** 云空间管理弹窗：用量 + 清理孤儿文件 */
export function StorageManager({ onClose }: StorageManagerProps) {
  const [usage, setUsage] = useState<StorageUsage | null>(null)
  const [cleaning, setCleaning] = useState(false)
  const [result, setResult] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    getStorageUsage()
      .then(setUsage)
      .catch((err) => setError(getErrorMessage(err)))
  }, [])

  const handleCleanup = async () => {
    setCleaning(true)
    setError(null)
    setResult(null)
    try {
      const r = await cleanupStorage()
      setResult(`已清理 ${r.removedCount} 个孤儿文件，释放 ${formatBytes(r.freedBytes)}`)
      setUsage(await getStorageUsage())
    } catch (err) {
      setError(getErrorMessage(err))
    } finally {
      setCleaning(false)
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center px-4">
      <button type="button" aria-label="关闭" onClick={onClose} className="absolute inset-0 cursor-default bg-night-950/60 backdrop-blur-[3px]" />
      <div className="glass-panel animate-fade-in relative z-10 w-full max-w-md p-6">
        <header className="flex items-center justify-between">
          <h2 className="flex items-center gap-2 text-lg font-semibold text-[#2c2947]">
            <HardDrive size={18} strokeWidth={1.8} className="text-iris-600" />
            管理存储空间
          </h2>
          <button type="button" onClick={onClose} className="rounded-lg p-1.5 text-[#5f5787] hover:bg-[#f0eff9] hover:text-[#2c2947]">
            <X size={18} strokeWidth={1.8} />
          </button>
        </header>

        {error && <p className="mt-3 text-xs text-red-500">{error}</p>}
        {usage && (
          <div className="mt-5">
            <div className="flex items-center justify-between text-sm">
              <span className="text-[#5f5787]">已使用</span>
              <span className="font-medium text-[#2c2947]">
                {formatBytes(usage.used)} / {formatBytes(usage.total)}
              </span>
            </div>
            <div className="mt-2 h-2 rounded-full bg-[#d8d4e8]">
              <div
                className="h-2 rounded-full bg-gradient-to-r from-blue-500 to-purple-500 transition-all duration-500"
                style={{ width: `${Math.min(usage.usedPercent, 100)}%` }}
              />
            </div>
            <p className="mt-1.5 text-xs text-[#8b84a8]">已用 {usage.usedPercent}%</p>
          </div>
        )}

        {result && <p className="mt-3 text-xs text-emerald-600">{result}</p>}

        <button
          type="button"
          onClick={() => void handleCleanup()}
          disabled={cleaning}
          className="btn-gradient mt-5 flex w-full items-center justify-center gap-2 disabled:opacity-50"
        >
          {cleaning && <span className="h-3.5 w-3.5 animate-spin rounded-full border-2 border-white/30 border-t-white" />}
          {cleaning ? '清理中…' : '清理未使用的临时文件'}
        </button>
        <p className="mt-2 text-center text-[11px] text-[#8b84a8]">仅清理未被任何资源引用的孤儿文件，不影响正常数据</p>
      </div>
    </div>
  )
}
