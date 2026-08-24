import { useEffect, useRef, useState } from 'react'
import { PenLine, X } from 'lucide-react'
import { quickRecord } from '../../api/records'
import { getErrorMessage } from '../../lib/api'
import { RECORD_TYPE_ICONS, RECORD_TYPE_LABELS } from '../../lib/constants'
import type { QuickRecordResult } from '../../lib/types'

interface QuickRecordModalProps {
  onClose: () => void
  onSaved: (result: QuickRecordResult) => void
}

/**
 * 快速记录模态框：一句话记录此刻，AI 自动整理。
 * 成功后展示识别结果，1.5 秒后自动关闭；失败不关闭并展示错误。
 */
export function QuickRecordModal({ onClose, onSaved }: QuickRecordModalProps) {
  const [content, setContent] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [success, setSuccess] = useState<QuickRecordResult | null>(null)
  const [error, setError] = useState<string | null>(null)
  const textareaRef = useRef<HTMLTextAreaElement>(null)

  useEffect(() => {
    textareaRef.current?.focus()
  }, [])

  const submit = async () => {
    const trimmed = content.trim()
    if (!trimmed || submitting || success) return

    setSubmitting(true)
    setError(null)
    try {
      const result = await quickRecord(trimmed)
      setSuccess(result)
      onSaved(result)
      // 1.5 秒后自动关闭
      setTimeout(onClose, 1500)
    } catch (err) {
      setError(getErrorMessage(err))
    } finally {
      setSubmitting(false)
    }
  }

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    // 中文输入法选词回车不触发提交
    if (e.key === 'Enter' && !e.nativeEvent.isComposing) {
      e.preventDefault()
      void submit()
    }
  }

  return (
    <div className="absolute inset-0 z-30 flex items-center justify-center">
      {/* 背景遮罩 */}
      <button
        type="button"
        aria-label="关闭"
        onClick={onClose}
        className="absolute inset-0 cursor-default bg-night-950/50 backdrop-blur-[2px]"
      />

      <div className="glass-panel-strong animate-fade-in relative z-10 mx-6 w-full max-w-md p-6">
        {success ? (
          /* 成功态 */
          <div className="py-6 text-center">
            <p className="text-4xl">✅</p>
            <p className="mt-3 font-medium text-white">已记录！</p>
            <p className="mt-2 text-sm text-slate-400">
              AI 识别为：
              <span className="mx-1 text-iris-300">
                {RECORD_TYPE_ICONS[success.record.type]} {RECORD_TYPE_LABELS[success.record.type]}
              </span>
              · {success.record.title}
            </p>
            <p className="mt-2 text-xs text-gold-400">{success.feedback}</p>
          </div>
        ) : (
          <>
            <header className="flex items-center justify-between">
              <h2 className="flex items-center gap-2 font-medium text-white">
                <PenLine size={16} strokeWidth={1.8} className="text-iris-300" />
                一句话记录此刻
              </h2>
              <button
                type="button"
                onClick={onClose}
                title="取消"
                className="rounded-lg p-1.5 text-slate-400 transition hover:bg-white/[0.06] hover:text-white"
              >
                <X size={18} strokeWidth={1.8} />
              </button>
            </header>

            <textarea
              ref={textareaRef}
              value={content}
              onChange={(e) => setContent(e.target.value)}
              onKeyDown={handleKeyDown}
              rows={4}
              maxLength={500}
              placeholder="今天发生了什么？想到了什么？"
              className="mt-4 w-full resize-none rounded-xl border border-white/10 bg-white/[0.05] px-4 py-3 text-sm leading-relaxed text-slate-200 placeholder-slate-500 outline-none backdrop-blur transition focus:border-iris-400/50 focus:ring-2 focus:ring-iris-500/20"
            />

            {error && <p className="mt-2 text-xs text-red-400">{error}</p>}

            <div className="mt-4 flex items-center justify-end gap-3">
              <button
                type="button"
                onClick={onClose}
                disabled={submitting}
                className="rounded-xl border border-white/10 px-4 py-2 text-sm text-slate-300 transition hover:border-iris-400/40 hover:text-white"
              >
                取消
              </button>
              <button
                type="button"
                onClick={() => void submit()}
                disabled={submitting || !content.trim()}
                className="btn-gradient flex items-center gap-2 disabled:cursor-not-allowed disabled:opacity-40"
              >
                {submitting && (
                  <span className="h-3.5 w-3.5 animate-spin rounded-full border-2 border-white/30 border-t-white" />
                )}
                {submitting ? 'AI 整理中…' : '记录'}
              </button>
            </div>
            <p className="mt-3 text-right text-[11px] text-slate-600">
              Enter 快速提交 · AI 会自动分类、打标签、提取情绪
            </p>
          </>
        )}
      </div>
    </div>
  )
}
