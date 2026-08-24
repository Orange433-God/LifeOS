import { body } from 'express-validator'
import { GOAL_CATEGORIES, GOAL_PRIORITIES, GOAL_STATUSES } from '../services/goalService.js'

const ATTRIBUTE_KEYS = ['explore', 'learn', 'execute', 'create', 'health', 'connect', 'stable']

export const createGoalValidator = [
  body('title').isString().trim().isLength({ min: 1, max: 50 }).withMessage('目标标题为 1-50 字'),
  body('description').optional({ values: 'falsy' }).isString().isLength({ max: 500 }).withMessage('描述最多 500 字'),
  body('category').isIn(GOAL_CATEGORIES).withMessage(`分类必须是 ${GOAL_CATEGORIES.join('/')} 之一`),
  body('priority').isIn(GOAL_PRIORITIES).withMessage('优先级必须是 high/mid/low'),
  body('targetDate').optional({ values: 'falsy' }).isISO8601().withMessage('targetDate 必须是 ISO 8601 时间格式'),
  body('targetAttributes')
    .optional({ values: 'falsy' })
    .isArray({ max: 7 })
    .withMessage('targetAttributes 必须是数组')
    .custom((v: unknown) => Array.isArray(v) && v.every((k) => ATTRIBUTE_KEYS.includes(k as string)))
    .withMessage('targetAttributes 含非法属性键'),
]

export const updateGoalValidator = [
  body('title').optional().isString().trim().isLength({ min: 1, max: 50 }).withMessage('目标标题为 1-50 字'),
  body('description').optional({ values: 'falsy' }).isString().isLength({ max: 500 }).withMessage('描述最多 500 字'),
  body('category').optional().isIn(GOAL_CATEGORIES).withMessage('分类不合法'),
  body('priority').optional().isIn(GOAL_PRIORITIES).withMessage('优先级不合法'),
  body('status').optional().isIn(GOAL_STATUSES).withMessage('状态不合法'),
  body('targetDate').optional({ values: 'falsy' }).isISO8601().withMessage('targetDate 必须是 ISO 8601 时间格式'),
  body('targetAttributes')
    .optional({ values: 'falsy' })
    .isArray({ max: 7 })
    .withMessage('targetAttributes 必须是数组')
    .custom((v: unknown) => Array.isArray(v) && v.every((k) => ATTRIBUTE_KEYS.includes(k as string)))
    .withMessage('targetAttributes 含非法属性键'),
]

export const breakdownValidator = [
  body('goalTitle').isString().trim().isLength({ min: 1, max: 50 }).withMessage('目标标题为 1-50 字'),
  body('goalDescription').optional({ values: 'falsy' }).isString().isLength({ max: 500 }),
  body('category').optional({ values: 'falsy' }).isIn(GOAL_CATEGORIES).withMessage('分类不合法'),
]
