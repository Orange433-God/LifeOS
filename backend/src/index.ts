import { app } from './app.js'
import { env } from './config/env.js'
import { prisma } from './lib/prisma.js'

const server = app.listen(env.port, () => {
  console.log(`✨ LifeOS API 已启动: http://localhost:${env.port}`)
})

// 优雅退出
const shutdown = async (): Promise<void> => {
  console.log('\n正在关闭 LifeOS API…')
  server.close()
  await prisma.$disconnect()
  process.exit(0)
}

process.on('SIGINT', () => void shutdown())
process.on('SIGTERM', () => void shutdown())
