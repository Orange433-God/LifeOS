// ===== 演示模式示例数据（GitHub Pages 静态站用，仅浏览展示，不落库） =====
import type {
  AssessmentBundle,
  DashboardHistory,
  DashboardOverview,
  FriendItem,
  GlobalSearchResult,
  Goal,
  GrowthEvent,
  GrowthSummary,
  GrowthTrends,
  LifeRecord,
  MergedSettings,
  PendingRequestItem,
  PrivacySettings,
  ProfileBundle,
  ResourceCategoryCount,
  ResourceItem,
  ResourceListResult,
  ResourceStats,
  StorageUsage,
  TagCount,
  VisitStats,
} from './types'

// ---- 日期工具（本地时区，与页面 TODAY/周工具保持一致） ----
const now = new Date()
const pad = (n: number) => String(n).padStart(2, '0')
const localISO = (d: Date) =>
  `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}:00`
const daysAgo = (n: number, h = 9, m = 20) => {
  const d = new Date(now)
  d.setDate(d.getDate() - n)
  d.setHours(h, m, 0, 0)
  return localISO(d)
}
const todayAt = (h: number, m = 0) => {
  const d = new Date(now)
  d.setHours(h, m, 0, 0)
  return localISO(d)
}
const inDays = (n: number) => {
  const d = new Date(now)
  d.setDate(d.getDate() + n)
  d.setHours(23, 0, 0, 0)
  return localISO(d)
}
/** 本地 YYYY-MM-DD（today 前缀匹配用） */
export const DEMO_TODAY = `${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(now.getDate())}`

const monthsAgoISO = (n: number) => {
  const d = new Date(now)
  d.setMonth(d.getMonth() - n)
  return localISO(d)
}

// ================= 资料四件套 =================

export const demoProfile: ProfileBundle['profile'] = {
  id: 'demo-profile-1',
  userId: 'demo-user-1',
  nickname: '林然',
  avatarStyle: 'anime',
  avatarConfig: {},
  preferenceTags: ['成长', '探索', '创造'],
  lifeStage: '探索者',
  uid: 100001,
  avatarUrl: null,
  createdAt: monthsAgoISO(3),
  updatedAt: daysAgo(1),
}

export const demoAttributes = {
  id: 'demo-attr-1',
  userId: 'demo-user-1',
  explore: 82,
  learn: 78,
  execute: 65,
  create: 74,
  health: 58,
  connect: 62,
  stable: 55,
  updatedAt: daysAgo(0, 8),
}

export const demoRoomLayout = {
  theme: 'modern',
  environment: { lighting: 'warm', windowView: 'city' } as const,
  items: [
    { id: 'd1', type: 'desk', label: '书桌', x: 50, y: 32, icon: '🖥️', action: 'records', richness: 3 },
    { id: 'd2', type: 'bookshelf', label: '书架', x: 48, y: 18, icon: '📚', action: 'resources', richness: 2 },
    { id: 'd3', type: 'creative', label: '画架', x: 13, y: 56, icon: '🎨', action: 'create', richness: 1 },
    { id: 'd4', type: 'explore', label: '旅行地图', x: 62, y: 18, icon: '🧭', action: 'explore', richness: 2 },
    { id: 'd5', type: 'health', label: '绿植', x: 72, y: 42, icon: '🪴', action: 'health', richness: 1 },
    { id: 'd6', type: 'memory', label: '照片墙', x: 20, y:18, icon: '📷', action: 'records', richness: 2 },
    { id: 'd7', type: 'stable', label: '舒适座椅', x: 62, y: 75, icon: '🛋️', action: 'relax', richness: 1 },
    { id: 'd8', type: 'execute', label: '计划本', x: 50, y: 41, icon: '📝', action: 'goals', richness: 2 },
  ],
}

export const demoBundle: ProfileBundle = {
  profile: demoProfile,
  attributes: demoAttributes,
  room: {
    id: 'demo-room-1',
    userId: 'demo-user-1',
    theme: 'modern',
    customConfig: { hasEntered: true },
    createdAt: monthsAgoISO(3),
    updatedAt: daysAgo(2),
  },
  companion: {
    id: 'demo-companion-1',
    userId: 'demo-user-1',
    name: '小伴',
    personality: '温暖',
    appearance: {},
    memory: null,
    relationshipStage: '信任',
    createdAt: monthsAgoISO(3),
    updatedAt: daysAgo(0, 8),
  },
  roomLayout: demoRoomLayout,
}

// ================= 人生记录 =================

let rid = 0
const rec = (
  rawContent: string,
  opts: Partial<Pick<LifeRecord, 'type' | 'mood' | 'tags' | 'summary' | 'title'>> & { at: string },
): LifeRecord => ({
  id: `demo-record-${++rid}`,
  userId: 'demo-user-1',
  rawContent,
  title: opts.title ?? null,
  type: opts.type ?? 'daily',
  mood: opts.mood ?? null,
  tags: opts.tags ?? [],
  summary: opts.summary ?? null,
  goalId: null,
  recordedAt: opts.at,
  createdAt: opts.at,
  updatedAt: opts.at,
})

export const demoRecords: LifeRecord[] = [
  rec('晨跑 5 公里打卡，配速比上周快了 20 秒，感觉状态在回来', { type: 'daily', mood: 'excited', tags: ['健康', '运动'], at: todayAt(7, 12), summary: '晨跑状态回升，配速提升，坚持带来的变化正在显现。' }),
  rec('产品设计答辩顺利结束！评委说方案「完整且有温度」', { type: 'milestone', mood: 'happy', tags: ['学习', '里程碑'], title: '答辩通过', at: daysAgo(1, 16, 30), summary: '毕业设计答辩完成，三个月的努力有了结果。' }),
  rec('读到诺曼《设计心理学》的「示能性」章节，很有启发', { type: 'idea', mood: 'calm', tags: ['学习', '灵感'], at: daysAgo(2, 21, 5), summary: '示能性：设计物应该让用户一看就知道怎么用。' }),
  rec('和室友夜聊到凌晨，聊了毕业去向和人生规划，有些迷茫但也充满期待', { type: 'daily', mood: 'neutral', tags: ['关系', '思考'], at: daysAgo(3, 23, 40) }),
  rec('完成用户访谈 3 场，收集到很多意想不到的真实痛点', { type: 'event', mood: 'calm', tags: ['工作', '学习'], at: daysAgo(5, 15, 0) }),
  rec('情绪有点低落，用了 20 分钟写复盘，慢慢理清了原因', { type: 'daily', mood: 'sad', tags: ['情绪', '复盘'], at: daysAgo(7, 22, 15), summary: '低谷期的复盘：压力来源是任务堆积，不是能力问题。' }),
  rec('周末去了城市美术馆，新展「数字未来」很棒', { type: 'event', mood: 'happy', tags: ['探索', '生活'], at: daysAgo(9, 14, 30) }),
  rec('把作品集网站的第一版框架搭起来了', { type: 'milestone', mood: 'excited', tags: ['创造', '里程碑'], title: '作品集 v1', at: daysAgo(12, 20, 0) }),
  rec('开始学习动效设计，AE 入门比想象中难', { type: 'daily', mood: 'tired', tags: ['学习'], at: daysAgo(14, 22, 45) }),
  rec('给妈妈打了电话，她一切都好', { type: 'daily', mood: 'calm', tags: ['关系'], at: daysAgo(16, 20, 30) }),
  rec('第一次完成 10 公里长跑，坚持了半年的晨跑有了里程碑', { type: 'milestone', mood: 'excited', tags: ['健康', '里程碑'], title: '首个 10km', at: daysAgo(20, 8, 0) }),
  rec('整理了读书笔记，把设计相关的书单系统化', { type: 'idea', mood: 'calm', tags: ['学习', '整理'], at: daysAgo(23, 21, 0) }),
]

// ================= 目标与行动 =================

const act = (goalId: string, n: number, content: string, done: boolean, due: string): Goal['actions'] extends (infer A)[] ? A : never =>
  ({
    id: `demo-action-${goalId.slice(-4)}-${n}`,
    goalId,
    content,
    isCompleted: done,
    dueDate: due,
    completedAt: done ? due : null,
    order: n,
    createdAt: daysAgo(10),
    updatedAt: daysAgo(2),
  }) as Goal['actions'] extends (infer A)[] ? A : never

const g1 = 'demo-goal-1'
const g2 = 'demo-goal-2'
const g3 = 'demo-goal-3'
const g4 = 'demo-goal-4'

export const demoGoals: Goal[] = [
  {
    id: g1,
    userId: 'demo-user-1',
    title: '产品设计课程毕业设计',
    description: '为一款面向年轻人的时间管理 App 完成从调研到高保真的完整设计流程',
    category: 'study',
    priority: 'high',
    status: 'active',
    progress: 66,
    targetDate: inDays(14),
    completedAt: null,
    targetAttributes: ['create', 'execute'],
    createdAt: daysAgo(40),
    updatedAt: daysAgo(1),
    _count: { actions: 6 },
    actions: [
      act(g1, 1, '竞品分析报告', true, daysAgo(30, 18)),
      act(g1, 2, '用户访谈 3 场', true, daysAgo(6, 16)),
      act(g1, 3, '信息架构梳理', true, daysAgo(3, 17)),
      act(g1, 4, '低保真原型', true, daysAgo(2, 17)),
      act(g1, 5, '高保真视觉稿', false, todayAt(20, 0)),
      act(g1, 6, '可用性测试与迭代', false, inDays(6)),
    ],
  },
  {
    id: g2,
    userId: 'demo-user-1',
    title: '每日晨跑 5 公里',
    description: '恢复规律晨跑，提升配速与心肺能力',
    category: 'health',
    priority: 'mid',
    status: 'active',
    progress: 60,
    targetDate: inDays(3),
    completedAt: null,
    targetAttributes: ['health', 'stable'],
    createdAt: daysAgo(25),
    updatedAt: daysAgo(0, 7),
    _count: { actions: 5 },
    actions: [
      act(g2, 1, '周一晨跑', true, daysAgo(4, 7)),
      act(g2, 2, '周二晨跑', true, daysAgo(3, 7)),
      act(g2, 3, '周三晨跑', true, daysAgo(2, 7)),
      act(g2, 4, '周四晨跑', false, todayAt(7, 0)),
      act(g2, 5, '周五晨跑', false, inDays(1)),
    ],
  },
  {
    id: g3,
    userId: 'demo-user-1',
    title: '读完《设计心理学》',
    description: '诺曼经典，每周精读两章并做读书笔记',
    category: 'study',
    priority: 'mid',
    status: 'completed',
    progress: 100,
    targetDate: daysAgo(2, 20),
    completedAt: daysAgo(1, 21),
    targetAttributes: ['learn'],
    createdAt: daysAgo(60),
    updatedAt: daysAgo(1, 21),
    _count: { actions: 4 },
    actions: [
      act(g3, 1, '第一章 日用品心理学', true, daysAgo(55, 21)),
      act(g3, 2, '第二章 日常行为的心理学', true, daysAgo(40, 21)),
      act(g3, 3, '第三章 头脑中的知识与外界知识', true, daysAgo(20, 21)),
      act(g3, 4, '第四章 知晓：约束与示能', true, daysAgo(2, 21)),
    ],
  },
  {
    id: g4,
    userId: 'demo-user-1',
    title: '搭建个人作品集网站',
    description: '用新学的动效能力做一个有记忆点的个人主页',
    category: 'career',
    priority: 'low',
    status: 'paused',
    progress: 20,
    targetDate: inDays(30),
    completedAt: null,
    targetAttributes: ['create'],
    createdAt: daysAgo(15),
    updatedAt: daysAgo(4),
    _count: { actions: 3 },
    actions: [
      act(g4, 1, '确定网站结构与风格', true, daysAgo(14, 20)),
      act(g4, 2, '首屏视觉稿', false, inDays(3)),
      act(g4, 3, '动效开发', false, inDays(10)),
    ],
  },
]

// ================= 人生大盘 =================

export const demoOverview: DashboardOverview = {
  currentAttributes: { ...demoAttributes },
  initialAttributes: { explore: 55, learn: 52, execute: 50, create: 50, health: 48, connect: 50, stable: 50 },
  changes: { explore: 27, learn: 26, execute: 15, create: 24, health: 10, connect: 12, stable: 5 },
  recentRecords: demoRecords.slice(0, 4).map((r) => ({
    id: r.id,
    title: r.title,
    type: r.type,
    mood: r.mood,
    tags: r.tags,
    recordedAt: r.recordedAt,
  })),
  activeGoals: demoGoals
    .filter((g) => g.status === 'active')
    .map((g) => ({ id: g.id, title: g.title, progress: g.progress, targetDate: g.targetDate, status: g.status })),
  summary: {
    stage: '探索者 · 成长期',
    description: '过去一个月，你的探索力与创造力显著提升，从“想”到“做”的行动闭环正在形成。',
    suggestion: '保持记录与复盘的节奏，让每一次小步前进都可见。',
    findings: '探索力 +27：最近一个月你主动接触新场景的频率明显变高，输入与输出的通道已经打开。',
    risks: '稳定力 +5：作息与节奏的规律性偏弱，深夜记录的比例偏高，需要给恢复留出固定时间。',
    advice: '把「晚上 11 点后不安排输出型任务」写入计划，用晨间时段承接最重要的一件事。',
    nextStep: '本周安排 1 天完全放松的时间，把注意力从目标清单上挪开一次。',
  },
}

const histDates = Array.from({ length: 30 }, (_, i) => daysAgo(29 - i, 9).slice(0, 10))
const line = (base: number, end: number, wobble: number) =>
  histDates.map((_, i) => Math.round(base + ((end - base) * i) / 29 + Math.sin(i * 1.7) * wobble))

export const demoHistory: DashboardHistory = {
  dates: histDates,
  explore: line(55, 82, 2),
  learn: line(52, 78, 2),
  execute: line(50, 65, 1.5),
  create: line(50, 74, 2),
  health: line(48, 58, 1.5),
  connect: line(50, 62, 1),
  stable: line(50, 55, 1),
}

// ================= 成长分析 =================

export const demoGrowthEvents: GrowthEvent[] = [
  { id: 'ge1', type: 'milestone', title: '毕业设计答辩通过', description: '「完整且有温度」——三个月设计流程正式收尾', date: daysAgo(1, 16).slice(0, 10), source: 'record', icon: '🎓' },
  { id: 'ge2', type: 'goal_completed', title: '读完《设计心理学》', description: '四章精读完成，形成 12 条读书笔记', date: daysAgo(1, 21).slice(0, 10), source: 'goal', goalId: g3, icon: '📖' },
  { id: 'ge3', type: 'milestone', title: '首个 10km 长跑', description: '半年晨跑的里程碑，配速 6\'20"', date: daysAgo(20, 8).slice(0, 10), source: 'record', icon: '🏃' },
  { id: 'ge4', type: 'milestone', title: '作品集网站 v1 上线', description: '第一版框架搭建完成', date: daysAgo(12, 20).slice(0, 10), source: 'record', icon: '🚀' },
  { id: 'ge5', type: 'record', title: '读到「示能性」章节', description: '诺曼的设计心理学第四章启发', date: daysAgo(2, 21).slice(0, 10), source: 'record', icon: '💡' },
  { id: 'ge6', type: 'record', title: '用户访谈 3 场', description: '收集到 15 条真实痛点', date: daysAgo(5, 15).slice(0, 10), source: 'record', icon: '🎙️' },
  { id: 'ge7', type: 'assessment', title: '完成人生测评', description: '探索者 · 成长期——优势：探索力/创造力', date: daysAgo(75, 10).slice(0, 10), source: 'assessment', icon: '🧭' },
  { id: 'ge8', type: 'record', title: '情绪低谷复盘', description: '找到压力来源：任务堆积而非能力问题', date: daysAgo(7, 22).slice(0, 10), source: 'record', icon: '🌙' },
]

const trendLabels = Array.from({ length: 6 }, (_, i) => {
  const d = new Date(now)
  d.setMonth(d.getMonth() - (5 - i))
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}`
})
const trendLine = (start: number, end: number, wob = 1.5) =>
  trendLabels.map((_, i) => Math.round(start + ((end - start) * i) / 5 + Math.sin(i * 2.1) * wob))

export const demoGrowthTrends: GrowthTrends = {
  labels: trendLabels,
  dataPoints: 6,
  explore: trendLine(58, 82),
  learn: trendLine(55, 78),
  execute: trendLine(50, 65, 1),
  create: trendLine(52, 74),
  health: trendLine(48, 58, 1),
  connect: trendLine(50, 62, 0.8),
  stable: trendLine(50, 55, 0.8),
}

export const demoGrowthSummary: GrowthSummary = {
  title: '创造型学习者',
  content: '你是一个以创造为驱动力的学习者：三个月里，探索力与创造力分别提升 27 和 24 分，完成了一项里程碑式的设计项目，并把阅读、跑步变成了稳定的生活节律。你的成长模式是「先向外探索、再向内沉淀」。',
  advice: '下一阶段建议在「稳定」上补课：固定作息、设置恢复日，让高速成长可持续。',
}

// ================= 社交 =================

const friend = (id: string, nickname: string, avatarStyle: FriendItem['user']['avatarStyle'], online: boolean, lifeStage: string | null, days: number): FriendItem => ({
  friendshipId: `fs-${id}`,
  user: { id, nickname, avatarStyle, lifeStage, online },
  since: daysAgo(days, 12).slice(0, 10),
})

export const demoFriends: FriendItem[] = [
  friend('fu1', '苏晓琪', 'anime', true, '探索者', 90),
  friend('fu2', '陈默', 'realistic', true, '成长期', 60),
  friend('fu3', '王一帆', 'future', false, '起步期', 45),
  friend('fu4', '李思思', 'minimal', true, '探索者', 30),
  friend('fu5', '赵子墨', 'fantasy', true, '成长期', 12),
]

export const demoPendingRequests: PendingRequestItem[] = [
  { requestId: 'pr1', user: { id: 'fu6', nickname: '周雨桐', avatarStyle: 'anime', lifeStage: '探索者', online: true }, createdAt: daysAgo(2, 14) },
  { requestId: 'pr2', user: { id: 'fu7', nickname: '吴青', avatarStyle: 'minimal', lifeStage: null, online: false }, createdAt: daysAgo(5, 20) },
]

export const demoVisitStats: VisitStats = {
  thisWeek: [
    { userId: 'fu1', nickname: '苏晓琪', avatarStyle: 'anime', count: 6 },
    { userId: 'fu4', nickname: '李思思', avatarStyle: 'minimal', count: 4 },
    { userId: 'demo-user-1', nickname: '林然', avatarStyle: 'anime', count: 3 },
    { userId: 'fu5', nickname: '赵子墨', avatarStyle: 'fantasy', count: 2 },
    { userId: 'fu2', nickname: '陈默', avatarStyle: 'realistic', count: 1 },
  ],
  thisMonth: [
    { userId: 'fu1', nickname: '苏晓琪', avatarStyle: 'anime', count: 18 },
    { userId: 'fu2', nickname: '陈默', avatarStyle: 'realistic', count: 12 },
    { userId: 'fu4', nickname: '李思思', avatarStyle: 'minimal', count: 9 },
    { userId: 'demo-user-1', nickname: '林然', avatarStyle: 'anime', count: 7 },
    { userId: 'fu5', nickname: '赵子墨', avatarStyle: 'fantasy', count: 5 },
  ],
}

export const demoPrivacy: PrivacySettings = {
  roomAccess: 'friends_only',
  profileVisibility: 'public',
  allowRoomVisit: true,
  showOnlineStatus: true,
  allowSearch: true,
}

// ================= 资源中心 =================

let resId = 0
const res = (
  name: string,
  type: ResourceItem['type'],
  category: string,
  tags: string[],
  fileSize: number | null,
  opts: Partial<Pick<ResourceItem, 'description' | 'fileType' | 'downloadCount' | 'viewCount' | 'uploadedAt'>> = {},
): ResourceItem => ({
  id: `demo-res-${++resId}`,
  userId: 'demo-user-1',
  name,
  description: opts.description ?? null,
  type,
  category,
  fileUrl: fileSize ? 'https://example.com/demo-file' : null,
  fileSize,
  fileType: opts.fileType ?? null,
  coverUrl: null,
  isPublic: true,
  downloadCount: opts.downloadCount ?? 0,
  viewCount: opts.viewCount ?? 0,
  tags,
  uploadedAt: opts.uploadedAt ?? daysAgo(resId * 2 + 1, 11),
  updatedAt: daysAgo(resId, 11),
  uploaderName: '林然',
})

export const demoResources: ResourceItem[] = [
  res('毕业设计答辩 PPT 模板', 'template', '设计', ['模板', '答辩'], 8_400_000, { fileType: 'pptx', description: '简洁大气的学术答辩模板，含目录/过渡/结尾动画', downloadCount: 32, viewCount: 156 }),
  res('《设计心理学》读书笔记', 'learning', '学习资料', ['笔记', '设计', '心理学'], 620_000, { fileType: 'pdf', description: '四章精读笔记，附 12 条可执行清单', downloadCount: 58, viewCount: 240 }),
  res('Figma 效率插件合集', 'tool', '工具软件', ['工具', '效率'], 12_000_000, { fileType: 'zip', description: '9 款常用插件打包，含自动标注与图标库', downloadCount: 105, viewCount: 431 }),
  res('灵感素材：玻璃拟态图标包', 'material', '素材资源', ['素材', '图标'], 45_000_000, { fileType: 'zip', description: '120 枚玻璃拟态风格图标，含源文件', downloadCount: 89, viewCount: 366 }),
  res('推荐书单：2026 设计必读 10 本', 'book', '书籍推荐', ['书单', '设计'], null, { description: '从经典到前沿，附每本书的阅读建议顺序', downloadCount: 41, viewCount: 187 }),
  res('时间管理 App 竞品分析报告', 'learning', '学习资料', ['报告', '竞品'], 3_200_000, { fileType: 'pdf', description: '毕业设计调研产物，覆盖 6 款主流产品', downloadCount: 24, viewCount: 98 }),
]

export const demoResourceList: ResourceListResult = { items: demoResources, total: demoResources.length, page: 1, limit: 50 }
export const demoResourceStats: ResourceStats = { myResources: demoResources.length, recentDownloads: 12, myCollections: 3, resourceLinks: 1 }
export const demoResourceCategories: ResourceCategoryCount[] = [
  { type: 'learning', label: '学习资料', count: 2 },
  { type: 'template', label: '模板库', count: 1 },
  { type: 'tool', label: '工具软件', count: 1 },
  { type: 'material', label: '素材资源', count: 1 },
  { type: 'book', label: '书籍推荐', count: 1 },
]
export const demoResourceTags: TagCount[] = [
  { tag: '设计', count: 5 },
  { tag: '效率', count: 3 },
  { tag: '素材', count: 2 },
  { tag: '模板', count: 2 },
  { tag: '笔记', count: 2 },
  { tag: '书单', count: 1 },
]
export const demoStorage: StorageUsage = { used: 2_300_000_000, total: 10_000_000_000, usedPercent: 23 }

// ================= 设置 =================

export const demoMergedSettings: MergedSettings = {
  settings: {
    aiMessageNotify: true,
    goalProgressNotify: true,
    growthAchieveNotify: true,
    systemUpdateNotify: false,
    activityRecommend: true,
    quietStart: '23:00',
    quietEnd: '07:30',
    themeMode: 'light',
    themeColor: 'purple',
    density: 'medium',
    language: 'zh-CN',
    timeFormat: '24h',
    dateFormat: 'YYYY-MM-DD',
    weekStart: 'monday',
    startPage: 'home',
  },
  profile: {
    userId: 'demo-user-1',
    email: 'demo@lifeos.app',
    nickname: '林然',
    avatarStyle: 'anime',
    uid: 100001,
    avatarUrl: null,
    birthdate: '2004-05-20',
    gender: 'secret',
    bio: '愿此身，行至山海。',
  },
  privacy: demoPrivacy,
}

// ================= 人生测评（已测评） =================

export const demoAssessment: AssessmentBundle = {
  assessment: {
    id: 'demo-assessment-1',
    userId: 'demo-user-1',
    assessmentData: {},
    resultSummary: {
      currentState: '你正处于成长期：探索力突出，稳定力还有成长空间。',
      strengths: [
        { dimension: 'explore', label: '探索力', description: '对新事物保持好奇，敢于走出舒适区', score: 82 },
        { dimension: 'create', label: '创造力', description: '能把想法变成看得见的作品', score: 74 },
      ],
      challenges: [
        { dimension: 'stable', label: '稳定力', description: '作息与节奏的规律性有待加强', score: 55 },
        { dimension: 'health', label: '健康力', description: '运动习惯在建立，但恢复不足', score: 58 },
      ],
      growthDirection: '在保持探索节奏的同时，为生活建立稳定的锚点：固定作息、规律运动、定期复盘。',
    },
    createdAt: daysAgo(75, 10),
  },
  attributes: demoAttributes,
}

// ================= 全局搜索 =================

export const demoGlobalSearch: GlobalSearchResult = {
  resources: demoResources.slice(0, 3).map((r) => ({ id: r.id, name: r.name, type: r.type, category: r.category })),
  records: demoRecords.slice(0, 3).map((r) => ({ id: r.id, title: r.title, type: r.type, recordedAt: r.recordedAt })),
  goals: demoGoals.slice(0, 2).map((g) => ({ id: g.id, title: g.title, progress: g.progress, status: g.status })),
}

// ================= 演示版 AI 伙伴回复 =================

export const demoChatReply = (
  message: string,
): { reply: string; suggestedAction: string } => {
  const t = message.trim()
  if (/累|疲惫|辛苦/.test(t))
    return {
      reply: '听出来了，林然。累的时候还愿意说出来，这本身就是一种对自己的照顾。今天的你已经做得够多了——把「必须做」的事放到一边，给自己 20 分钟，喝点温水、看看窗外，或者干脆发会儿呆。恢复不是偷懒，是在给接下来的自己充电。',
      suggestedAction: '试试 4-7-8 呼吸：吸气 4 秒，屏息 7 秒，呼气 8 秒，做三轮',
    }
  if (/目标|计划|拆解/.test(t))
    return {
      reply: '我们来看看你手头的目标：毕业设计已经走完大半，剩下高保真和可用性测试是最出彩的部分；晨跑刚恢复就突破了配速。现在最值得投入的，是把「稳定」补起来——比如给每天固定一个收尾时间。你想先聊哪个目标？',
      suggestedAction: '给今晚定一个 22:30 的收尾提醒',
    }
  if (/情绪|难过|低落|心情/.test(t))
    return {
      reply: '我在的。情绪低落的时刻，不需要急着「变好」。我注意到你上周的复盘里写过一句话：压力来自任务堆积，而不是能力问题——这句话值得再说一遍给你听。先照顾好眼前这件小事，剩下的我们慢慢聊。',
      suggestedAction: '把此刻最压着你的一件事写下来，只写一件事',
    }
  if (/鼓励|加油|没信心/.test(t))
    return {
      reply: '当然要给你鼓励：三个月前你给 LifeOS 写下的第一句话是「愿此身，行至山海」，现在你的探索力涨了 27 分，答辩通过了，10 公里跑完了。你看，行至山海的路上，你一直没有停。接下来也这样，一步一步就好。',
      suggestedAction: '打开成长分析页，看看这三个月的轨迹',
    }
  if (/灵感|创意|想法/.test(t))
    return {
      reply: '灵感最喜欢光顾那些正在行动的人。你最近的「示能性」笔记和美术馆的新展，其实都指向同一个方向：让设计自己会说话。下次遇到灵光一现，先别评判好坏，用一句话记下来，晚上再回来看它。',
      suggestedAction: '现在就记一条灵感，标签选「灵感」',
    }
  if (/复盘|总结|收获/.test(t))
    return {
      reply: '好，陪你复盘。这三天的关键词是「收尾」：答辩通过是最大的里程碑，晨跑配速回升说明状态在回来，读书笔记也沉淀成了体系。值得调整的一点：深夜记录的比例偏高，试着把复盘挪到晚饭后。',
      suggestedAction: '把「晚饭后复盘 10 分钟」写进今天的计划',
    }
  return {
    reply: `我在的，林然。${'你愿意和我聊，真好。无论是今天的收获、纠结的选择，还是此刻的天气，都可以说说看。我记性还不错，会一直记得你说过的话。'}`,
    suggestedAction: '说说今天最值得记住的一个瞬间',
  }
}
