import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// 开发环境通过代理转发 /api 到后端（默认 4000 端口，与 backend/.env 的 PORT 保持一致）
// base 由 VITE_BASE 控制：本地默认 '/'，GitHub Pages 部署时 '/LifeOS/'
export default defineConfig({
  base: process.env.VITE_BASE || '/',
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
