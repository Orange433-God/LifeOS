import { useEffect, useState } from 'react'
import { useParams } from 'react-router-dom'
import { Download } from 'lucide-react'
import { getSharedResource } from '../api/resources'
import { getErrorMessage } from '../lib/api'
import { RESOURCE_TYPE_META, formatBytes } from '../lib/constants'
import { Logo } from '../components/Logo'
import type { SharedResourceView } from '../lib/types'

/** 公开分享页：无需登录，通过 token 查看/下载资源 */
export default function ShareResourcePage() {
  const { token } = useParams<{ token: string }>()
  const [resource, setResource] = useState<SharedResourceView | null>(null)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (!token) return
    getSharedResource(token)
      .then(setResource)
      .catch((err) => setError(getErrorMessage(err)))
  }, [token])

  const meta = resource ? RESOURCE_TYPE_META[resource.type] ?? RESOURCE_TYPE_META.link! : null

  return (
    <div className="night-background flex min-h-screen flex-col items-center justify-center px-4 py-10">
      <Logo size="lg" dark />

      <div className="glass-panel mt-8 w-full max-w-lg p-6">
        {error ? (
          <div className="py-8 text-center">
            <span className="text-3xl">🔒</span>
            <p className="mt-3 text-slate-300">{error}</p>
          </div>
        ) : !resource ? (
          <div className="py-8 text-center">
            <div className="mx-auto h-8 w-8 animate-spin rounded-full border-4 border-white/10 border-t-iris-400" />
          </div>
        ) : (
          <>
            <h1 className="break-words text-xl font-semibold text-white">{resource.name}</h1>
            <p className="mt-2 text-xs text-slate-500">
              {meta?.icon} {meta?.label} · {resource.category} · 由 {resource.uploaderName} 分享
            </p>
            {resource.description && (
              <p className="mt-3 text-sm leading-relaxed text-white/80">{resource.description}</p>
            )}
            <div className="mt-3 flex flex-wrap gap-1.5">
              {resource.tags.map((tag) => (
                <span key={tag} className="rounded-full border border-iris-400/30 bg-iris-500/10 px-2 py-0.5 text-xs text-iris-300"># {tag}</span>
              ))}
            </div>
            <p className="mt-3 text-xs text-slate-500">
              {formatBytes(resource.fileSize)} · {resource.downloadCount} 次下载 · 链接有效期至 {new Date(resource.expiresAt).toLocaleDateString()}
            </p>
            <a
              href={resource.fileUrl ?? '#'}
              target="_blank"
              rel="noreferrer"
              className={`btn-gradient mt-5 flex items-center justify-center gap-2 ${!resource.fileUrl ? 'pointer-events-none opacity-50' : ''}`}
            >
              <Download size={15} strokeWidth={2} />
              下载资源
            </a>
          </>
        )}
      </div>

      <p className="mt-4 text-xs text-slate-600">LifeOS · 愿此身，行至山海</p>
    </div>
  )
}
