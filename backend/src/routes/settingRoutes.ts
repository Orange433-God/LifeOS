import { Router } from 'express'
import { asyncHandler } from '../lib/asyncHandler.js'
import { requireAuth } from '../middleware/auth.js'
import { validate } from '../middleware/validate.js'
import {
  clearDataValidator,
  deleteAccountValidator,
  updateAppearanceValidator,
  updateGeneralValidator,
  updateNotificationValidator,
  updateProfileValidator,
} from '../validators/settings.validator.js'
import {
  clearData,
  deleteAccount,
  exportData,
  getSettings,
  resetSettings,
  updateAppearance,
  updateGeneral,
  updateNotification,
  updateProfile,
} from '../controllers/settings.controller.js'

export const settingRoutes = Router()

settingRoutes.get('/', requireAuth, asyncHandler(getSettings))
settingRoutes.put('/profile', requireAuth, updateProfileValidator, validate, asyncHandler(updateProfile))
settingRoutes.put('/notification', requireAuth, updateNotificationValidator, validate, asyncHandler(updateNotification))
settingRoutes.put('/appearance', requireAuth, updateAppearanceValidator, validate, asyncHandler(updateAppearance))
settingRoutes.put('/general', requireAuth, updateGeneralValidator, validate, asyncHandler(updateGeneral))
settingRoutes.post('/reset', requireAuth, asyncHandler(resetSettings))
settingRoutes.get('/export', requireAuth, asyncHandler(exportData))
settingRoutes.post('/clear', requireAuth, clearDataValidator, validate, asyncHandler(clearData))
settingRoutes.delete('/account', requireAuth, deleteAccountValidator, validate, asyncHandler(deleteAccount))
