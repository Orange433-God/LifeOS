import { Router } from 'express'
import { asyncHandler } from '../lib/asyncHandler.js'
import { requireAuth } from '../middleware/auth.js'
import { validate } from '../middleware/validate.js'
import { listRecordsValidator, quickRecordValidator, recentRecordsValidator } from '../validators/record.validator.js'
import { deleteRecord, getRecord, listRecords, quickRecord, recentRecords } from '../controllers/record.controller.js'

export const recordRoutes = Router()

recordRoutes.post('/quick', requireAuth, quickRecordValidator, validate, asyncHandler(quickRecord))
recordRoutes.get('/recent', requireAuth, recentRecordsValidator, validate, asyncHandler(recentRecords))
recordRoutes.get('/', requireAuth, listRecordsValidator, validate, asyncHandler(listRecords))
recordRoutes.get('/:id', requireAuth, asyncHandler(getRecord))
recordRoutes.delete('/:id', requireAuth, asyncHandler(deleteRecord))
