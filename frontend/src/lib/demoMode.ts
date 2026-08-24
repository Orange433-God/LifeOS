/** 演示模式开关：构建时 VITE_DEMO_MODE=1 启用（GitHub Pages 静态演示站） */
export const IS_DEMO = import.meta.env.VITE_DEMO_MODE === '1'
