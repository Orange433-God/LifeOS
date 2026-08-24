import fs from 'node:fs'
import path from 'node:path'
import type { Request, Response } from 'express'
import { prisma } from '../lib/prisma.js'
import { ok } from '../lib/response.js'
import { UPLOADS_DIR } from './resource.controller.js'

const TOTAL_BYTES = 10 * 1024 * 1024 * 1024 // 10GB（可后续改为按用户配置）

/** GET /api/storage/usage — 云空间使用情况 */
export const storageUsage = async (req: Request, res: Response) => {
  const userId = req.userId!

  const result = await prisma.resource.aggregate({
    where: { userId },
    _sum: { fileSize: true },
  })
  const used = result._sum.fileSize ?? 0

  return ok(res, {
    used,
    total: TOTAL_BYTES,
    usedPercent: Number(((used / TOTAL_BYTES) * 100).toFixed(2)),
  })
}

/** DELETE /api/storage/cleanup — 清理未引用的孤儿文件 */
export const storageCleanup = async (req: Request, res: Response) => {
  const userId = req.userId!

  const userDir = path.join(UPLOADS_DIR, userId)
  if (!fs.existsSync(userDir)) return ok(res, { removedCount: 0, freedBytes: 0 }, '无需清理')

  // 数据库中引用的文件名集合
  const resources = await prisma.resource.findMany({ where: { userId }, select: { fileUrl: true } })
  const referenced = new Set(
    resources
      .map((r) => r.fileUrl)
      .filter((u): u is string => !!u && u.startsWith(`/api/uploads/${userId}/`))
      .map((u) => u.split('/').pop()!),
  )

  let removedCount = 0
  let freedBytes = 0
  for (const filename of fs.readdirSync(userDir)) {
    if (referenced.has(filename)) continue
    const filePath = path.join(userDir, filename)
    try {
      freedBytes += fs.statSync(filePath).size
      fs.rmSync(filePath, { force: true })
      removedCount += 1
    } catch {
      // 跳过无法读取的文件
    }
  }

  return ok(res, { removedCount, freedBytes }, '清理完成')
}
