import fs from 'node:fs'
import path from 'node:path'
import { Router } from 'express'
import multer from 'multer'
import { asyncHandler } from '../lib/asyncHandler.js'
import { requireAuth } from '../middleware/auth.js'
import { validate } from '../middleware/validate.js'
import { listResourcesValidator, updateResourceValidator } from '../validators/resource.validator.js'
import { UPLOADS_DIR, batchDelete, batchMove, createResource, deleteResource, downloadResource, getResource, getSharedResource, linkResource, listResources, recommendedResources, relatedResources, resourceCategories, resourceStats, resourceTags, shareResource, toggleCollect, unlinkResource, updateResource } from '../controllers/resource.controller.js'

// 允许的文件类型（链接类资源无需文件）
const ALLOWED_MIME = new Set([
  'application/pdf',
  'application/msword',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  'application/vnd.ms-excel',
  'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  'application/vnd.ms-powerpoint',
  'application/vnd.openxmlformats-officedocument.presentationml.presentation',
  'image/png',
  'image/jpeg',
  'image/gif',
  'image/webp',
  'application/zip',
  'application/x-rar-compressed',
  'application/x-7z-compressed',
])

const MAX_FILE_SIZE = 50 * 1024 * 1024 // 50MB

const upload = multer({
  storage: multer.diskStorage({
    destination: (req, _file, cb) => {
      const userDir = path.join(UPLOADS_DIR, (req as Express.Request & { userId?: string }).userId ?? 'anonymous')
      fs.mkdirSync(userDir, { recursive: true })
      cb(null, userDir)
    },
    filename: (_req, file, cb) => {
      const ext = path.extname(file.originalname).slice(0, 10)
      cb(null, `${Date.now()}-${Math.random().toString(36).slice(2, 10)}${ext}`)
    },
  }),
  limits: { fileSize: MAX_FILE_SIZE },
  fileFilter: (_req, file, cb) => {
    if (ALLOWED_MIME.has(file.mimetype)) cb(null, true)
    else cb(new Error('不支持的文件类型'))
  },
})

export const resourceRoutes = Router()

// 公开分享访问（无需登录，需在鉴权路由之前注册）
resourceRoutes.get('/shared/:token', asyncHandler(getSharedResource))

resourceRoutes.get('/', requireAuth, listResourcesValidator, validate, asyncHandler(listResources))
resourceRoutes.get('/stats', requireAuth, asyncHandler(resourceStats))
resourceRoutes.get('/recommended', requireAuth, asyncHandler(recommendedResources))
resourceRoutes.get('/categories', requireAuth, asyncHandler(resourceCategories))
resourceRoutes.get('/related', requireAuth, asyncHandler(relatedResources))
resourceRoutes.get('/tags', requireAuth, asyncHandler(resourceTags))
resourceRoutes.post('/batch/delete', requireAuth, asyncHandler(batchDelete))
resourceRoutes.post('/batch/move', requireAuth, asyncHandler(batchMove))
resourceRoutes.get('/:id', requireAuth, asyncHandler(getResource))
resourceRoutes.post('/', requireAuth, upload.single('file'), asyncHandler(createResource))
resourceRoutes.put('/:id', requireAuth, updateResourceValidator, validate, asyncHandler(updateResource))
resourceRoutes.delete('/:id', requireAuth, asyncHandler(deleteResource))
resourceRoutes.post('/:id/collect', requireAuth, asyncHandler(toggleCollect))
resourceRoutes.post('/:id/download', requireAuth, asyncHandler(downloadResource))
resourceRoutes.get('/:id/share', requireAuth, asyncHandler(shareResource))
resourceRoutes.post('/:id/link', requireAuth, asyncHandler(linkResource))
resourceRoutes.delete('/:id/unlink', requireAuth, asyncHandler(unlinkResource))
