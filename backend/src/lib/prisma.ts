import { PrismaClient } from '@prisma/client'

/** PrismaClient 单例（懒连接：仅在首次查询时连接数据库） */
export const prisma = new PrismaClient()
