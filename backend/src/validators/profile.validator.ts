import { body } from 'express-validator'

/** 5 种头像风格（与 Prisma schema 注释保持一致） */
export const AVATAR_STYLES = ['realistic', 'anime', 'future', 'fantasy', 'minimal']
export type AvatarStyle = 'realistic' | 'anime' | 'future' | 'fantasy' | 'minimal'

/** 5 个偏好标签 */
export const PREFERENCE_TAGS = ['成长', '探索', '创造', '生活', '关系']

export const createProfileValidator = [
  body('nickname')
    .isString()
    .withMessage('昵称必须是字符串')
    .trim()
    .isLength({ min: 1, max: 20 })
    .withMessage('昵称长度为 1-20 个字符'),
  body('avatarStyle')
    .isIn(AVATAR_STYLES)
    .withMessage(`头像风格必须是 ${AVATAR_STYLES.join('/')} 之一`),
  body('preferenceTags')
    .isArray({ min: 1, max: 5 })
    .withMessage('请至少选择 1 个偏好标签（最多 5 个）')
    .custom((tags: unknown) => Array.isArray(tags) && tags.every((t) => PREFERENCE_TAGS.includes(t as string)))
    .withMessage('偏好标签不合法')
    .custom((tags: unknown) => Array.isArray(tags) && new Set(tags).size === tags.length)
    .withMessage('偏好标签不能重复'),
  body('lifeStage')
    .optional({ values: 'falsy' })
    .isString()
    .withMessage('lifeStage 必须是字符串')
    .isLength({ max: 50 })
    .withMessage('lifeStage 最多 50 个字符'),
]

export const updateAvatarValidator = [
  body('avatarConfig')
    .custom((value: unknown) => value !== null && typeof value === 'object' && !Array.isArray(value))
    .withMessage('avatarConfig 必须是 JSON 对象'),
]
