import { body } from 'express-validator'

export const companionChatValidator = [
  body('message')
    .isString()
    .withMessage('消息必须是文本')
    .trim()
    .isLength({ min: 1, max: 500 })
    .withMessage('消息长度为 1-500 字'),
]
