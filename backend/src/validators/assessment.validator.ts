import { body } from 'express-validator'
import { QUESTIONS } from '../data/assessmentQuestions.js'

const questionIds = new Set(QUESTIONS.map((q) => q.id))

export const submitAssessmentValidator = [
  body('answers')
    .custom((value: unknown) => {
      if (value === null || typeof value !== 'object' || Array.isArray(value)) return false
      const answers = value as Record<string, unknown>
      const keys = Object.keys(answers)
      // 必须恰好覆盖全部题目，且每题答案为 1-5 的整数
      if (keys.length !== QUESTIONS.length) return false
      return keys.every(
        (k) =>
          questionIds.has(k) &&
          Number.isInteger(answers[k]) &&
          (answers[k] as number) >= 1 &&
          (answers[k] as number) <= 5,
      )
    })
    .withMessage(`answers 必须覆盖全部 ${QUESTIONS.length} 题，且每题答案为 1-5 的整数`),
]
