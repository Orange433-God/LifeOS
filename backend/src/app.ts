import express from 'express'
import cors from 'cors'
import { env } from './config/env.js'
import { authRouter } from './routes/auth.routes.js'
import { profileRouter } from './routes/profile.routes.js'
import { assessmentRouter } from './routes/assessment.routes.js'
import { roomRouter } from './routes/room.routes.js'
import { companionRouter } from './routes/companion.routes.js'
import { recordRoutes } from './routes/recordRoutes.js'
import { dashboardRoutes } from './routes/dashboardRoutes.js'
import { goalRoutes } from './routes/goalRoutes.js'
import { actionRoutes } from './routes/actionRoutes.js'
import { growthRoutes } from './routes/growthRoutes.js'
import { friendRoutes } from './routes/friendRoutes.js'
import { privacyRoutes } from './routes/privacyRoutes.js'
import { visitRoutes } from './routes/visitRoutes.js'
import { searchRoutes } from './routes/searchRoutes.js'
import { settingRoutes } from './routes/settingRoutes.js'
import { resourceRoutes } from './routes/resourceRoutes.js'
import { storageRoutes } from './routes/storageRoutes.js'
import { UPLOADS_DIR } from './controllers/resource.controller.js'
import { errorHandler, notFound } from './middleware/error.js'

export const app = express()

app.use(cors({ origin: env.clientUrl, credentials: true }))
app.use(express.json())

// 健康检查（不访问数据库）
app.get('/api/health', (_req, res) => {
  res.json({ success: true, message: 'LifeOS API 运行中' })
})

app.use('/api/auth', authRouter)
app.use('/api/profile', profileRouter)
app.use('/api/assessment', assessmentRouter)
app.use('/api/room', roomRouter)
app.use('/api/companion', companionRouter)
app.use('/api/records', recordRoutes)
app.use('/api/dashboard', dashboardRoutes)
app.use('/api/goals', goalRoutes)
app.use('/api/actions', actionRoutes)
app.use('/api/growth', growthRoutes)
app.use('/api/friends', friendRoutes)
app.use('/api/privacy', privacyRoutes)
app.use('/api/visit', visitRoutes)
app.use('/api/search', searchRoutes)
app.use('/api/settings', settingRoutes)
app.use('/api/resources', resourceRoutes)
app.use('/api/storage', storageRoutes)
// 上传文件的静态托管（经 vite 代理可达）
app.use('/api/uploads', express.static(UPLOADS_DIR))

app.use(notFound)
app.use(errorHandler)
