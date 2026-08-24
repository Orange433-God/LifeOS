import { useState } from 'react'
import { Download, Eye, Heart, Share2, Trash2, X } from 'lucide-react'
import { deleteResource, downloadResource, toggleCollect } from '../../api/resources'
import { getErrorMessage } from '../../lib/api'
import { RESOURCE_TYPE_META, formatBytes } from '../../lib/constants'
import type { ResourceItem } from '../../lib/types'
import { ShareDialog } from './ShareDialog'

interface ResourceDetailModalProps {
  resource: ResourceItem
  isOwner: boolean
  onClose: () => void
  onChanged: () => void
}

const IMAGE_MIME = ['image/png', 'image/jpeg', 'image/gif', 'image/webp']

/** 资源详情弹窗：预览（图片/PDF）/ 描述 / 下载 / 收藏 / 删除（上传者） */
export function ResourceDetailModal({ resource, isOwner, onClose, onChanged }: ResourceDetailModalProps) {
  const [collected, setCollected] = useState(resource.collected ?? false)
  const [shareOpen, setShareOpen] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const meta = RESOURCE_TYPE_META[resource.type] ?? RESOURCE_TYPE_META.link!

  const isImage = !!resource.fileType && IMAGE_MIME.includes(resource.fileType)
  const isPdf = resource.fileType === 'application/pdf'

  const handleDownload = async () => {
    setError(null)
    try {
      const url = await downloadResource(resource.id)
      window.open(url, '_blank')
      onChanged()
    } catch (err) {
      setError(getErrorMessage(err))
    }
  }

  const handleCollect = async () => {
    setError(null)
    try {
      setCollected(await toggleCollect(resource.id))
      onChanged()
    } catch (err) {
      setError(getErrorMessage(err))
    }
  }

  const handleDelete = async () => {
    if (!window.confirm(`确定删除资源「${resource.name}」吗？物理文件将一并删除。`)) return
    setError(null)
    try {
      await deleteResource(resource.id)
      onChanged()
      onClose()
    } catch (err) {
      setError(getErrorMessage(err))
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center px-4">
      <button type="button" aria-label="关闭" onClick={onClose} className="absolute inset-0 cursor-default bg-night-950/60 backdrop-blur-[3px]" />
      <div className="glass-panel animate-fade-in relative z-10 max-h-[85vh] w-full max-w-xl overflow-y-auto p-6">
        <header className="flex items-start justify-between gap-3">
          <h3 className="min-w-0 flex-1 break-words text-xl font-semibold text-[#2c2947]">{resource.name}</h3>
          <div className="flex shrink-0 gap-1.5">
            {isOwner && (
              <button type="button" onClick={() => void handleDelete()} title="删除资源" className="rounded-lg p-1.5 text-[#8b84a8] hover:bg-[#f0eff9] hover:text-red-500">
                <Trash2 size={15} strokeWidth={1.8} />
              </button>
            )}
            <button type="button" onClick={onClose} className="rounded-lg p-1.5 text-[#5f5787] hover:bg-[#f0eff9] hover:text-[#2c2947]">
              <X size={18} strokeWidth={1.8} />
            </button>
          </div>
        </header>

        {/* 预览：图片直接展示，PDF 用 iframe，其余显示类型图标 */}
        <div className="mt-4 overflow-hidden rounded-xl border border-[#cfc9e4]/60 bg-white/60">
          {isImage && resource.fileUrl ? (
            <img src={resource.fileUrl} alt={resource.name} loading="lazy" className="max-h-64 w-full object-contain" />
          ) : isPdf && resource.fileUrl ? (
            <iframe src={resource.fileUrl} title={resource.name} className="h-64 w-full" />
          ) : (
            <div className="flex h-32 flex-col items-center justify-center gap-2 text-[#8b84a8]">
              <span className="text-4xl">{meta.icon}</span>
              <span className="text-xs">{resource.fileType ?? meta.label}</span>
            </div>
          )}
        </div>

        <div className="mt-4 flex flex-wrap items-center gap-2 text-xs">
          <span className="rounded-full border border-[#cfc9e4] bg-[#f0eff9]/80 px-2.5 py-0.5 text-[#3a3652]">
            {meta.icon} {meta.label} · {resource.category}
          </span>
          {resource.tags.map((tag) => (
            <span key={tag} className="rounded-full border border-iris-400/30 bg-iris-500/10 px-2.5 py-0.5 text-iris-600"># {tag}</span>
          ))}
        </div>

        {resource.description && (
          <p className="mt-3 text-sm leading-relaxed text-[#3a3652]">{resource.description}</p>
        )}

        <p className="mt-3 text-xs text-[#8b84a8]">
          {resource.uploaderName ?? '未知用户'} 上传 · {new Date(resource.uploadedAt).toLocaleString()} · {formatBytes(resource.fileSize)}
        </p>

        <div className="mt-3 flex items-center gap-4 text-xs text-[#8b84a8]">
          <span className="flex items-center gap-1"><Download size={12} /> {resource.downloadCount} 次下载</span>
          <span className="flex items-center gap-1"><Eye size={12} /> {resource.viewCount} 次浏览</span>
        </div>

        {error && <p className="mt-3 text-xs text-red-500">{error}</p>}

        <div className="mt-5 flex gap-3">
          <button type="button" onClick={() => void handleDownload()} className="btn-gradient flex flex-1 items-center justify-center gap-1.5">
            <Download size={15} strokeWidth={2} />
            下载
          </button>
          <button
            type="button"
            onClick={() => void handleCollect()}
            className={`flex flex-1 items-center justify-center gap-1.5 rounded-xl border py-2.5 text-sm transition ${
              collected
                ? 'border-gold-400/50 bg-gold-500/10 text-gold-400'
                : 'border-[#cfc9e4] text-[#3a3652] hover:border-iris-400/40 hover:text-[#2c2947]'
            }`}
          >
            <Heart size={15} strokeWidth={1.8} fill={collected ? 'currentColor' : 'none'} />
            {collected ? '已收藏' : '收藏'}
          </button>
          <button
            type="button"
            onClick={() => setShareOpen(true)}
            className="flex flex-1 items-center justify-center gap-1.5 rounded-xl border border-[#cfc9e4] py-2.5 text-sm text-[#3a3652] transition hover:border-iris-400/40 hover:text-[#2c2947]"
          >
            <Share2 size={15} strokeWidth={1.8} />
            分享
          </button>
        </div>
      </div>

      {shareOpen && <ShareDialog resourceId={resource.id} onClose={() => setShareOpen(false)} />}
    </div>
  )
}
