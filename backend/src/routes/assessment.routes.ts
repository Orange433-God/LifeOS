import { Router } from 'express'
import { asyncHandler } from '../lib/asyncHandler.js'
import { requireAuth } from '../middleware/auth.js'
import { validate } from '../middleware/validate.js'
import { submitAssessmentValidator } from '../validators/assessment.validator.js'
import { getAssessment, getQuestions, submitAssessment } from '../controllers/assessment.controller.js'

export const assessmentRouter = Router()

assessmentRouter.get('/questions', requireAuth, asyncHandler(getQuestions))
assessmentRouter.get('/', requireAuth, asyncHandler(getAssessment))
assessmentRouter.post('/submit', requireAuth, submitAssessmentValidator, validate, asyncHandler(submitAssessment))
