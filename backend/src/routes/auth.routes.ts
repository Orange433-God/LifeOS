import { Router } from 'express'
import { asyncHandler } from '../lib/asyncHandler.js'
import { requireAuth } from '../middleware/auth.js'
import { validate } from '../middleware/validate.js'
import { loginValidator, refreshValidator, registerValidator } from '../validators/auth.validator.js'
import { login, logout, refresh, register } from '../controllers/auth.controller.js'

export const authRouter = Router()

authRouter.post('/register', registerValidator, validate, asyncHandler(register))
authRouter.post('/login', loginValidator, validate, asyncHandler(login))
authRouter.post('/refresh', refreshValidator, validate, asyncHandler(refresh))
authRouter.post('/logout', requireAuth, asyncHandler(logout))
