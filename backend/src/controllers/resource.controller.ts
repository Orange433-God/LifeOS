import crypto from 'node:crypto'
import fs from 'node:fs'
import path from 'node:path'
import type { Request, Response } from 'express'
import { prisma } from '../lib/prisma.js'
import { ok, fail } from '../lib/response.js'
import { env } from '../config/env.js'

export const UPLOADS_DIR = path.resolve(process.cwd(), 'uploads')

/** 把 /api/uploads/... 的 fileUrl 映射回磁盘路径 */
const diskPathOf = (fileUrl: string): string | null => {
  const prefix = '/api/uploads/'
  if (!fileUrl.startsWith(prefix)) return null
  return path.join(UPLOADS_DIR, fileUrl.slice(prefix.length))
}

/** 上传者昵称表 */
const nicknameMap = async (userIds: string[]) => {
  if (userIds.length === 0) return new Map<string, string>()
  const profiles = await prisma.userProfile.findMany({
    where: { userId: { in: userIds } },
    select: { userId: true, nickname: true },
  })
  return new Map(profiles.map((p) => [p.userId, p.nickname]))
}

/** GET /api/resources — 列表（类型/分类/关键词筛选 + 排序 + 分页） */
export const listResources = async (req: Request, res: Response) => {
  const userId = req.userId!
  const { type, category, keyword, sort, collected } = req.query as Record<string, string | undefined>
  const page = Math.max(Number(req.query.page ?? 1), 1)
  const limit = Math.min(Math.max(Number(req.query.limit ?? 12), 1), 50)

  const where = {
    isPublic: true,
    ...(type ? { type } : {}),
    ...(category ? { category } : {}),
    ...(keyword ? { OR: [{ name: { contains: keyword } }, { description: { contains: keyword } }] } : {}),
    ...(collected === '1' ? { collections: { some: { userId } } } : {}),
  }
  const orderBy =
    sort === 'popular' ? { downloadCount: 'desc' as const }
    : sort === 'trending' ? { viewCount: 'desc' as const }
    : { uploadedAt: 'desc' as const }

  const [items, total] = await Promise.all([
    prisma.resource.findMany({ where, orderBy, skip: (page - 1) * limit, take: limit }),
    prisma.resource.count({ where }),
  ])

  const nicknames = await nicknameMap(items.map((r) => r.userId))
  const data = items.map((r) => ({ ...r, uploaderName: nicknames.get(r.userId) ?? '未知用户' }))

  return ok(res, { items: data, total, page, limit })
}

/** GET /api/resources/:id — 详情（含当前用户是否已收藏） */
export const getResource = async (req: Request, res: Response) => {
  const userId = req.userId!
  const id = req.params.id as string

  const [resource, collected] = await Promise.all([
    prisma.resource.findUnique({ where: { id } }),
    prisma.collection.findUnique({ where: { userId_resourceId: { userId, resourceId: id } } }),
  ])
  if (!resource) return fail(res, 404, '资源不存在')

  // 浏览计数 +1（异步，不阻塞）
  void prisma.resource.update({ where: { id }, data: { viewCount: { increment: 1 } } }).catch(() => undefined)

  const nicknames = await nicknameMap([resource.userId])
  return ok(res, { ...resource, collected: !!collected, uploaderName: nicknames.get(resource.userId) ?? '未知用户' })
}

/** POST /api/resources — 上传资源（multipart，文件或链接二选一） */
export const createResource = async (req: Request, res: Response) => {
  const userId = req.userId!
  const { name, description, type, category, tags, isPublic, linkUrl } = req.body as {
    name?: string
    description?: string
    type?: string
    category?: string
    tags?: string
    isPublic?: string
    linkUrl?: string
  }
  const file = req.file as Express.Multer.File | undefined

  const trimmedName = (name ?? '').trim()
  if (!trimmedName) return fail(res, 400, '资源名称必填')
  if (!type || !category) return fail(res, 400, '类型与分类必填')
  if (!file && !linkUrl) return fail(res, 400, '请上传文件或填写链接')

  // tags 支持逗号分隔字符串或 JSON
  let parsedTags: string[] = []
  if (typeof tags === 'string' && tags.trim()) {
    try {
      parsedTags = JSON.parse(tags)
    } catch {
      parsedTags = tags.split(/[,，]/).map((t) => t.trim()).filter(Boolean)
    }
  }

  const resource = await prisma.resource.create({
    data: {
      userId,
      name: trimmedName.slice(0, 100),
      description: description ?? null,
      type,
      category,
      fileUrl: file ? `/api/uploads/${userId}/${file.filename}` : (linkUrl ?? null),
      fileSize: file?.size ?? null,
      fileType: file?.mimetype ?? null,
      isPublic: isPublic !== 'false',
      tags: parsedTags.slice(0, 10),
      linkedGoals: [],
      linkedRecords: [],
    },
  })

  return ok(res, resource, '资源上传成功', 201)
}

/** PUT /api/resources/:id — 更新资源信息（仅上传者） */
export const updateResource = async (req: Request, res: Response) => {
  const userId = req.userId!
  const id = req.params.id as string
  const { name, description, tags, isPublic } = req.body as {
    name?: string
    description?: string
    tags?: string[]
    isPublic?: boolean
  }

  const existing = await prisma.resource.findFirst({ where: { id, userId } })
  if (!existing) return fail(res, 404, '资源不存在或无权修改')

  const updated = await prisma.resource.update({
    where: { id },
    data: {
      ...(name !== undefined ? { name } : {}),
      ...(description !== undefined ? { description } : {}),
      ...(tags !== undefined ? { tags } : {}),
      ...(isPublic !== undefined ? { isPublic } : {}),
    },
  })

  return ok(res, updated, '资源已更新')
}

/** DELETE /api/resources/:id — 删除资源（含物理文件） */
export const deleteResource = async (req: Request, res: Response) => {
  const userId = req.userId!
  const id = req.params.id as string

  const existing = await prisma.resource.findFirst({ where: { id, userId } })
  if (!existing) return fail(res, 404, '资源不存在或无权删除')

  await prisma.resource.delete({ where: { id } })

  // 删除物理文件
  if (existing.fileUrl) {
    const diskPath = diskPathOf(existing.fileUrl)
    if (diskPath) {
      fs.rm(diskPath, { force: true }, () => undefined)
    }
  }

  return ok(res, null, '资源已删除')
}

/** POST /api/resources/:id/collect — 收藏/取消收藏（toggle） */
export const toggleCollect = async (req: Request, res: Response) => {
  const userId = req.userId!
  const id = req.params.id as string

  const resource = await prisma.resource.findUnique({ where: { id } })
  if (!resource) return fail(res, 404, '资源不存在')

  const existing = await prisma.collection.findUnique({
    where: { userId_resourceId: { userId, resourceId: id } },
  })
  if (existing) {
    await prisma.collection.delete({ where: { id: existing.id } })
    return ok(res, { collected: false }, '已取消收藏')
  }
  await prisma.collection.create({ data: { userId, resourceId: id } })
  return ok(res, { collected: true }, '已收藏')
}

/** POST /api/resources/:id/download — 记录下载次数，返回下载链接 */
export const downloadResource = async (req: Request, res: Response) => {
  const userId = req.userId!
  const id = req.params.id as string

  const resource = await prisma.resource.findUnique({ where: { id } })
  if (!resource) return fail(res, 404, '资源不存在')

  await prisma.$transaction([
    prisma.resource.update({ where: { id }, data: { downloadCount: { increment: 1 } } }),
    prisma.resourceDownload.create({ data: { userId, resourceId: id } }),
  ])

  return ok(res, { downloadUrl: resource.fileUrl }, '开始下载')
}

/** GET /api/resources/stats — 用户资源统计 */
export const resourceStats = async (req: Request, res: Response) => {
  const userId = req.userId!

  const [myResources, downloads, collections, links, collectedRows] = await Promise.all([
    prisma.resource.count({ where: { userId } }),
    prisma.resourceDownload.count({ where: { userId } }),
    prisma.collection.count({ where: { userId } }),
    prisma.resource.count({ where: { userId, type: 'link' } }),
    prisma.collection.findMany({ where: { userId }, select: { resourceId: true } }),
  ])
  const collectedIds = new Set(collectedRows.map((c) => c.resourceId))
  const collectedLinkCount = collectedIds.size > 0
    ? await prisma.resource.count({ where: { id: { in: [...collectedIds] }, type: 'link' } })
    : 0

  return ok(res, {
    myResources,
    recentDownloads: downloads,
    myCollections: collections,
    resourceLinks: links + collectedLinkCount,
  })
}

/** GET /api/resources/recommended — 精选推荐（下载量前 6） */
export const recommendedResources = async (req: Request, res: Response) => {
  const items = await prisma.resource.findMany({
    where: { isPublic: true },
    orderBy: { downloadCount: 'desc' },
    take: 6,
  })
  const nicknames = await nicknameMap(items.map((r) => r.userId))
  return ok(res, items.map((r) => ({ ...r, uploaderName: nicknames.get(r.userId) ?? '未知用户' })))
}

// ===== 扩展：关联 / 分享 / 标签云 / 批量操作 =====

type LinkTarget = 'goal' | 'record'

const linkedFieldOf = (targetType: LinkTarget): 'linkedGoals' | 'linkedRecords' =>
  targetType === 'goal' ? 'linkedGoals' : 'linkedRecords'

/** GET /api/resources/related — 与目标/记录关联的资源 */
export const relatedResources = async (req: Request, res: Response) => {
  const userId = req.userId!
  const targetType = (req.query.targetType as LinkTarget | undefined) ?? 'goal'
  const targetId = (req.query.targetId as string | undefined) ?? ''
  if (!targetId) return ok(res, [])

  const field = linkedFieldOf(targetType)
  // MVP：个人规模下全量拉取后在应用层过滤（MySQL JSON 数组包含查询受限）
  const resources = await prisma.resource.findMany({ where: { userId }, orderBy: { uploadedAt: 'desc' }, take: 500 })
  const linked = resources.filter((r) => {
    const ids = (r[field] as string[] | null) ?? []
    return ids.includes(targetId)
  })
  return ok(res, linked)
}

/** POST /api/resources/:id/link — 关联资源到目标/记录 */
export const linkResource = async (req: Request, res: Response) => {
  const userId = req.userId!
  const id = req.params.id as string
  const { targetType, targetId } = req.body as { targetType: LinkTarget; targetId: string }

  const resource = await prisma.resource.findFirst({ where: { id, userId } })
  if (!resource) return fail(res, 404, '资源不存在')
  if (!targetType || !targetId) return fail(res, 400, '缺少 targetType/targetId')

  const field = linkedFieldOf(targetType)
  const ids = (resource[field] as string[] | null) ?? []
  if (!ids.includes(targetId)) ids.push(targetId)

  await prisma.resource.update({ where: { id }, data: { [field]: ids } })
  return ok(res, null, '已关联资源')
}

/** DELETE /api/resources/:id/unlink — 解除关联 */
export const unlinkResource = async (req: Request, res: Response) => {
  const userId = req.userId!
  const id = req.params.id as string
  const { targetType, targetId } = req.body as { targetType: LinkTarget; targetId: string }

  const resource = await prisma.resource.findFirst({ where: { id, userId } })
  if (!resource) return fail(res, 404, '资源不存在')

  const field = linkedFieldOf(targetType)
  const ids = ((resource[field] as string[] | null) ?? []).filter((x) => x !== targetId)
  await prisma.resource.update({ where: { id }, data: { [field]: ids } })
  return ok(res, null, '已解除关联')
}

/** GET /api/resources/:id/share — 生成分享链接（token 有效期 7 天） */
export const shareResource = async (req: Request, res: Response) => {
  const userId = req.userId!
  const id = req.params.id as string

  const resource = await prisma.resource.findFirst({ where: { id, userId } })
  if (!resource) return fail(res, 404, '资源不存在或无权分享')

  // 复用未过期的 token
  const existing = await prisma.resourceShare.findFirst({
    where: { resourceId: id, expiresAt: { gt: new Date() } },
  })
  if (existing) {
    return ok(res, {
      shareUrl: `${env.clientUrl}/share/resource/${existing.token}`,
      expiresAt: existing.expiresAt,
    }, '分享链接已生成')
  }

  const share = await prisma.resourceShare.create({
    data: {
      resourceId: id,
      token: crypto.randomBytes(16).toString('hex'),
      expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
    },
  })
  return ok(res, {
    shareUrl: `${env.clientUrl}/share/resource/${share.token}`,
    expiresAt: share.expiresAt,
  }, '分享链接已生成')
}

/** GET /api/resources/shared/:token — 公开访问分享资源（无需登录） */
export const getSharedResource = async (req: Request, res: Response) => {
  const token = req.params.token as string

  const share = await prisma.resourceShare.findUnique({ where: { token } })
  if (!share || share.expiresAt.getTime() < Date.now()) {
    return fail(res, 404, '分享链接不存在或已过期')
  }

  const resource = await prisma.resource.findUnique({ where: { id: share.resourceId } })
  if (!resource) return fail(res, 404, '资源已被删除')

  const profile = await prisma.userProfile.findUnique({
    where: { userId: resource.userId },
    select: { nickname: true },
  })

  return ok(res, {
    id: resource.id,
    name: resource.name,
    description: resource.description,
    type: resource.type,
    category: resource.category,
    fileUrl: resource.fileUrl,
    fileSize: resource.fileSize,
    fileType: resource.fileType,
    tags: resource.tags,
    downloadCount: resource.downloadCount,
    viewCount: resource.viewCount,
    uploaderName: profile?.nickname ?? '未知用户',
    expiresAt: share.expiresAt,
  })
}

/** GET /api/resources/tags — 标签云（用户所有资源的标签计数） */
export const resourceTags = async (req: Request, res: Response) => {
  const userId = req.userId!

  const resources = await prisma.resource.findMany({ where: { userId }, select: { tags: true } })
  const counts = new Map<string, number>()
  for (const r of resources) {
    for (const tag of (r.tags as string[] | null) ?? []) {
      counts.set(tag, (counts.get(tag) ?? 0) + 1)
    }
  }

  const tags = [...counts.entries()]
    .map(([tag, count]) => ({ tag, count }))
    .sort((a, b) => b.count - a.count)

  return ok(res, tags)
}

/** POST /api/resources/batch/delete — 批量删除（校验归属，连带物理文件） */
export const batchDelete = async (req: Request, res: Response) => {
  const userId = req.userId!
  const { resourceIds } = req.body as { resourceIds: string[] }

  if (!Array.isArray(resourceIds) || resourceIds.length === 0) return fail(res, 400, '请选择要删除的资源')

  const targets = await prisma.resource.findMany({
    where: { id: { in: resourceIds.slice(0, 100) }, userId },
    select: { id: true, fileUrl: true },
  })

  const result = await prisma.resource.deleteMany({
    where: { id: { in: targets.map((t) => t.id) } },
  })

  for (const t of targets) {
    if (!t.fileUrl) continue
    const diskPath = diskPathOf(t.fileUrl)
    if (diskPath) fs.rm(diskPath, { force: true }, () => undefined)
  }

  return ok(res, { deleted: result.count }, `已删除 ${result.count} 个资源`)
}

/** POST /api/resources/batch/move — 批量移动分类 */
export const batchMove = async (req: Request, res: Response) => {
  const userId = req.userId!
  const { resourceIds, targetCategory } = req.body as { resourceIds: string[]; targetCategory: string }

  if (!Array.isArray(resourceIds) || resourceIds.length === 0 || !targetCategory) {
    return fail(res, 400, '缺少参数')
  }

  const result = await prisma.resource.updateMany({
    where: { id: { in: resourceIds.slice(0, 100) }, userId },
    data: { category: targetCategory },
  })

  return ok(res, { moved: result.count }, `已移动 ${result.count} 个资源`)
}

/** GET /api/resources/categories — 各类型资源数量 */
export const resourceCategories = async (req: Request, res: Response) => {
  const groups = await prisma.resource.groupBy({ by: ['type'], _count: { _all: true } })
  const counts: Record<string, number> = { learning: 0, template: 0, tool: 0, material: 0, book: 0, link: 0 }
  for (const g of groups) counts[g.type] = g._count._all

  return ok(res, [
    { type: 'learning', label: '学习资料', count: counts.learning ?? 0 },
    { type: 'template', label: '模板库', count: counts.template ?? 0 },
    { type: 'tool', label: '工具软件', count: counts.tool ?? 0 },
    { type: 'material', label: '素材资源', count: counts.material ?? 0 },
    { type: 'book', label: '书籍推荐', count: counts.book ?? 0 },
    { type: 'link', label: '链接收藏', count: counts.link ?? 0 },
  ])
}
