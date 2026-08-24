import { body } from 'express-validator'

const AVATAR_STYLES = ['realistic', 'anime', 'future', 'fantasy', 'minimal']

export const updateProfileValidator = [
  body('nickname').optional().isString().trim().isLength({ min: 1, max: 20 }).withMessage('昵称长度为 1-20 字'),
  body('avatarStyle').optional().isIn(AVATAR_STYLES).withMessage('头像风格不合法'),
  body('birthdate').optional({ values: 'falsy' }).isISO8601().withMessage('birthdate 必须是 ISO 8601 时间格式'),
  body('gender').optional({ values: 'falsy' }).isIn(['male', 'female', 'secret']).withMessage('gender 必须是 male/female/secret'),
  body('bio').optional({ values: 'falsy' }).isString().isLength({ max: 100 }).withMessage('简介最多 100 字'),
]

export const updateNotificationValidator = [
  body('aiMessageNotify').optional().isBoolean(),
  body('goalProgressNotify').optional().isBoolean(),
  body('growthAchieveNotify').optional().isBoolean(),
  body('systemUpdateNotify').optional().isBoolean(),
  body('activityRecommend').optional().isBoolean(),
  body('quietStart').optional({ values: 'falsy' }).matches(/^([01]\d|2[0-3]):[0-5]\d$/).withMessage('quietStart 格式为 HH:MM'),
  body('quietEnd').optional({ values: 'falsy' }).matches(/^([01]\d|2[0-3]):[0-5]\d$/).withMessage('quietEnd 格式为 HH:MM'),
]

export const updateAppearanceValidator = [
  body('themeMode').optional().isIn(['light', 'dark', 'system']).withMessage('themeMode 不合法'),
  body('themeColor').optional().isIn(['purple', 'blue', 'green', 'pink']).withMessage('themeColor 不合法'),
  body('density').optional().isIn(['compact', 'medium', 'relaxed']).withMessage('density 不合法'),
]

export const updateGeneralValidator = [
  body('language').optional().isIn(['zh-CN', 'en-US']).withMessage('language 不合法'),
  body('timeFormat').optional().isIn(['24h', '12h']).withMessage('timeFormat 不合法'),
  body('dateFormat').optional().isIn(['YYYY-MM-DD', 'MM/DD/YYYY', 'DD/MM/YYYY']).withMessage('dateFormat 不合法'),
  body('weekStart').optional().isIn(['monday', 'sunday']).withMessage('weekStart 不合法'),
  body('startPage').optional().isIn(['home', 'space', 'dashboard']).withMessage('startPage 不合法'),
]

export const deleteAccountValidator = [
  body('confirm').isString().notEmpty().withMessage('缺少确认信息'),
]

export const clearDataValidator = [
  body('scope').isIn(['records', 'goals', 'all']).withMessage('scope 必须是 records/goals/all'),
]
