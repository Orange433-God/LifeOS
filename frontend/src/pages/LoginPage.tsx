import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { AuthCard } from '../components/AuthCard'
import { useAuth } from '../context/AuthContext'
import { getErrorMessage } from '../lib/api'

const loginSchema = z.object({
  email: z.string().email('请输入有效的邮箱地址'),
  password: z.string().min(1, '请输入密码'),
})

type LoginForm = z.infer<typeof loginSchema>

export default function LoginPage() {
  const { login } = useAuth()
  const navigate = useNavigate()
  const [serverError, setServerError] = useState<string | null>(null)
  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<LoginForm>({ resolver: zodResolver(loginSchema) })

  const onSubmit = async (values: LoginForm) => {
    setServerError(null)
    try {
      await login(values.email, values.password)
      // 登录成功后进入资料页（已创建资料的用户会被守卫自动送回首页）
      navigate('/profile-setup', { replace: true })
    } catch (err) {
      setServerError(getErrorMessage(err))
    }
  }

  return (
    <AuthCard
      title="欢迎回来"
      subtitle="登录你的 LifeOS 生活空间"
      footer={
        <>
          还没有账号？{' '}
          <Link className="text-mist-600 hover:underline" to="/register">
            立即注册
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
            密码
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
        {serverError && (
          <p className="rounded-xl bg-red-50 px-4 py-2.5 text-sm text-red-500">{serverError}</p>
        )}
        <button type="submit" disabled={isSubmitting} className="btn-primary w-full">
          {isSubmitting ? '登录中…' : '登 录'}
        </button>
      </form>
    </AuthCard>
  )
}
