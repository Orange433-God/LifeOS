import { Router } from 'express'
import { asyncHandler } from '../lib/asyncHandler.js'
import { requireAuth } from '../middleware/auth.js'
import { setRoomEntered } from '../controllers/room.controller.js'

export const roomRouter = Router()

roomRouter.post('/entered', requireAuth, asyncHandler(setRoomEntered))
