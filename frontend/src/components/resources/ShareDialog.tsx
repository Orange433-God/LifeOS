import { useEffect, useState } from 'react'
import { Check, Copy, Link2, X } from 'lucide-react'
import { shareResource } from '../../api/resources'
import { getErrorMessage } from '../../lib/api'

interface ShareDialogProps {
  resourceId: string
  onClose: () => void
}

/** 分享弹窗：生成 7 天有效链接 + 复制 */
export function ShareDialog({ resourceId, onClose }: ShareDialogProps) {
  const [shareUrl, setShareUrl] = useState('')
  const [expiresAt, setExpiresAt] = useState('')
  const [copied, setCopied] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    shareResource(resourceId)
      .then((s) => {
        setShareUrl(s.shareUrl)
        setExpiresAt(s.expiresAt)
      })
      .catch((err) => setError(getErrorMessage(err)))
  }, [resourceId])

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(shareUrl)
      setCopied(true)
      window.setTimeout(() => setCopied(false), 2000)
    } catch {
      setError('复制失败，请手动复制')
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center px-4">
      <button type="button" aria-label="关闭" onClick={onClose} className="absolute inset-0 cursor-default bg-night-950/60 backdrop-blur-[3px]" />
      <div className="glass-panel animate-fade-in relative z-10 w-full max-w-md p-6">
        <header className="flex items-center justify-between">
          <h3 className="flex items-center gap-2 text-lg font-semibold text-[#2c2947]">
            <Link2 size={18} strokeWidth={1.8} className="text-iris-600" />
            分享资源
          </h3>
          <button type="button" onClick={onClose} className="rounded-lg p-1.5 text-[#5f5787] hover:bg-[#f0eff9] hover:text-[#2c2947]">
            <X size={18} strokeWidth={1.8} />
          </button>
        </header>

        {error ? (
          <p className="mt-4 text-sm text-red-500">{error}</p>
        ) : (
          <>
            <div className="mt-4 flex items-center gap-2 rounded-xl border border-[#cfc9e4] bg-[#f0eff9]/80 p-2.5">
              <input readOnly value={shareUrl} className="min-w-0 flex-1 bg-transparent text-xs text-[#3a3652] outline-none" />
              <button type="button" onClick={() => void copy()} className="flex shrink-0 items-center gap-1 rounded-lg bg-gradient-to-r from-blue-500/80 to-purple-500/80 px-3 py-1.5 text-xs text-[#2c2947]">
                {copied ? <Check size={13} /> : <Copy size={13} />}
                {copied ? '已复制' : '复制'}
              </button>
            </div>
            <p className="mt-2 text-xs text-[#8b84a8]">
              链接有效期 7 天（{expiresAt ? new Date(expiresAt).toLocaleDateString() : ''} 前），任何人可查看
            </p>
          </>
        )}
      </div>
    </div>
  )
}
