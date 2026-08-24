import { useRef, useState } from 'react'
import { Upload, X } from 'lucide-react'
import { uploadResource } from '../../api/resources'
import { getErrorMessage } from '../../lib/api'
import { RESOURCE_CATEGORY_OPTIONS, RESOURCE_TYPE_META } from '../../lib/constants'
import type { ResourceItem, ResourceType } from '../../lib/types'
import { ToggleSwitch } from '../common/ToggleSwitch'

interface UploadResourceModalProps {
  onClose: () => void
  onUploaded: (resource: ResourceItem) => void
}

const TYPE_OPTIONS = Object.keys(RESOURCE_TYPE_META) as ResourceType[]

/** 上传资源弹窗：文件拖拽/选择或粘贴链接 + 标签回车添加 */
export function UploadResourceModal({ onClose, onUploaded }: UploadResourceModalProps) {
  const [name, setName] = useState('')
  const [description, setDescription] = useState('')
  const [type, setType] = useState<ResourceType>('learning')
  const [category, setCategory] = useState(RESOURCE_CATEGORY_OPTIONS.learning![0] ?? '')
  const [file, setFile] = useState<File | null>(null)
  const [linkUrl, setLinkUrl] = useState('')
  const [tags, setTags] = useState<string[]>([])
  const [tagInput, setTagInput] = useState('')
  const [isPublic, setIsPublic] = useState(true)
  const [dragging, setDragging] = useState(false)
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const fileRef = useRef<HTMLInputElement>(null)

  const addTag = () => {
    const t = tagInput.trim()
    if (t && !tags.includes(t) && tags.length < 10) {
      setTags((prev) => [...prev, t])
      setTagInput('')
    }
  }

  const submit = async () => {
    if (!name.trim() || submitting) return
    if (type !== 'link' && !file) {
      setError('请选择要上传的文件（或切换为「资源链接」类型粘贴链接）')
      return
    }
    if (type === 'link' && !linkUrl.trim()) {
      setError('请填写链接地址')
      return
    }

    setSubmitting(true)
    setError(null)
    try {
      const form = new FormData()
      form.append('name', name.trim())
      form.append('description', description.trim())
      form.append('type', type)
      form.append('category', category)
      form.append('isPublic', String(isPublic))
      form.append('tags', JSON.stringify(tags))
      if (file) form.append('file', file)
      if (type === 'link') form.append('linkUrl', linkUrl.trim())

      const resource = await uploadResource(form)
      onUploaded(resource)
      onClose()
    } catch (err) {
      setError(getErrorMessage(err))
      setSubmitting(false)
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center px-4">
      <button type="button" aria-label="关闭" onClick={onClose} className="absolute inset-0 cursor-default bg-night-950/60 backdrop-blur-[3px]" />
      <div className="glass-panel animate-fade-in relative z-10 max-h-[85vh] w-full max-w-lg overflow-y-auto p-6">
        <header className="flex items-center justify-between">
          <h2 className="flex items-center gap-2 text-lg font-semibold text-[#2c2947]">
            <Upload size={18} strokeWidth={1.8} className="text-iris-600" />
            上传资源
          </h2>
          <button type="button" onClick={onClose} className="rounded-lg p-1.5 text-[#5f5787] hover:bg-[#f0eff9] hover:text-[#2c2947]">
            <X size={18} strokeWidth={1.8} />
          </button>
        </header>

        <div className="mt-4 space-y-4">
          <div>
            <label className="mb-1.5 block text-xs text-[#5f5787]">资源名称 *</label>
            <input value={name} onChange={(e) => setName(e.target.value)} maxLength={100} placeholder="给资源起个名字" className="w-full rounded-xl border border-[#cfc9e4] bg-[#f0eff9]/80 px-4 py-2.5 text-sm text-[#3a3652] placeholder-[#8b84a8] outline-none focus:border-iris-400/50" />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="mb-1.5 block text-xs text-[#5f5787]">资源类型</label>
              <select
                value={type}
                onChange={(e) => {
                  const t = e.target.value as ResourceType
                  setType(t)
                  setCategory(RESOURCE_CATEGORY_OPTIONS[t]?.[0] ?? '')
                }}
                className="w-full rounded-xl border border-[#cfc9e4] bg-night-800/80 px-3 py-2.5 text-sm text-[#3a3652] outline-none"
              >
                {TYPE_OPTIONS.map((t) => (
                  <option key={t} value={t}>
                    {RESOURCE_TYPE_META[t]?.icon} {RESOURCE_TYPE_META[t]?.label}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="mb-1.5 block text-xs text-[#5f5787]">分类</label>
              <select value={category} onChange={(e) => setCategory(e.target.value)} className="w-full rounded-xl border border-[#cfc9e4] bg-night-800/80 px-3 py-2.5 text-sm text-[#3a3652] outline-none">
                {(RESOURCE_CATEGORY_OPTIONS[type] ?? []).map((c) => (
                  <option key={c} value={c}>{c}</option>
                ))}
              </select>
            </div>
          </div>

          {type === 'link' ? (
            <div>
              <label className="mb-1.5 block text-xs text-[#5f5787]">链接地址 *</label>
              <input value={linkUrl} onChange={(e) => setLinkUrl(e.target.value)} placeholder="https://…" className="w-full rounded-xl border border-[#cfc9e4] bg-[#f0eff9]/80 px-4 py-2.5 text-sm text-[#3a3652] placeholder-[#8b84a8] outline-none focus:border-iris-400/50" />
            </div>
          ) : (
            <div
              onDragOver={(e) => { e.preventDefault(); setDragging(true) }}
              onDragLeave={() => setDragging(false)}
              onDrop={(e) => { e.preventDefault(); setDragging(false); setFile(e.dataTransfer.files[0] ?? null) }}
              onClick={() => fileRef.current?.click()}
              className={`flex cursor-pointer flex-col items-center gap-2 rounded-xl border border-dashed px-4 py-7 text-center transition ${
                dragging ? 'border-iris-400/60 bg-iris-500/10' : 'border-[#b8b2d4] bg-white/60 hover:border-iris-400/40'
              }`}
            >
              <span className="text-2xl">📁</span>
              <p className="text-sm text-[#5f5787]">
                {file ? file.name : '点击选择或拖拽文件到此处'}
              </p>
              <p className="text-xs text-[#8b84a8]">支持 PDF / Word / Excel / 图片 / 压缩包，最大 50MB</p>
              <input
                ref={fileRef}
                type="file"
                className="hidden"
                onChange={(e) => setFile(e.target.files?.[0] ?? null)}
              />
            </div>
          )}

          <div>
            <label className="mb-1.5 block text-xs text-[#5f5787]">标签（回车添加）</label>
            <div className="flex flex-wrap items-center gap-1.5 rounded-xl border border-[#cfc9e4] bg-[#f0eff9]/80 px-3 py-2">
              {tags.map((t) => (
                <span key={t} className="flex items-center gap-1 rounded-full bg-iris-500/15 px-2 py-0.5 text-xs text-iris-600">
                  # {t}
                  <button type="button" onClick={() => setTags((prev) => prev.filter((x) => x !== t))} className="text-[#8b84a8] hover:text-[#2c2947]">×</button>
                </span>
              ))}
              <input
                value={tagInput}
                onChange={(e) => setTagInput(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' && !e.nativeEvent.isComposing) {
                    e.preventDefault()
                    addTag()
                  }
                }}
                placeholder={tags.length === 0 ? '输入后回车' : ''}
                className="min-w-[80px] flex-1 bg-transparent text-sm text-[#3a3652] placeholder-[#8b84a8] outline-none"
              />
            </div>
          </div>

          <div>
            <label className="mb-1.5 block text-xs text-[#5f5787]">资源描述（可选）</label>
            <textarea value={description} onChange={(e) => setDescription(e.target.value)} rows={2} maxLength={500} className="w-full resize-none rounded-xl border border-[#cfc9e4] bg-[#f0eff9]/80 px-4 py-2.5 text-sm text-[#3a3652] outline-none focus:border-iris-400/50" />
          </div>

          <div className="flex items-center justify-between">
            <span className="text-sm text-[#3a3652]">公开资源</span>
            <ToggleSwitch checked={isPublic} onChange={setIsPublic} />
          </div>

          {error && <p className="text-xs text-red-500">{error}</p>}

          <div className="flex justify-end gap-3">
            <button type="button" onClick={onClose} disabled={submitting} className="rounded-xl border border-[#cfc9e4] px-4 py-2 text-sm text-[#3a3652] hover:text-[#2c2947]">取消</button>
            <button type="button" onClick={() => void submit()} disabled={submitting || !name.trim()} className="btn-gradient flex items-center gap-2 disabled:opacity-50">
              {submitting && <span className="h-3.5 w-3.5 animate-spin rounded-full border-2 border-white/30 border-t-white" />}
              {submitting ? '上传中…' : '上传资源'}
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
