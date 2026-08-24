// 启动 LifeOS AI 伙伴微服务（uvicorn :8000）。
// 幂等：若端口 8000 已有健康服务（含启动中的重试等待），直接退出不重复启动，
// 使 npm run dev 可以反复重启而不会端口冲突。
import { spawn } from 'node:child_process'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const SERVICE_DIR = path.resolve(__dirname, '../lifeos-ai-service')
const HEALTH_URL = 'http://localhost:8000/api/ai/health'

const healthy = async () => {
  try {
    const res = await fetch(HEALTH_URL, { signal: AbortSignal.timeout(2000) })
    return res.ok
  } catch {
    return false
  }
}

// 服务可能正在启动中（导入 chromadb 等较慢）：先重试几次健康检查
for (let i = 0; i < 8; i++) {
  if (await healthy()) {
    console.log('[ai] AI 服务已在运行（端口 8000），跳过启动')
    process.exit(0)
  }
  await new Promise((r) => setTimeout(r, 1000))
}

console.log('[ai] 启动 AI 服务（uvicorn :8000）…')
const child = spawn(
  path.join(SERVICE_DIR, '.venv', 'Scripts', 'python.exe'),
  ['-m', 'uvicorn', 'app:app', '--host', '0.0.0.0', '--port', '8000'],
  { cwd: SERVICE_DIR, stdio: 'inherit', windowsHide: true },
)

// 转发终止信号：concurrently/Ctrl+C 退出时同步关掉 uvicorn
const shutdown = () => {
  child.kill()
  process.exit(0)
}
process.on('SIGINT', shutdown)
process.on('SIGTERM', shutdown)

child.on('exit', (code) => process.exit(code ?? 0))
