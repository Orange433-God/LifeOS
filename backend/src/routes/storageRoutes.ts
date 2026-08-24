import { Router } from 'express'
import { asyncHandler } from '../lib/asyncHandler.js'
import { requireAuth } from '../middleware/auth.js'
import { storageCleanup, storageUsage } from '../controllers/storage.controller.js'

export const storageRoutes = Router()

storageRoutes.get('/usage', requireAuth, asyncHandler(storageUsage))
storageRoutes.delete('/cleanup', requireAuth, asyncHandler(storageCleanup))
