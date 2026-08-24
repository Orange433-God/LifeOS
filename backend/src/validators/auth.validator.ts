import { body } from 'express-validator'

export const registerValidator = [
  body('email').isEmail().withMessage('邮箱格式不正确').normalizeEmail(),
  body('password').isString().isLength({ min: 6 }).withMessage('密码至少 6 位'),
]

export const loginValidator = [
  body('email').isEmail().withMessage('邮箱格式不正确').normalizeEmail(),
  body('password').isString().notEmpty().withMessage('请输入密码'),
]

export const refreshValidator = [
  body('refreshToken').isString().notEmpty().withMessage('缺少 refreshToken'),
]
