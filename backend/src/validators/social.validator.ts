import { body, query } from 'express-validator'

export const friendRequestValidator = [
  body('friendId').isString().notEmpty().withMessage('缺少 friendId'),
]

export const handleRequestValidator = [
  body('status').isIn(['accepted', 'rejected']).withMessage('status 必须是 accepted/rejected'),
]

export const updatePrivacyValidator = [
  body('roomAccess').optional().isIn(['private', 'friends_only', 'public']).withMessage('roomAccess 不合法'),
  body('profileVisibility').optional().isIn(['friends_only', 'public']).withMessage('profileVisibility 不合法'),
  body('allowRoomVisit').optional().isBoolean().withMessage('allowRoomVisit 必须是布尔值'),
  body('showOnlineStatus').optional().isBoolean().withMessage('showOnlineStatus 必须是布尔值'),
  body('allowSearch').optional().isBoolean().withMessage('allowSearch 必须是布尔值'),
]

export const recordVisitValidator = [
  body('ownerId').isString().notEmpty().withMessage('缺少 ownerId'),
  body('duration').optional().isInt({ min: 1 }).withMessage('duration 必须是正整数秒'),
]

export const searchUsersValidator = [
  query('q').isString().isLength({ max: 30 }).withMessage('q 最长 30 字'),
]
