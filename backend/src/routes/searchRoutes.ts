import { Router } from 'express'
import { asyncHandler } from '../lib/asyncHandler.js'
import { requireAuth } from '../middleware/auth.js'
import { validate } from '../middleware/validate.js'
import { searchUsersValidator } from '../validators/social.validator.js'
import { globalSearch, searchUsers } from '../controllers/search.controller.js'

export const searchRoutes = Router()

searchRoutes.get('/global', requireAuth, asyncHandler(globalSearch))
searchRoutes.get('/users', requireAuth, searchUsersValidator, validate, asyncHandler(searchUsers))
