import fs from 'node:fs'
import path from 'node:path'
import { Router } from 'express'
import multer from 'multer'
import { asyncHandler } from '../lib/asyncHandler.js'
import { requireAuth } from '../middleware/auth.js'
import { validate } from '../middleware/validate.js'
import { UPLOADS_DIR } from '../controllers/resource.controller.js'
import {
  createProfileValidator,
  updateAvatarValidator,
} from '../validators/profile.validator.js'
import { createProfile, getProfile, resetAvatarImage, updateAvatar, uploadAvatarImage } from '../controllers/profile.controller.js'

/** 头像上传：图片文件（≤5MB），存 uploads/avatars/{userId}.{ext} */
const avatarUpload = multer({
  storage: multer.diskStorage({
    destination: (_req, _file, cb) => {
      const dir = path.join(UPLOADS_DIR, 'avatars')
      fs.mkdirSync(dir, { recursive: true })
      cb(null, dir)
    },
    filename: (req, file, cb) => {
      const userId = (req as Express.Request & { userId?: string }).userId ?? 'anonymous'
      cb(null, `${userId}${path.extname(file.originalname).toLowerCase() || '.jpg'}`)
    },
  }),
  limits: { fileSize: 5 * 1024 * 1024 },
  fileFilter: (_req, file, cb) => {
    if (file.mimetype.startsWith('image/')) cb(null, true)
    else cb(new Error('仅支持图片文件'))
  },
})

export const profileRouter = Router()

profileRouter.get('/', requireAuth, asyncHandler(getProfile))
profileRouter.post('/', requireAuth, createProfileValidator, validate, asyncHandler(createProfile))
profileRouter.put('/avatar', requireAuth, updateAvatarValidator, validate, asyncHandler(updateAvatar))
profileRouter.post('/avatar/upload', requireAuth, avatarUpload.single('avatar'), asyncHandler(uploadAvatarImage))
profileRouter.delete('/avatar', requireAuth, asyncHandler(resetAvatarImage))
