import 'dotenv/config'

const required = (name: string): string => {
  const value = process.env[name]
  if (!value) throw new Error(`缺少环境变量 ${name}，请检查 backend/.env`)
  return value
}

export const env = {
  port: Number(process.env.PORT ?? 4000),
  clientUrl: process.env.CLIENT_URL ?? 'http://localhost:5173',
  /** Python AI 伙伴微服务地址 */
  aiServiceUrl: process.env.AI_SERVICE_URL ?? 'http://localhost:8000',
  /** DeepSeek API（人生记录 AI 解析，缺失时自动降级本地规则） */
  deepseekApiKey: process.env.DEEPSEEK_API_KEY ?? '',
  deepseekBaseUrl: process.env.DEEPSEEK_BASE_URL ?? 'https://api.deepseek.com/v1',
  recordParseModel: process.env.RECORD_PARSE_MODEL ?? 'deepseek-v4-flash',
  jwtSecret: required('JWT_SECRET'),
  refreshSecret: required('REFRESH_SECRET'),
  /** access token 有效期（15 分钟） */
  accessTokenTtl: '15m',
  /** refresh token 有效期（7 天） */
  refreshTokenTtlDays: 7,
} as const
