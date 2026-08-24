import { Router } from 'express'
import { asyncHandler } from '../lib/asyncHandler.js'
import { requireAuth } from '../middleware/auth.js'
import { validate } from '../middleware/validate.js'
import { breakdownValidator, createGoalValidator, updateGoalValidator } from '../validators/goal.validator.js'
import { createActionValidator } from '../validators/action.validator.js'
import {
  breakdownGoal,
  createGoal,
  deleteGoal,
  getGoal,
  listGoals,
  updateGoal,
} from '../controllers/goal.controller.js'
import { createAction } from '../controllers/action.controller.js'

export const goalRoutes = Router()

goalRoutes.post('/', requireAuth, createGoalValidator, validate, asyncHandler(createGoal))
goalRoutes.get('/', requireAuth, asyncHandler(listGoals))
goalRoutes.post('/breakdown', requireAuth, breakdownValidator, validate, asyncHandler(breakdownGoal))
goalRoutes.get('/:id', requireAuth, asyncHandler(getGoal))
goalRoutes.put('/:id', requireAuth, updateGoalValidator, validate, asyncHandler(updateGoal))
goalRoutes.delete('/:id', requireAuth, asyncHandler(deleteGoal))
goalRoutes.post('/:goalId/actions', requireAuth, createActionValidator, validate, asyncHandler(createAction))
