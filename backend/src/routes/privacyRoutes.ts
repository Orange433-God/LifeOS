import { Router } from 'express'
import { asyncHandler } from '../lib/asyncHandler.js'
import { requireAuth } from '../middleware/auth.js'
import { validate } from '../middleware/validate.js'
import { updatePrivacyValidator } from '../validators/social.validator.js'
import { getPrivacy, updatePrivacy } from '../controllers/privacy.controller.js'

export const privacyRoutes = Router()

privacyRoutes.get('/', requireAuth, asyncHandler(getPrivacy))
privacyRoutes.put('/', requireAuth, updatePrivacyValidator, validate, asyncHandler(updatePrivacy))
