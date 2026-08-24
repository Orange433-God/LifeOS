import { useCallback, useEffect, useMemo, useState } from 'react'
import { useSearchParams } from 'react-router-dom'
import { PenLine, RefreshCw, Search } from 'lucide-react'
import { deleteRecord, getRecords } from '../api/records'
import { QuickRecordModal } from '../components/room/QuickRecordModal'
import { CalendarView } from '../components/records/CalendarView'
import { FilterTags } from '../components/records/FilterTags'
import { RecordDetail } from '../components/records/RecordDetail'
import { RecordList } from '../components/records/RecordList'
import { TimelineSidebar } from '../components/records/TimelineSidebar'
import { ViewTabs, type RecordsView } from '../components/records/ViewTabs'
import { Sidebar } from '../components/Sidebar'
import { useAuth } from '../context/AuthContext'
import { getErrorMessage } from '../lib/api'
import { MOOD_META, RECORD_FILTERS } from '../lib/constants'
import type { LifeRecord, QuickRecordResult } from '../lib/types'

const VALID_VIEWS: RecordsView[] = ['timeline', 'calendar', 'list', 'gallery']

const dateKeyOf = (iso: string): string => {
  const d = new Date(iso)
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
}

/** 人生记录页：时间轴 / 日历 / 列表 / 相册 四视图 + 三栏布局 */
export default function RecordsPage() {
  const { state } = useAuth()
  const [searchParams, setSearchParams] = useSearchParams()
  const viewParam = searchParams.get('view')
  const view: RecordsView = VALID_VIEWS.includes(viewParam as RecordsView) ? (viewParam as RecordsView) : 'timeline'

  const [records, setRecords] = useState<LifeRecord[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [filter, setFilter] = useState('all')
  const [search, setSearch] = useState('')
  const [selectedDate, setSelectedDate] = useState<string>(dateKeyOf(new Date().toISOString()))
  const [selectedId, setSelectedId] = useState<string | null>(null)
  const [createOpen, setCreateOpen] = useState(false)

  const load = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const list = await getRecords({ limit: 500 })
      setRecords(list)
      // 全局搜索 ?record= 直达：优先选中指定记录
      const recordParam = searchParams.get('record')
      const target = recordParam ? list.find((r) => r.id === recordParam) : undefined
      if (target) {
        setSelectedDate(dateKeyOf(target.recordedAt))
        setSelectedId(target.id)
      } else if (list.length > 0) {
        setSelectedDate(dateKeyOf(list[0]!.recordedAt))
        setSelectedId((prev) => prev ?? list[0]!.id)
      }
    } catch (err) {
      setError(getErrorMessage(err))
    } finally {
      setLoading(false)
    }
  }, [searchParams])

  useEffect(() => {
    void load()
  }, [load])

  if (state.status !== 'authed' || !state.profile) return null

  const setView = (v: RecordsView) => {
    setSearchParams(v === 'timeline' ? {} : { view: v }, { replace: true })
  }

  // 筛选 + 搜索
  const filterRule = RECORD_FILTERS.find((f) => f.key === filter) ?? RECORD_FILTERS[0]!
  const keyword = search.trim().toLowerCase()
  const filtered = useMemo(
    () =>
      records.filter(
        (r) =>
          filterRule.match(r.tags, r.type, r.mood) &&
          (keyword === '' ||
            (r.title ?? '').toLowerCase().includes(keyword) ||
            r.rawContent.toLowerCase().includes(keyword) ||
            r.tags.some((t) => t.toLowerCase().includes(keyword))),
      ),
    [records, filterRule, keyword],
  )

  const dayRecords = useMemo(
    () => filtered.filter((r) => dateKeyOf(r.recordedAt) === selectedDate),
    [filtered, selectedDate],
  )

  const selected = records.find((r) => r.id === selectedId) ?? null
  const related = useMemo(() => {
    if (!selected) return []
    const sameDay = filtered.filter((r) => r.id !== selected.id && dateKeyOf(r.recordedAt) === dateKeyOf(selected.recordedAt))
    return sameDay.length > 0 ? sameDay : filtered.filter((r) => r.id !== selected.id).slice(0, 3)
  }, [selected, filtered])

  const handleDelete = async (record: LifeRecord) => {
    if (!window.confirm(`确定删除这条记录吗？\n「${record.title ?? record.rawContent.slice(0, 20)}」`)) return
    try {
      await deleteRecord(record.id)
      if (selectedId === record.id) setSelectedId(null)
      await load()
    } catch (err) {
      setError(getErrorMessage(err))
    }
  }

  const handleSaved = async (_result: QuickRecordResult) => {
    await load()
  }

  const isTimelineLike = view === 'timeline' || view === 'calendar'
  const detailPanel = (width: string) => (
    <aside className={`min-w-0 ${width}`}>
      <RecordDetail
        record={selected}
        related={related}
        myUserId={state.profile?.profile.userId ?? ''}
        onSelectRelated={(r) => {
          setSelectedDate(dateKeyOf(r.recordedAt))
          setSelectedId(r.id)
        }}
        onDelete={(r) => void handleDelete(r)}
      />
    </aside>
  )

  return (
    <div className="flex h-screen overflow-hidden bg-[#ece9f7]">
      <Sidebar activeKey="records" variant="light" />

      <main className="min-w-0 flex-1 overflow-y-auto p-6 lg:p-8">
        {/* 顶部：标题 + 搜索 + 新记录 */}
        <header className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h1 className="text-2xl font-semibold text-[#2c2947]">人生记录</h1>
            <p className="mt-1 text-sm text-[#5f5787]">每一天都值得被记住</p>
          </div>
          <div className="flex items-center gap-3">
            <div className="flex items-center gap-2 rounded-xl border border-[#cfc9e4] bg-white/70 px-3 py-2 backdrop-blur">
              <Search size={15} strokeWidth={1.8} className="shrink-0 text-[#8b84a8]" />
              <input
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="搜索记录、标签、地点.."
                className="w-44 bg-transparent text-sm text-[#3a3652] placeholder-[#8b84a8] outline-none"
              />
            </div>
            <button type="button" onClick={() => setCreateOpen(true)} className="btn-gradient flex items-center gap-1.5">
              <PenLine size={15} strokeWidth={2} />
              新记录
            </button>
          </div>
        </header>

        {/* 视图 Tab */}
        <div className="mt-5">
          <ViewTabs active={view} onChange={setView} />
        </div>

        {/* 筛选标签 */}
        <div className="mt-4">
          <FilterTags active={filter} onChange={setFilter} />
        </div>

        {/* 内容区 */}
        <div className="mt-5 pb-6">
          {loading ? (
            <div className="grid gap-4 lg:grid-cols-3">
              <div className="h-64 animate-pulse rounded-xl bg-white/60" />
              <div className="h-64 animate-pulse rounded-xl bg-white/60" />
              <div className="h-64 animate-pulse rounded-xl bg-white/60" />
            </div>
          ) : error && records.length === 0 ? (
            <div className="flex flex-col items-center gap-3 py-12 text-center">
              <p className="text-[#3a3652]">{error}</p>
              <button type="button" onClick={() => void load()} className="btn-gradient flex items-center gap-1.5">
                <RefreshCw size={15} />
                重试
              </button>
            </div>
          ) : view === 'gallery' ? (
            /* 相册视图：卡片网格 + 右侧详情 */
            <div className="grid gap-5 lg:grid-cols-[1fr_360px]">
              <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-3">
                {filtered.length === 0 ? (
                  <p className="col-span-full py-10 text-center text-sm text-[#8b84a8]">
                    没有匹配的记录 ✨
                  </p>
                ) : (
                  filtered.map((record) => (
                    <RecordList
                      key={record.id}
                      records={[record]}
                      selectedId={selectedId}
                      onSelect={(r) => setSelectedId(r.id)}
                    />
                  ))
                )}
              </div>
              {detailPanel('')}
            </div>
          ) : (
            /* 时间轴 / 日历 / 列表 视图 */
            <div
              className={`grid gap-5 ${
                view === 'list'
                  ? 'lg:grid-cols-[1fr_360px]'
                  : 'lg:grid-cols-[220px_1fr_360px]'
              }`}
            >
              {/* 左栏：时间轴视图=月份分组时间轴；日历视图=月历+心情图例（列表视图隐藏） */}
              {isTimelineLike && (
                <aside className="min-w-0 space-y-3">
                  {view === 'timeline' ? (
                    <TimelineSidebar
                      records={filtered}
                      selectedDate={selectedDate}
                      onSelectDate={(key) => {
                        setSelectedDate(key)
                        const first = filtered.find((r) => dateKeyOf(r.recordedAt) === key)
                        setSelectedId(first?.id ?? null)
                      }}
                    />
                  ) : (
                    <>
                      <CalendarView
                        records={filtered}
                        selectedDate={selectedDate}
                        onSelectDate={(key) => {
                          setSelectedDate(key)
                          const first = filtered.find((r) => dateKeyOf(r.recordedAt) === key)
                          setSelectedId(first?.id ?? null)
                        }}
                      />
                      {/* 心情图例 */}
                      <div className="rounded-xl border border-[#cfc9e4]/60 bg-white/70 p-3 backdrop-blur-sm">
                        <p className="text-xs font-medium text-[#2c2947]">心情</p>
                        <div className="mt-1.5 flex flex-wrap gap-x-3 gap-y-1">
                          {Object.values(MOOD_META).map((m) => (
                            <span key={m.label} className="text-xs text-[#5f5787]">
                              {m.emoji} {m.label}
                            </span>
                          ))}
                        </div>
                      </div>
                    </>
                  )}
                </aside>
              )}

              {/* 中栏：记录卡片列表 */}
              <div className="min-w-0">
                {isTimelineLike ? (
                  <RecordList
                    records={dayRecords}
                    selectedId={selectedId}
                    onSelect={(r) => setSelectedId(r.id)}
                    emptyText="这一天还没有记录，记录下你的想法吧 ✨"
                  />
                ) : (
                  <RecordList
                    records={filtered}
                    selectedId={selectedId}
                    onSelect={(r) => {
                      setSelectedDate(dateKeyOf(r.recordedAt))
                      setSelectedId(r.id)
                    }}
                    emptyText="没有匹配的记录，换个筛选条件试试 ✨"
                  />
                )}
              </div>

              {/* 右栏：记录详情 */}
              {detailPanel('')}
            </div>
          )}
        </div>
      </main>

      {/* 快速记录模态框 */}
      {createOpen && (
        <QuickRecordModal onClose={() => setCreateOpen(false)} onSaved={(r) => void handleSaved(r)} />
      )}
    </div>
  )
}
