// ===== 演示模式 axios 适配器：本地返回示例数据，不发任何网络请求 =====
// 仅在构建时 VITE_DEMO_MODE=1 时启用（GitHub Pages 静态演示站）
import type { AxiosAdapter, AxiosResponse, InternalAxiosRequestConfig } from 'axios'
import {
  demoAssessment,
  demoBundle,
  demoFriends,
  demoGlobalSearch,
  demoGoals,
  demoGrowthEvents,
  demoGrowthSummary,
  demoGrowthTrends,
  demoHistory,
  demoMergedSettings,
  demoOverview,
  demoPendingRequests,
  demoPrivacy,
  demoRecords,
  demoResourceCategories,
  demoResourceList,
  demoResourceStats,
  demoResourceTags,
  demoResources,
  demoStorage,
  demoVisitStats,
} from './demoData'
import type { ApiResponse, LifeRecord, QuickRecordResult } from './types'

const ok = <T>(data: T): ApiResponse<T> => ({ success: true, data })

/** 未实现的演示接口：返回失败并打日志，便于发现遗漏 */
const notImplemented = (method: string, url: string): ApiResponse => {
  console.warn(`[demo] 未实现接口：${method} ${url}`)
  return { success: false, data: undefined, message: '演示模式未实现该接口' }
}

const respond = <T>(config: InternalAxiosRequestConfig, body: ApiResponse<T>): AxiosResponse<ApiResponse<T>> => ({
  data: body,
  status: body.success ? 200 : 400,
  statusText: 'OK',
  headers: {},
  config,
})

const url = (config: InternalAxiosRequestConfig) => config.url ?? ''
const method = (config: InternalAxiosRequestConfig) => (config.method ?? 'get').toLowerCase()
const params = (config: InternalAxiosRequestConfig) => (config.params ?? {}) as Record<string, string>

export const demoAdapter: AxiosAdapter = async (config) => {
  const u = url(config)
  const m = method(config)
  const p = params(config)

  // 资料与认证
  if (u === '/profile' && m === 'get') return respond(config, ok(demoBundle))
  if (u === '/profile' && m === 'post') return respond(config, ok(demoBundle))
  if (u === '/auth/logout') return respond(config, ok(null))
  if (u === '/room/entered') return respond(config, ok(null))

  // 目标与行动
  if (u === '/goals' && m === 'get') {
    const status = p.status
    const goals = status && status !== 'all' && status !== '' ? demoGoals.filter((g) => g.status === status) : demoGoals
    return respond(config, ok(goals))
  }
  if (u.startsWith('/goals/') && m === 'get') return respond(config, ok(demoGoals[0]))
  if (u === '/goals' && m === 'post') return respond(config, ok(demoGoals[0]))
  if (u.startsWith('/goals/') && m === 'put') return respond(config, ok(demoGoals[0]))
  if (u.startsWith('/goals/') && m === 'delete') return respond(config, ok(null))
  if (u === '/goals/breakdown')
    return respond(config, ok({ actions: [{ content: '明确项目目标与范围' }, { content: '拆解关键里程碑' }, { content: '排定周计划' }, { content: '每日小步推进' }] }))
  if (/\/goals\/[^/]+\/actions$/.test(u) && m === 'post')
    return respond(config, ok({ action: demoGoals[0].actions?.[0], progress: demoGoals[0].progress }))
  if (/\/actions\/[^/]+\/toggle$/.test(u) || (/\/actions\/[^/]+$/.test(u) && (m === 'put' || m === 'delete')))
    return respond(config, ok({ progress: demoGoals[0].progress }))

  // 人生记录
  if (u === '/records' && m === 'get') return respond(config, ok(demoRecords))
  if (u === '/records/recent' && m === 'get') return respond(config, ok(demoRecords.slice(0, 5)))
  if (/^\/records\/[^/]+$/.test(u) && m === 'get') return respond(config, ok(demoRecords[0]))
  if (u === '/records/quick') {
    const content = (config.data ? (config.data as { content?: string }).content : '') || '新的记录'
    const record: LifeRecord = {
      id: 'demo-record-new',
      userId: 'demo-user-1',
      rawContent: content,
      title: null,
      type: 'daily',
      mood: 'calm',
      tags: ['随手记'],
      summary: null,
      goalId: null,
      recordedAt: new Date().toISOString(),
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    }
    const result: QuickRecordResult = { record, feedback: '已记下这一刻，今天也要继续照顾好自己 ✨' }
    return respond(config, ok(result))
  }
  if (/^\/records\/[^/]+$/.test(u) && m === 'delete') return respond(config, ok(null))

  // 人生大盘
  if (u === '/dashboard/overview') return respond(config, ok(demoOverview))
  if (u === '/dashboard/history') return respond(config, ok(demoHistory))

  // 成长分析
  if (u === '/growth/timeline') return respond(config, ok({ events: demoGrowthEvents }))
  if (u === '/growth/trends') return respond(config, ok(demoGrowthTrends))
  if (u === '/growth/summary') return respond(config, ok(demoGrowthSummary))

  // 社交
  if (u === '/friends' && m === 'get') return respond(config, ok(demoFriends))
  if (u === '/friends/pending') return respond(config, ok(demoPendingRequests))
  if (u === '/friends/request') return respond(config, ok(null))
  if (u === '/privacy') return respond(config, ok(demoPrivacy))
  if (u === '/visit/stats') return respond(config, ok(demoVisitStats))
  if (u === '/visit/record') return respond(config, ok(null))
  if (u === '/search/users') {
    const q = (p.q ?? '').toLowerCase()
    const found = demoFriends
      .map((f) => ({ id: f.user.id, nickname: f.user.nickname, avatarStyle: f.user.avatarStyle, lifeStage: f.user.lifeStage }))
      .filter((u) => u.nickname.includes(q) || q === '')
    return respond(config, ok(found.slice(0, 5)))
  }
  if (u === '/search/global') return respond(config, ok(demoGlobalSearch))

  // 资源中心
  if (u === '/resources' && m === 'get') {
    const type = p.type
    const items = type && type !== 'all' && type !== '' ? demoResources.filter((r) => r.type === type) : demoResources
    return respond(config, ok({ ...demoResourceList, items }))
  }
  if (u === '/resources/stats') return respond(config, ok(demoResourceStats))
  if (u === '/resources/recommended') return respond(config, ok(demoResources.slice(0, 4)))
  if (u === '/resources/categories') return respond(config, ok(demoResourceCategories))
  if (u === '/resources/tags') return respond(config, ok(demoResourceTags))
  if (u === '/resources/related') return respond(config, ok(demoResources.slice(0, 2)))
  if (/^\/resources\/[^/]+$/.test(u) && m === 'get') return respond(config, ok(demoResources[0]))
  if (u === '/resources' && m === 'post') return respond(config, ok(demoResources[0]))
  if (u === '/storage/usage') return respond(config, ok(demoStorage))

  // 设置
  if (u === '/settings' && m === 'get') return respond(config, ok(demoMergedSettings))
  if (u.startsWith('/settings/') && m === 'put') return respond(config, ok(demoMergedSettings.settings))
  if (u === '/settings/profile' && m === 'put') return respond(config, ok(demoMergedSettings.profile))
  if (u === '/settings/reset') return respond(config, ok(null))
  if (u === '/settings/export') return respond(config, ok({ demo: true }))

  // 人生测评
  if (u === '/assessment' && m === 'get') return respond(config, ok(demoAssessment))
  if (u === '/assessment/questions') return respond(config, ok([]))
  if (u === '/assessment/submit') return respond(config, ok(demoAssessment.assessment.resultSummary))

  // 分享（公开页）
  if (/^\/share\/resource\/[^/]+$/.test(u))
    return respond(config, ok({ ...demoResources[0], expiresAt: new Date(Date.now() + 7 * 86400_000).toISOString() }))

  return respond(config, notImplemented(m, u))
}
