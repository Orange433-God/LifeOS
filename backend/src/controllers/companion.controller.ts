import type { Request, Response } from 'express'
import { prisma } from '../lib/prisma.js'
import { fail } from '../lib/response.js'
import { streamCompanionChat } from '../services/aiService.js'

/**
 * POST /api/companion/chat — AI 伙伴对话（SSE 流式）
 * 组装用户画像上下文（昵称 + 七维属性 + 近期记录）后调用 Python AI 微服务，
 * 将微服务的 SSE 事件原样转发给前端。
 */
export const chat = async (req: Request, res: Response) => {
  const userId = req.userId!
  const { message } = req.body as { message: string }

  const [profile, attributes] = await Promise.all([
    prisma.userProfile.findUnique({ where: { userId } }),
    prisma.lifeAttribute.findUnique({ where: { userId } }),
  ])
  if (!profile) return fail(res, 404, '请先创建资料')

  const contextAttributes: Record<string, number> = attributes
    ? {
        explore: attributes.explore,
        learn: attributes.learn,
        execute: attributes.execute,
        create: attributes.create,
        health: attributes.health,
        connect: attributes.connect,
        stable: attributes.stable,
      }
    : {}

  const context = {
    nickname: profile.nickname,
    attributes: contextAttributes,
    // TODO 阶段 4：接入人生记录表后填充 recentRecords；接入目标系统后补充进行中目标
    recentRecords: [] as string[],
  }

  await streamCompanionChat(res, { userId, message, context })
}
