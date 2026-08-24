import { body } from 'express-validator'

export const createActionValidator = [
  body('content').isString().trim().isLength({ min: 1, max: 200 }).withMessage('行动内容为 1-200 字'),
  body('dueDate').optional({ values: 'falsy' }).isISO8601().withMessage('dueDate 必须是 ISO 8601 时间格式'),
]

export const updateActionValidator = [
  body('content').optional().isString().trim().isLength({ min: 1, max: 200 }).withMessage('行动内容为 1-200 字'),
  body('dueDate').optional({ values: 'falsy' }).isISO8601().withMessage('dueDate 必须是 ISO 8601 时间格式'),
  body('isCompleted').optional().isBoolean().withMessage('isCompleted 必须是布尔值'),
]
