import { Router } from 'express'
import { asyncHandler } from '../lib/asyncHandler.js'
import { requireAuth } from '../middleware/auth.js'
import { validate } from '../middleware/validate.js'
import { companionChatValidator } from '../validators/companion.validator.js'
import { chat } from '../controllers/companion.controller.js'

export const companionRouter = Router()

companionRouter.post('/chat', requireAuth, companionChatValidator, validate, asyncHandler(chat))
