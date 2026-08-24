import { Router } from 'express'
import { asyncHandler } from '../lib/asyncHandler.js'
import { requireAuth } from '../middleware/auth.js'
import { validate } from '../middleware/validate.js'
import { friendRequestValidator, handleRequestValidator } from '../validators/social.validator.js'
import {
  handleRequest,
  listFriends,
  pendingRequests,
  removeFriend,
  sendRequest,
} from '../controllers/friend.controller.js'

export const friendRoutes = Router()

friendRoutes.post('/request', requireAuth, friendRequestValidator, validate, asyncHandler(sendRequest))
friendRoutes.put('/request/:id', requireAuth, handleRequestValidator, validate, asyncHandler(handleRequest))
friendRoutes.get('/', requireAuth, asyncHandler(listFriends))
friendRoutes.get('/pending', requireAuth, asyncHandler(pendingRequests))
friendRoutes.delete('/:id', requireAuth, asyncHandler(removeFriend))
