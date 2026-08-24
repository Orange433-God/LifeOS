import { Router } from 'express'
import { asyncHandler } from '../lib/asyncHandler.js'
import { requireAuth } from '../middleware/auth.js'
import { validate } from '../middleware/validate.js'
import { recordVisitValidator } from '../validators/social.validator.js'
import { recordVisit, visitRoom, visitStats } from '../controllers/visit.controller.js'

export const visitRoutes = Router()

visitRoutes.get('/room/:userId', requireAuth, asyncHandler(visitRoom))
visitRoutes.post('/record', requireAuth, recordVisitValidator, validate, asyncHandler(recordVisit))
visitRoutes.get('/stats', requireAuth, asyncHandler(visitStats))
