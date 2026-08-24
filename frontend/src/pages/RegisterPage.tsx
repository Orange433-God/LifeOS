import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { AuthCard } from '../components/AuthCard'
import { useAuth } from '../context/AuthContext'
import { getErrorMessage } from '../lib/api'

const registerSchema = z
  .object({
    email: z.string().email('请输入有效的邮箱地址'),
    password: z.string().min(6, '密码至少 6 位'),
    confirmPassword: z.string(),
  })
  .refine((d) => d.password === d.confirmPassword, {
    path: ['confirmPassword'],
    message: '两次输入的密码不一致',
  })

type RegisterForm = z.infer<typeof registerSchema>

export default function RegisterPage() {
  const { register: registerAccount } = useAuth()
  const navigate = useNavigate()
  const [serverError, setServerError] = useState<string | null>(null)
  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<RegisterForm>({ resolver: zodResolver(registerSchema) })

  const onSubmit = async (values: RegisterForm) => {
    setServerError(null)
    try {
      // 注册成功即自动登录，进入资料创建页
      await registerAccount(values.email, values.password)
      navigate('/profile-setup', { replace: true })
    } catch (err) {
      setServerError(getErrorMessage(err))
    }
  }

  return (
    <AuthCard
      title="创建你的账号"
      subtitle="开启属于你的 LifeOS 生活空间"
      footer={
        <>
          已有账号？{' '}
          <Link className="text-mist-600 hover:underline" to="/login">
            直接登录
          </Link>
        </>
      }
    >
      <form onSubmit={handleSubmit(onSubmit)} className="space-y-5" noValidate>
        <div>
          <label htmlFor="email" className="mb-1.5 block text-sm font-medium text-warm-600">
            邮箱
          </label>
          <input
            id="email"
            type="email"
            className="input-field"
            placeholder="you@example.com"
            {...register('email')}
          />
          {errors.email && <p className="mt-1.5 text-sm text-red-400">{errors.email.message}</p>}
        </div>
        <div>
          <label htmlFor="password" className="mb-1.5 block text-sm font-medium text-warm-600">
            密码（至少 6 位）
          </label>
          <input
            id="password"
            type="password"
            className="input-field"
            placeholder="••••••"
            {...register('password')}
          />
          {errors.password && (
            <p className="mt-1.5 text-sm text-red-400">{errors.password.message}</p>
          )}
        </div>
        <div>
          <label htmlFor="confirmPassword" className="mb-1.5 block text-sm font-medium text-warm-600">
            确认密码
          </label>
          <input
            id="confirmPassword"
            type="password"
            className="input-field"
            placeholder="••••••"
            {...register('confirmPassword')}
          />
          {errors.confirmPassword && (
            <p className="mt-1.5 text-sm text-red-400">{errors.confirmPassword.message}</p>
          )}
        </div>
        {serverError && (
          <p className="rounded-xl bg-red-50 px-4 py-2.5 text-sm text-red-500">{serverError}</p>
        )}
        <button type="submit" disabled={isSubmitting} className="btn-primary w-full">
          {isSubmitting ? '注册中…' : '注 册'}
        </button>
      </form>
    </AuthCard>
  )
}
