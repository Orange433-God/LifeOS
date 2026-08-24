import { Route, BrowserRouter, Routes, Navigate } from 'react-router-dom'
import { AuthProvider } from './context/AuthContext'
import { ErrorBoundary } from './components/ErrorBoundary'
import { CompanionDock } from './components/CompanionDock'
import ShareResourcePage from './pages/ShareResourcePage'
import { GuestOnly, RequireNoProfile, RequireProfile } from './components/RouteGuards'
import LoginPage from './pages/LoginPage'
import RegisterPage from './pages/RegisterPage'
import ProfileSetupPage from './pages/ProfileSetupPage'
import HomePage from './pages/HomePage'
import RoomPage from './pages/RoomPage'
import AssessmentPage from './pages/AssessmentPage'
import AssessmentResultPage from './pages/AssessmentResultPage'
import CompanionPage from './pages/CompanionPage'
import DashboardPage from './pages/DashboardPage'
import GoalsPage from './pages/GoalsPage'
import GoalDetailPage from './pages/GoalDetailPage'
import GrowthPage from './pages/GrowthPage'
import RecordsPage from './pages/RecordsPage'
import FriendsPage from './pages/FriendsPage'
import PrivacySettingsPage from './pages/PrivacySettingsPage'
import VisitRoomPage from './pages/VisitRoomPage'
import SettingsPage from './pages/SettingsPage'
import ResourcesPage from './pages/ResourcesPage'

export default function App() {
  return (
    <AuthProvider>
      <BrowserRouter>
        <ErrorBoundary>
        <Routes>
          <Route
            path="/register"
            element={
              <GuestOnly>
                <RegisterPage />
              </GuestOnly>
            }
          />
          <Route
            path="/login"
            element={
              <GuestOnly>
                <LoginPage />
              </GuestOnly>
            }
          />
          {/* 登录后强制进入资料页；已创建资料则自动回首页 */}
          <Route
            path="/profile-setup"
            element={
              <RequireNoProfile>
                <ProfileSetupPage />
              </RequireNoProfile>
            }
          />
          {/* 首页需登录且已完成资料；未完成则强制跳资料页 */}
          <Route
            path="/"
            element={
              <RequireProfile>
                <HomePage />
              </RequireProfile>
            }
          />
          {/* 数字空间：2D 房间背景 + 悬浮 UI */}
          <Route
            path="/room"
            element={
              <RequireProfile>
                <RoomPage />
              </RequireProfile>
            }
          />
          {/* 人生测评（问卷页已有记录时自动跳结果页；结果页未测评时自动回问卷页） */}
          <Route
            path="/assessment"
            element={
              <RequireProfile>
                <AssessmentPage />
              </RequireProfile>
            }
          />
          <Route
            path="/assessment/result"
            element={
              <RequireProfile>
                <AssessmentResultPage />
              </RequireProfile>
            }
          />
          {/* 人生大盘：属性全景/趋势/AI 总结/记录与目标 */}
          <Route
            path="/dashboard"
            element={
              <RequireProfile>
                <DashboardPage />
              </RequireProfile>
            }
          />
          {/* AI 伙伴专属对话页 */}
          <Route
            path="/companion"
            element={
              <RequireProfile>
                <CompanionPage />
              </RequireProfile>
            }
          />
          {/* 目标与行动 */}
          <Route
            path="/goals"
            element={
              <RequireProfile>
                <GoalsPage />
              </RequireProfile>
            }
          />
          <Route
            path="/goals/:id"
            element={
              <RequireProfile>
                <GoalDetailPage />
              </RequireProfile>
            }
          />
          {/* 成长分析：轨迹 + 趋势 + AI 传记 */}
          <Route
            path="/growth"
            element={
              <RequireProfile>
                <GrowthPage />
              </RequireProfile>
            }
          />
          {/* 人生记录：时间轴/日历/列表/相册 四视图 */}
          <Route
            path="/records"
            element={
              <RequireProfile>
                <RecordsPage />
              </RequireProfile>
            }
          />
          {/* 公开分享页（无需登录） */}
          <Route path="/share/resource/:token" element={<ShareResourcePage />} />
          {/* 社交：好友列表 / 隐私设置 / 参观房间（只读） */}
          <Route
            path="/friends"
            element={
              <RequireProfile>
                <FriendsPage />
              </RequireProfile>
            }
          />
          <Route
            path="/settings"
            element={
              <RequireProfile>
                <SettingsPage />
              </RequireProfile>
            }
          />
          {/* 资源中心：云存储与资源共享 */}
          <Route
            path="/resources"
            element={
              <RequireProfile>
                <ResourcesPage />
              </RequireProfile>
            }
          />
          <Route
            path="/settings/privacy"
            element={
              <RequireProfile>
                <PrivacySettingsPage />
              </RequireProfile>
            }
          />
          <Route
            path="/visit/:userId"
            element={
              <RequireProfile>
                <VisitRoomPage />
              </RequireProfile>
            }
          />
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
        {/* 全局 AI 伙伴悬浮窗（AI 伙伴页/设置页由组件内部排除） */}
        <CompanionDock />
        </ErrorBoundary>
      </BrowserRouter>
    </AuthProvider>
  )
}
