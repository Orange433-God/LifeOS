import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// 开发环境通过代理转发 /api 到后端（默认 4000 端口，与 backend/.env 的 PORT 保持一致）
export default defineConfig({
  plugins: [react()],
  server: {
    port: 5173,
    proxy: {
      '/api': {
        target: 'http://localhost:4000',
        changeOrigin: true,
      },
    },
  },
})
