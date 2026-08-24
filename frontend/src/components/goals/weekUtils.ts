// ===== 周维度时间工具（统计/日历/趋势共用）=====

export const WEEKDAY_LABELS = ['周一', '周二', '周三', '周四', '周五', '周六', '周日'] as const

/** 周一 0 点（周起始） */
export const startOfWeek = (d: Date): Date => {
  const x = new Date(d)
  const day = (x.getDay() + 6) % 7
  x.setDate(x.getDate() - day)
  x.setHours(0, 0, 0, 0)
  return x
}

/** 两个时间是否在同一自然周 */
export const isSameWeek = (a: Date, b: Date): boolean =>
  startOfWeek(a).getTime() === startOfWeek(b).getTime()

/** 0=周一 ... 6=周日 */
export const weekdayOf = (d: Date): number => (d.getDay() + 6) % 7

/** MM/DD 短日期 */
export const formatShort = (d: Date): string => `${d.getMonth() + 1}/${d.getDate()}`
