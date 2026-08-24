import { Router } from 'express'
import { asyncHandler } from '../lib/asyncHandler.js'
import { requireAuth } from '../middleware/auth.js'
import { validate } from '../middleware/validate.js'
import { query } from 'express-validator'
import { getHistory, getOverview } from '../controllers/dashboard.controller.js'

export const dashboardRoutes = Router()

const historyValidator = [
  query('days').optional().isInt({ min: 1, max: 366 }).withMessage('days 必须是 1-366 的整数'),
]

dashboardRoutes.get('/overview', requireAuth, asyncHandler(getOverview))
dashboardRoutes.get('/history', requireAuth, historyValidator, validate, asyncHandler(getHistory))
