import { Router } from 'express'
import { asyncHandler } from '../lib/asyncHandler.js'
import { requireAuth } from '../middleware/auth.js'
import { validate } from '../middleware/validate.js'
import { updateActionValidator } from '../validators/action.validator.js'
import { deleteAction, toggleAction, updateAction } from '../controllers/action.controller.js'

export const actionRoutes = Router()

actionRoutes.put('/:id', requireAuth, updateActionValidator, validate, asyncHandler(updateAction))
actionRoutes.put('/:id/toggle', requireAuth, asyncHandler(toggleAction))
actionRoutes.delete('/:id', requireAuth, asyncHandler(deleteAction))
