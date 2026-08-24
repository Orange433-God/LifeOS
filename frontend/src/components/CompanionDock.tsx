import { useEffect, useRef, useState } from 'react'
import { useLocation } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import { CompanionChatPanel } from './room/CompanionChat'
import companionAvatar from '../assets/companion-avatar.png'

/** 不显示悬浮窗的路径：AI 伙伴页与设置页（含其子路径） */
const EXCLUDED_PATHS = ['/companion', '/settings']

/** 悬浮球尺寸（含边框）与拖拽时离视口边缘的最小间距 */
const SIZE = 56
const EDGE = 8

function clampPosition(x: number, y: number) {
  return {
    x: Math.min(Math.max(EDGE, x), window.innerWidth - SIZE - EDGE),
    y: Math.min(Math.max(EDGE, y), window.innerHeight - SIZE - EDGE),
  }
}

/**
 * 全局 AI 伙伴悬浮窗：除 AI 伙伴页/设置页外的所有页面显示伙伴头像悬浮球，
 * 悬浮球可用鼠标/触摸任意拖动（位置在页面切换间保留），点击在屏幕右侧打开对话小窗。
 * z-[45]：高于页面内 z-40 的悬浮层，低于 z-50 的模态框。
 */
export function CompanionDock() {
  const { state } = useAuth()
  const { pathname } = useLocation()
  const [open, setOpen] = useState(false)
  // 悬浮球位置：初始在右下角（与原 fixed bottom-5 right-5 一致）
  const [pos, setPos] = useState(() =>
    clampPosition(window.innerWidth - SIZE - 20, window.innerHeight - SIZE - 20),
  )
  const dragging = useRef(false)
  const moved = useRef(false)
  const dragStart = useRef({ px: 0, py: 0, x: 0, y: 0 })
  // 拖拽结束后的合成 click（尤其触屏延迟 click）在此时间前忽略，防止误开面板
  const suppressClickUntil = useRef(0)

  // 窗口尺寸变化时把悬浮球收回视口内
  useEffect(() => {
    const onResize = () => setPos((p) => clampPosition(p.x, p.y))
    window.addEventListener('resize', onResize)
    return () => window.removeEventListener('resize', onResize)
  }, [])

  if (state.status !== 'authed' || !state.profile) return null
  if (EXCLUDED_PATHS.some((p) => pathname === p || pathname.startsWith(`${p}/`))) return null

  const { profile, companion } = state.profile

  const handlePointerDown = (e: React.PointerEvent<HTMLButtonElement>) => {
    dragging.current = true
    moved.current = false
    dragStart.current = { px: e.clientX, py: e.clientY, x: pos.x, y: pos.y }
    e.currentTarget.setPointerCapture(e.pointerId)
  }

  const handlePointerMove = (e: React.PointerEvent<HTMLButtonElement>) => {
    if (!dragging.current) return
    const dx = e.clientX - dragStart.current.px
    const dy = e.clientY - dragStart.current.py
    // 位移超过 4px 才算拖拽，避免点击时的轻微抖动导致小球跳动
    if (!moved.current && Math.hypot(dx, dy) < 4) return
    moved.current = true
    setPos(clampPosition(dragStart.current.x + dx, dragStart.current.y + dy))
  }

  const handlePointerUp = () => {
    if (moved.current) suppressClickUntil.current = Date.now() + 400
    dragging.current = false
    moved.current = false
  }

  const handleClick = () => {
    if (Date.now() < suppressClickUntil.current) return
    setOpen(true)
  }

  return (
    <>
      {/* 可拖拽悬浮球 */}
      <button
        type="button"
        onClick={handleClick}
        onPointerDown={handlePointerDown}
        onPointerMove={handlePointerMove}
        onPointerUp={handlePointerUp}
        onPointerCancel={handlePointerUp}
        title={`和${companion.name}聊聊（可拖动）`}
        aria-label="打开 AI 伙伴对话"
        className="fixed z-[45] flex h-14 w-14 cursor-grab touch-none select-none items-center justify-center rounded-full border-2 border-white/40 bg-gradient-to-br from-iris-500/60 to-sky-400/40 p-1 shadow-[0_8px_28px_rgba(122,135,245,0.55)] backdrop-blur transition-transform duration-150 hover:scale-105 active:cursor-grabbing active:scale-95"
        style={{ left: pos.x, top: pos.y }}
      >
        <img
          src={companionAvatar}
          alt={companion.name}
          draggable={false}
          className="h-full w-full rounded-full object-cover"
        />
        <span className="absolute -right-0.5 -top-0.5 h-3.5 w-3.5 rounded-full border-2 border-white bg-emerald-400" />
      </button>

      {/* 右侧对话小窗 */}
      {open && (
        <div className="fixed inset-0 z-[45] flex justify-end">
          {/* 背景遮罩：点击关闭 */}
          <button
            type="button"
            aria-label="关闭对话"
            onClick={() => setOpen(false)}
            className="absolute inset-0 cursor-default bg-night-950/40 backdrop-blur-[2px]"
          />

          {/* 对话面板（屏幕右侧小窗） */}
          <div className="glass-panel-strong animate-slide-in-right relative z-10 m-4 flex h-[calc(100%-2rem)] w-full max-w-md flex-col overflow-hidden">
            <CompanionChatPanel
              companion={companion}
              nickname={profile.nickname}
              onClose={() => setOpen(false)}
            />
          </div>
        </div>
      )}
    </>
  )
}
