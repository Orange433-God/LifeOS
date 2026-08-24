import { body, query } from 'express-validator'

export const quickRecordValidator = [
  body('content')
    .isString()
    .withMessage('记录内容必须是文本')
    .trim()
    .isLength({ min: 1, max: 500 })
    .withMessage('记录内容长度为 1-500 字'),
  body('recordedAt')
    .optional({ values: 'falsy' })
    .isISO8601()
    .withMessage('recordedAt 必须是 ISO 8601 时间格式'),
]

export const recentRecordsValidator = [
  query('limit').optional().isInt({ min: 1, max: 50 }).withMessage('limit 必须是 1-50 的整数'),
]

export const listRecordsValidator = [
  query('startDate').optional({ values: 'falsy' }).isISO8601().withMessage('startDate 必须是 ISO 8601 时间格式'),
  query('endDate').optional({ values: 'falsy' }).isISO8601().withMessage('endDate 必须是 ISO 8601 时间格式'),
  query('limit').optional().isInt({ min: 1, max: 500 }).withMessage('limit 必须是 1-500 的整数'),
]
