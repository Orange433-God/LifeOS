import { useCallback, useEffect, useMemo, useState } from 'react'
import { useSearchParams } from 'react-router-dom'
import { RefreshCw, Search, Upload } from 'lucide-react'
import {
  batchDelete,
  batchMove,
  getCategories,
  getRecommended,
  getResources,
  getResourceTags,
  getStats,
} from '../api/resources'
import { Sidebar } from '../components/Sidebar'
import { BatchActionBar } from '../components/resources/BatchActionBar'
import { CategoryGrid } from '../components/resources/CategoryGrid'
import { RecommendedList } from '../components/resources/RecommendedList'
import { ResourceDetailModal } from '../components/resources/ResourceDetailModal'
import { ResourceTable } from '../components/resources/ResourceTable'
import { ResourceTabs, type ResourceTabKey } from '../components/resources/ResourceTabs'
import { StatCards } from '../components/resources/StatCards'
import { TagCloud } from '../components/resources/TagCloud'
import { UploadResourceModal } from '../components/resources/UploadResourceModal'
import { useAuth } from '../context/AuthContext'
import { getErrorMessage } from '../lib/api'
import type { ResourceCategoryCount, ResourceItem, ResourceStats, TagCount } from '../lib/types'

/** 防抖（300ms） */
function useDebounced<T>(value: T, delay = 300): T {
  const [debounced, setDebounced] = useState(value)
  useEffect(() => {
    const timer = setTimeout(() => setDebounced(value), delay)
    return () => clearTimeout(timer)
  }, [value, delay])
  return debounced
}

type TableFilter = 'all' | 'mine' | 'collected'

/** 资源中心页：快捷入口 + 统计 + 精选 + 分类 + 最近更新 */
export default function ResourcesPage() {
  const { state } = useAuth()
  const [searchParams] = useSearchParams()
  const [tab, setTab] = useState<ResourceTabKey>('all')
  const [keyword, setKeyword] = useState(searchParams.get('q') ?? '')
  const debouncedKeyword = useDebounced(keyword)
  const [tagFilter, setTagFilter] = useState('')
  const [items, setItems] = useState<ResourceItem[]>([])
  const [stats, setStats] = useState<ResourceStats | null>(null)
  const [recommended, setRecommended] = useState<ResourceItem[]>([])
  const [categories, setCategories] = useState<ResourceCategoryCount[]>([])
  const [tags, setTags] = useState<TagCount[]>([])
  const [tableFilter, setTableFilter] = useState<TableFilter>('all')
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [uploadOpen, setUploadOpen] = useState(false)
  const [detail, setDetail] = useState<ResourceItem | null>(null)
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set())
  const [busy, setBusy] = useState(false)

  const load = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const [list, s, rec, cats, tg] = await Promise.all([
        getResources({
          type: tab === 'all' || tab === 'collected' ? '' : tab,
          keyword: debouncedKeyword.trim() || undefined,
          sort: 'latest',
          collected: tab === 'collected' ? '1' : undefined,
          limit: 50,
        }),
        getStats(),
        getRecommended(),
        getCategories(),
        getResourceTags(),
      ])
      setItems(list.items)
      setStats(s)
      setRecommended(rec)
      setCategories(cats)
      setTags(tg)
      setSelectedIds(new Set())
    } catch (err) {
      setError(getErrorMessage(err))
    } finally {
      setLoading(false)
    }
  }, [tab, debouncedKeyword])

  useEffect(() => {
    void load()
  }, [load])

  if (state.status !== 'authed' || !state.profile) return null
  const myId = state.profile.profile.userId

  const tableItems = useMemo(() => {
    let list = items
    if (tableFilter === 'mine') list = list.filter((r) => r.userId === myId)
    if (tableFilter === 'collected') list = list.filter((r) => r.collected)
    if (tagFilter) list = list.filter((r) => r.tags.includes(tagFilter))
    return list
  }, [items, tableFilter, tagFilter, myId])

  const toggleSelect = (id: string) => {
    setSelectedIds((prev) => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
  }

  const handleBatchDelete = async () => {
    if (!window.confirm(`确定删除选中的 ${selectedIds.size} 个资源吗？物理文件将一并删除。`)) return
    setBusy(true)
    setError(null)
    try {
      await batchDelete([...selectedIds])
      await load()
    } catch (err) {
      setError(getErrorMessage(err))
    } finally {
      setBusy(false)
    }
  }

  const handleBatchMove = async (category: string) => {
    setBusy(true)
    setError(null)
    try {
      await batchMove([...selectedIds], category)
      await load()
    } catch (err) {
      setError(getErrorMessage(err))
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className="flex h-screen overflow-hidden bg-[#ece9f7]">
      <Sidebar activeKey="resources" variant="light" />

      <main className="min-w-0 flex-1 overflow-y-auto p-6 lg:p-8">
        {/* 顶部：标题 + 搜索 + 上传 */}
        <header className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h1 className="text-2xl font-semibold text-[#2c2947]">资源中心</h1>
            <p className="mt-1 text-sm text-[#5f5787]">发现优质资源，助力你的成长与创作</p>
          </div>
          <div className="flex items-center gap-3">
            <div className="flex items-center gap-2 rounded-xl border border-[#cfc9e4] bg-[#f0eff9]/80 px-3 py-2 backdrop-blur">
              <Search size={15} strokeWidth={1.8} className="shrink-0 text-[#8b84a8]" />
              <input
                value={keyword}
                onChange={(e) => setKeyword(e.target.value)}
                placeholder="搜索资源、模板、工具.."
                maxLength={50}
                className="w-40 bg-transparent text-sm text-[#3a3652] placeholder-[#8b84a8] outline-none"
              />
            </div>
            <button type="button" onClick={() => setUploadOpen(true)} className="btn-gradient flex items-center gap-1.5">
              <Upload size={15} strokeWidth={2} />
              上传资源
            </button>
          </div>
        </header>

        {/* 快捷入口 */}
        <div className="mt-5">
          <ResourceTabs active={tab} onChange={setTab} />
        </div>

        {/* 标签云 */}
        {tags.length > 0 && (
          <div className="glass-panel mt-4 px-4 py-3">
            <TagCloud tags={tags} active={tagFilter} onSelect={setTagFilter} />
          </div>
        )}

        {/* 批量操作栏 */}
        {selectedIds.size > 0 && (
          <div className="mt-4">
            <BatchActionBar
              selectedCount={selectedIds.size}
              busy={busy}
              onDelete={() => void handleBatchDelete()}
              onMove={(c) => void handleBatchMove(c)}
            />
          </div>
        )}

        {/* 统计卡片 */}
        {stats && (
          <div className="mt-5">
            <StatCards stats={stats} />
          </div>
        )}

        {/* 精选推荐 */}
        <section className="mt-6">
          <div className="flex items-center justify-between">
            <h2 className="text-sm font-medium tracking-widest text-[#5f5787]">精选推荐</h2>
            <button type="button" onClick={() => setTab('all')} className="text-xs text-iris-600 transition hover:text-[#2c2947]">
              查看更多 →
            </button>
          </div>
          <div className="mt-3">
            {loading ? (
              <div className="flex gap-4 overflow-hidden">
                {[0, 1, 2].map((i) => (
                  <div key={i} className="h-32 w-64 shrink-0 animate-pulse rounded-xl bg-[#f0eff9]/80" />
                ))}
              </div>
            ) : (
              <RecommendedList items={recommended} onSelect={(r) => setDetail(r)} />
            )}
          </div>
        </section>

        {/* 资源分类 */}
        <section className="mt-6">
          <h2 className="text-sm font-medium tracking-widest text-[#5f5787]">资源分类</h2>
          <div className="mt-3">
            <CategoryGrid categories={categories} onSelect={(t) => setTab(t)} />
          </div>
        </section>

        {/* 最近更新 */}
        <section className="mt-6 pb-6">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <h2 className="text-sm font-medium tracking-widest text-[#5f5787]">最近更新</h2>
            <div className="flex gap-2">
              {([['all', '全部'], ['mine', '我上传的'], ['collected', '我收藏的']] as Array<[TableFilter, string]>).map(([key, label]) => (
                <button
                  key={key}
                  type="button"
                  onClick={() => setTableFilter(key)}
                  className={`rounded-full px-3 py-1 text-xs transition ${
                    tableFilter === key
                      ? 'bg-gradient-to-r from-blue-500/80 to-purple-500/80 font-medium text-[#2c2947]'
                      : 'border border-[#cfc9e4] bg-[#f0eff9]/80 text-[#5f5787] hover:text-[#3a3652]'
                  }`}
                >
                  {label}
                </button>
              ))}
            </div>
          </div>
          <div className="mt-3">
            {loading ? (
              <div className="h-40 animate-pulse rounded-xl bg-[#f0eff9]/80" />
            ) : error && items.length === 0 ? (
              <div className="flex flex-col items-center gap-3 py-10 text-center">
                <p className="text-[#3a3652]">{error}</p>
                <button type="button" onClick={() => void load()} className="btn-gradient flex items-center gap-1.5">
                  <RefreshCw size={15} />
                  重试
                </button>
              </div>
            ) : (
              <ResourceTable
                items={tableItems}
                onSelect={(r) => setDetail(r)}
                selectable
                selectedIds={selectedIds}
                onToggleSelect={toggleSelect}
              />
            )}
          </div>
        </section>
      </main>

      {/* 弹窗 */}
      {uploadOpen && (
        <UploadResourceModal
          onClose={() => setUploadOpen(false)}
          onUploaded={() => void load()}
        />
      )}
      {detail && (
        <ResourceDetailModal
          resource={detail}
          isOwner={detail.userId === myId}
          onClose={() => setDetail(null)}
          onChanged={() => void load()}
        />
      )}
    </div>
  )
}
