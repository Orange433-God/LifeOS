import { body, query } from 'express-validator'

export const RESOURCE_TYPES = ['learning', 'template', 'tool', 'material', 'book', 'link']

export const listResourcesValidator = [
  query('type').optional().isIn(RESOURCE_TYPES).withMessage('type 不合法'),
  query('category').optional().isString().isLength({ max: 30 }),
  query('keyword').optional().isString().isLength({ max: 50 }),
  query('sort').optional().isIn(['latest', 'popular', 'trending']).withMessage('sort 不合法'),
  query('page').optional().isInt({ min: 1 }).withMessage('page 不合法'),
  query('limit').optional().isInt({ min: 1, max: 50 }).withMessage('limit 不合法'),
  query('collected').optional().isIn(['1', 'true']).withMessage('collected 不合法'),
]

export const updateResourceValidator = [
  body('name').optional().isString().trim().isLength({ min: 1, max: 100 }).withMessage('资源名称为 1-100 字'),
  body('description').optional({ values: 'falsy' }).isString().isLength({ max: 500 }),
  body('tags').optional({ values: 'falsy' }).isArray({ max: 10 }).withMessage('tags 必须是数组'),
  body('isPublic').optional().isBoolean(),
]
