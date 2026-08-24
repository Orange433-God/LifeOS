// ===== 与后端 API 对齐的类型定义 =====

export type AvatarStyle = 'realistic' | 'anime' | 'future' | 'fantasy' | 'minimal'

/** 统一 API 返回格式 */
export interface ApiResponse<T = unknown> {
  success: boolean
  data?: T
  message?: string
}

export interface AuthTokens {
  accessToken: string
  refreshToken: string
}

export interface UserProfile {
  id: string
  userId: string
  nickname: string
  avatarStyle: AvatarStyle
  avatarConfig: Record<string, unknown>
  preferenceTags: string[]
  lifeStage: string | null
  /** 六位数字用户 ID（100000 起顺序分配） */
  uid?: number | null
  /** 自定义头像图片路径（上传后覆盖 emoji 头像） */
  avatarUrl?: string | null
  createdAt: string
  updatedAt: string
}

export interface LifeAttribute {
  id: string
  userId: string
  explore: number
  learn: number
  execute: number
  create: number
  health: number
  connect: number
  stable: number
  updatedAt: string
}

export interface Room {
  id: string
  userId: string
  theme: string
  customConfig: Record<string, unknown>
  createdAt: string
  updatedAt: string
}

export interface Companion {
  id: string
  userId: string
  name: string
  personality: string
  appearance: Record<string, unknown>
  memory: unknown
  relationshipStage: string
  createdAt: string
  updatedAt: string
}

/** GET /api/profile 返回的资料四件套 + 实时生成的房间布局 */
export interface ProfileBundle {
  profile: UserProfile
  attributes: LifeAttribute
  room: Room
  companion: Companion
  roomLayout: RoomLayout
}

/** POST /api/profile 请求体 */
export interface CreateProfileInput {
  nickname: string
  avatarStyle: AvatarStyle
  preferenceTags: string[]
}

// ===== 人生测评（阶段 2）=====

export type DimensionKey =
  | 'explore'
  | 'learn'
  | 'execute'
  | 'create'
  | 'health'
  | 'connect'
  | 'stable'

export interface AssessmentOption {
  value: number
  label: string
}

export interface AssessmentQuestion {
  id: string
  dimension: DimensionKey
  question: string
  options: AssessmentOption[]
}

export interface StrengthChallengeItem {
  dimension: DimensionKey
  label: string
  description: string
  score: number
}

export interface ResultSummary {
  /** 阶段判断描述，如「你正处于成长期：探索力突出，健康力还有成长空间。」 */
  currentState: string
  strengths: StrengthChallengeItem[]
  challenges: StrengthChallengeItem[]
  growthDirection: string
}

export interface LifeAssessmentRecord {
  id: string
  userId: string
  assessmentData: Record<string, unknown>
  resultSummary: ResultSummary
  createdAt: string
}

/** GET /api/assessment 返回的测评 + 当前属性 */
export interface AssessmentBundle {
  assessment: LifeAssessmentRecord
  attributes: LifeAttribute
}

/** POST /api/assessment/submit 返回体 */
export interface AssessmentSubmitResult {
  attributes: Record<DimensionKey, number>
  summary: ResultSummary
}

// ===== 数字房间（阶段 3）=====

export interface RoomLayoutItem {
  id: string
  type: string
  label: string
  /** 百分比坐标 */
  x: number
  y: number
  icon: string
  action: string | null
  /** 丰富度 1-3 */
  richness: number
  extraIcon?: string
}

export interface RoomLayoutEnvironment {
  lighting: 'warm' | 'cool' | 'bright'
  windowView: 'city' | 'forest' | 'sea'
}

export interface RoomLayout {
  theme: string
  items: RoomLayoutItem[]
  environment: RoomLayoutEnvironment
}

// ===== 人生记录（阶段 5）=====

export type RecordType = 'daily' | 'event' | 'idea' | 'milestone'
export type RecordMood = 'happy' | 'sad' | 'calm' | 'excited' | 'tired' | 'neutral'

export interface LifeRecord {
  id: string
  userId: string
  rawContent: string
  title: string | null
  type: RecordType
  mood: RecordMood | null
  tags: string[]
  summary: string | null
  goalId: string | null
  recordedAt: string
  createdAt: string
  updatedAt: string
}

export interface QuickRecordResult {
  record: LifeRecord
  feedback: string
}

// ===== 人生大盘（阶段 6）=====

export interface AttributeSet {
  explore: number
  learn: number
  execute: number
  create: number
  health: number
  connect: number
  stable: number
}

export interface StageSummary {
  stage: string
  description: string
  suggestion: string
  /** AI 人生观察四栏（后端实时生成，旧响应可能缺失） */
  findings?: string
  risks?: string
  advice?: string
  nextStep?: string
}

export interface DashboardGoal {
  id: string
  title: string
  progress: number
  targetDate: string | null
  status: string
}

// ===== 目标与行动（阶段 7）=====

/** overdue 为后端读时派生的系统判定状态（超期未完成），不落库 */
export type GoalStatus = 'active' | 'paused' | 'completed' | 'abandoned' | 'overdue'
export type GoalCategory = 'study' | 'health' | 'career' | 'create' | 'life' | 'other'
export type GoalPriority = 'high' | 'mid' | 'low'

export interface GoalAction {
  id: string
  goalId: string
  content: string
  isCompleted: boolean
  dueDate: string | null
  completedAt: string | null
  order: number
  createdAt: string
  updatedAt: string
}

export interface Goal {
  id: string
  userId: string
  title: string
  description: string | null
  category: GoalCategory
  priority: GoalPriority
  status: GoalStatus
  progress: number
  targetDate: string | null
  /** 完成时间（区分未超期完成/超期完成） */
  completedAt?: string | null
  targetAttributes: string[]
  createdAt: string
  updatedAt: string
  actions?: GoalAction[]
  _count?: { actions: number }
}

export interface CreateGoalInput {
  title: string
  description?: string
  category: GoalCategory
  priority: GoalPriority
  targetDate?: string
  targetAttributes?: string[]
}

export interface BreakdownResult {
  actions: Array<{ content: string }>
}

export interface ActionMutationResult {
  action?: GoalAction
  progress: number
}

// ===== 成长分析（阶段 8）=====

export type GrowthPeriod = 'month' | 'quarter' | 'year'

export type GrowthEventType = 'milestone' | 'goal_completed' | 'assessment' | 'record'

export interface GrowthEvent {
  id: string
  type: GrowthEventType
  title: string
  description: string
  date: string
  icon?: string
  source: string
  goalId?: string
}

export interface GrowthTrends {
  labels: string[]
  /** 实际有快照数据的月份数（<3 时前端提示数据积累中，但仍展示基线） */
  dataPoints?: number
  explore: number[]
  learn: number[]
  execute: number[]
  create: number[]
  health: number[]
  connect: number[]
  stable: number[]
}

export interface GrowthSummary {
  title: string
  content: string
  advice: string
}

// ===== 社交与好友（阶段 9）=====

export interface FriendUser {
  id: string
  nickname: string
  avatarStyle: AvatarStyle
  lifeStage?: string | null
  online: boolean
}

export interface FriendItem {
  friendshipId: string
  user: FriendUser
  since: string
}

export interface PendingRequestItem {
  requestId: string
  user: FriendUser
  createdAt: string
}

export interface PrivacySettings {
  id?: string
  userId?: string
  roomAccess: 'private' | 'friends_only' | 'public'
  profileVisibility: 'friends_only' | 'public'
  allowRoomVisit: boolean
  showOnlineStatus: boolean
  allowSearch: boolean
  createdAt?: string
  updatedAt?: string
}

export interface VisitRoomData {
  owner: { id: string; nickname: string; avatarStyle: AvatarStyle }
  room: { theme: string }
  companion: { name: string; personality: string; relationshipStage: string }
  roomLayout: RoomLayout
}

export interface SearchUser {
  id: string
  nickname: string
  avatarStyle: AvatarStyle
  lifeStage: string | null
}

export interface VisitStatItem {
  userId: string
  nickname: string
  avatarStyle: AvatarStyle
  count: number
}

export interface VisitStats {
  thisWeek: VisitStatItem[]
  thisMonth: VisitStatItem[]
}

// ===== 设置中心（阶段 10）=====

export interface UserSettingsData {
  id?: string
  userId?: string
  aiMessageNotify: boolean
  goalProgressNotify: boolean
  growthAchieveNotify: boolean
  systemUpdateNotify: boolean
  activityRecommend: boolean
  quietStart: string | null
  quietEnd: string | null
  themeMode: 'light' | 'dark' | 'system'
  themeColor: 'purple' | 'blue' | 'green' | 'pink'
  density: 'compact' | 'medium' | 'relaxed'
  language: string
  timeFormat: string
  dateFormat: string
  weekStart: string
  startPage: string
}

export interface ProfileSettingsView {
  userId: string
  email: string
  nickname: string
  avatarStyle: AvatarStyle
  /** 六位数字用户 ID */
  uid?: number | null
  /** 自定义头像图片路径 */
  avatarUrl?: string | null
  birthdate: string | null
  gender: string | null
  bio: string | null
}

export interface MergedSettings {
  settings: UserSettingsData
  profile: ProfileSettingsView
  privacy: PrivacySettings
}

// ===== 资源中心（阶段 11）=====

export type ResourceType = 'learning' | 'template' | 'tool' | 'material' | 'book' | 'link'

export interface ResourceItem {
  id: string
  userId: string
  name: string
  description: string | null
  type: ResourceType
  category: string
  fileUrl: string | null
  fileSize: number | null
  fileType: string | null
  coverUrl: string | null
  isPublic: boolean
  downloadCount: number
  viewCount: number
  tags: string[]
  uploadedAt: string
  updatedAt: string
  uploaderName?: string
  collected?: boolean
}

export interface ResourceListResult {
  items: ResourceItem[]
  total: number
  page: number
  limit: number
}

export interface ResourceStats {
  myResources: number
  recentDownloads: number
  myCollections: number
  resourceLinks: number
}

export interface ResourceCategoryCount {
  type: ResourceType
  label: string
  count: number
}

export interface StorageUsage {
  used: number
  total: number
  usedPercent: number
}

export interface ResourceShare {
  shareUrl: string
  expiresAt: string
}

export interface SharedResourceView {
  id: string
  name: string
  description: string | null
  type: ResourceType
  category: string
  fileUrl: string | null
  fileSize: number | null
  fileType: string | null
  tags: string[]
  downloadCount: number
  viewCount: number
  uploaderName: string
  expiresAt: string
}

export interface TagCount {
  tag: string
  count: number
}

export interface GlobalSearchResult {
  resources: Array<{ id: string; name: string; type: ResourceType; category: string }>
  records: Array<{ id: string; title: string | null; type: RecordType; recordedAt: string }>
  goals: Array<{ id: string; title: string; progress: number; status: string }>
}

export interface DashboardRecordItem {
  id: string
  title: string | null
  type: RecordType
  mood: RecordMood | null
  tags: string[]
  recordedAt: string
}

export interface DashboardOverview {
  currentAttributes: AttributeSet
  initialAttributes: AttributeSet
  changes: AttributeSet
  recentRecords: DashboardRecordItem[]
  activeGoals: DashboardGoal[]
  summary: StageSummary
}

export interface DashboardHistory {
  dates: string[]
  explore: number[]
  learn: number[]
  execute: number[]
  create: number[]
  health: number[]
  connect: number[]
  stable: number[]
}
