import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Search } from 'lucide-react'
import { api } from '../lib/api'
import { RESOURCE_TYPE_META, RECORD_TYPE_ICONS } from '../lib/constants'
import type { ApiResponse, GlobalSearchResult } from '../lib/types'

interface GlobalSearchProps {
  /** 占位符文案（顶栏形态自定义） */
  placeholder?: string
  /** 外层容器附加类（顶栏形态去掉侧边栏内边距） */
  className?: string
  /** light：浅色底上的浅色形态（首页顶栏）；默认深色形态（侧边栏） */
  light?: boolean
}

/** 全局搜索：侧边栏顶部/顶栏搜索框，下拉分组结果，点击跳转 */
export function GlobalSearch({ placeholder = '全局搜索…', className = '', light = false }: GlobalSearchProps) {
  const navigate = useNavigate()
  const [keyword, setKeyword] = useState('')
  const [debounced, setDebounced] = useState('')
  const [result, setResult] = useState<GlobalSearchResult | null>(null)
  const [open, setOpen] = useState(false)

  useEffect(() => {
    const timer = setTimeout(() => setDebounced(keyword), 300)
    return () => clearTimeout(timer)
  }, [keyword])

  useEffect(() => {
    const q = debounced.trim()
    if (q === '') {
      setResult(null)
      return
    }
    let cancelled = false
    api
      .get<ApiResponse<GlobalSearchResult>>('/search/global', { params: { q } })
      .then(({ data }) => {
        if (!cancelled && data.success) setResult(data.data ?? null)
      })
      .catch(() => undefined)
    return () => {
      cancelled = true
    }
  }, [debounced])

  const go = (path: string) => {
    setOpen(false)
    setKeyword('')
    navigate(path)
  }

  const hasResult = result && (result.resources.length > 0 || result.records.length > 0 || result.goals.length > 0)

  return (
    <div className={`relative px-3 pb-1 ${className}`}>
      <div
        className={`flex items-center gap-2 rounded-xl border px-2.5 py-1.5 ${
          light ? 'border-[#cfc9e4] bg-white/70' : 'border-white/10 bg-white/[0.05]'
        }`}
      >
        <Search size={14} strokeWidth={1.8} className={`shrink-0 ${light ? 'text-[#8b84a8]' : 'text-slate-500'}`} />
        <input
          value={keyword}
          onChange={(e) => {
            setKeyword(e.target.value)
            setOpen(true)
          }}
          onFocus={() => setOpen(true)}
          onBlur={() => window.setTimeout(() => setOpen(false), 150)}
          placeholder={placeholder}
          maxLength={30}
          className={`w-full bg-transparent text-xs outline-none ${
            light ? 'text-[#3a3652] placeholder-[#8b84a8]' : 'text-slate-200 placeholder-slate-500'
          }`}
        />
      </div>

      {open && debounced.trim() !== '' && (
        <div
          className={`animate-fade-in absolute left-3 right-3 top-full z-40 mt-1 max-h-72 overflow-y-auto rounded-xl p-2 shadow-lg backdrop-blur-xl ${
            light ? 'border border-[#cfc9e4]/70 bg-white/90' : 'glass-panel'
          }`}
        >
          {!hasResult && (
            <p className={`px-2 py-2 text-xs ${light ? 'text-[#8b84a8]' : 'text-slate-500'}`}>没有找到相关内容</p>
          )}
          {result && result.resources.length > 0 && (
            <div className="mb-1.5">
              <p className={`px-2 py-1 text-[10px] ${light ? 'text-[#8b84a8]' : 'text-slate-600'}`}>📦 资源</p>
              {result.resources.map((r) => (
                <button key={r.id} type="button" onMouseDown={() => go(`/resources?q=${encodeURIComponent(r.name)}`)} className={`flex w-full items-center gap-2 rounded-lg px-2 py-1.5 text-left text-xs ${
                  light ? 'text-[#3a3652] hover:bg-[#f0eff9]' : 'text-slate-300 hover:bg-white/[0.06]'
                }`}>
                  <span>{RESOURCE_TYPE_META[r.type]?.icon ?? '📦'}</span>
                  <span className="min-w-0 flex-1 truncate">{r.name}</span>
                </button>
              ))}
            </div>
          )}
          {result && result.records.length > 0 && (
            <div className="mb-1.5">
              <p className={`px-2 py-1 text-[10px] ${light ? 'text-[#8b84a8]' : 'text-slate-600'}`}>📝 记录</p>
              {result.records.map((r) => (
                <button key={r.id} type="button" onMouseDown={() => go(`/records?record=${r.id}`)} className={`flex w-full items-center gap-2 rounded-lg px-2 py-1.5 text-left text-xs ${
                  light ? 'text-[#3a3652] hover:bg-[#f0eff9]' : 'text-slate-300 hover:bg-white/[0.06]'
                }`}>
                  <span>{RECORD_TYPE_ICONS[r.type] ?? '📝'}</span>
                  <span className="min-w-0 flex-1 truncate">{r.title ?? '未命名记录'}</span>
                </button>
              ))}
            </div>
          )}
          {result && result.goals.length > 0 && (
            <div>
              <p className={`px-2 py-1 text-[10px] ${light ? 'text-[#8b84a8]' : 'text-slate-600'}`}>🎯 目标</p>
              {result.goals.map((g) => (
                <button key={g.id} type="button" onMouseDown={() => go(`/goals/${g.id}`)} className={`flex w-full items-center gap-2 rounded-lg px-2 py-1.5 text-left text-xs ${
                  light ? 'text-[#3a3652] hover:bg-[#f0eff9]' : 'text-slate-300 hover:bg-white/[0.06]'
                }`}>
                  <span>🎯</span>
                  <span className="min-w-0 flex-1 truncate">{g.title}</span>
                  <span className={`shrink-0 ${light ? 'text-[#8b84a8]' : 'text-slate-600'}`}>{g.progress}%</span>
                </button>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  )
}
