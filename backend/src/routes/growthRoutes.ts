import { Router } from 'express'
import { query } from 'express-validator'
import { asyncHandler } from '../lib/asyncHandler.js'
import { requireAuth } from '../middleware/auth.js'
import { validate } from '../middleware/validate.js'
import { getSummary, getTimeline, getTrends } from '../controllers/growth.controller.js'

export const growthRoutes = Router()

const periodValidator = [
  query('period').optional().isIn(['month', 'quarter', 'year']).withMessage('period 必须是 month/quarter/year'),
]

growthRoutes.get('/timeline', requireAuth, asyncHandler(getTimeline))
growthRoutes.get('/trends', requireAuth, periodValidator, validate, asyncHandler(getTrends))
growthRoutes.get('/summary', requireAuth, periodValidator, validate, asyncHandler(getSummary))
