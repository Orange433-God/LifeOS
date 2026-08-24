import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { Logo } from '../components/Logo'
import { useAuth } from '../context/AuthContext'
import { getErrorMessage } from '../lib/api'
import { AVATAR_STYLE_KEYS, AVATAR_STYLES, PREFERENCE_TAG_KEYS, PREFERENCE_TAGS } from '../lib/constants'

const profileSchema = z.object({
  nickname: z.string().trim().min(1, '请填写昵称').max(20, '昵称最多 20 个字符'),
  avatarStyle: z.enum(AVATAR_STYLE_KEYS),
  preferenceTags: z
    .array(z.enum(PREFERENCE_TAG_KEYS))
    .min(1, '至少选择 1 个偏好标签')
    .max(5, '最多选择 5 个偏好标签'),
})

type ProfileForm = z.infer<typeof profileSchema>

export default function ProfileSetupPage() {
  const { completeProfile } = useAuth()
  const navigate = useNavigate()
  const [serverError, setServerError] = useState<string | null>(null)
  const {
    register,
    handleSubmit,
    setValue,
    watch,
    formState: { errors, isSubmitting },
  } = useForm<ProfileForm>({
    resolver: zodResolver(profileSchema),
    defaultValues: { nickname: '', avatarStyle: 'realistic', preferenceTags: [] },
  })

  const avatarStyle = watch('avatarStyle')
  const preferenceTags = watch('preferenceTags')

  const toggleTag = (key: (typeof PREFERENCE_TAG_KEYS)[number]) => {
    const next = preferenceTags.includes(key)
      ? preferenceTags.filter((t) => t !== key)
      : [...preferenceTags, key]
    setValue('preferenceTags', next, { shouldValidate: true })
  }

  const onSubmit = async (values: ProfileForm) => {
    setServerError(null)
    try {
      await completeProfile(values)
      navigate('/', { replace: true })
    } catch (err) {
      setServerError(getErrorMessage(err))
    }
  }

  return (
    <div className="app-background flex min-h-screen items-center justify-center px-4 py-10">
      <div className="glass-card w-full max-w-2xl p-8 shadow-glass-lg">
        <header className="text-center">
          <div className="flex justify-center">
            <Logo size="lg" />
          </div>
          <h1 className="mt-5 text-2xl font-semibold text-warm-800">创建你的生活档案</h1>
          <p className="mt-1.5 text-sm text-warm-500">
            让 LifeOS 认识你，为你搭建专属的房间与 AI 同伴
          </p>
        </header>

        <form onSubmit={handleSubmit(onSubmit)} className="mt-8 space-y-8" noValidate>
          <div>
            <label htmlFor="nickname" className="mb-1.5 block text-sm font-medium text-warm-600">
              昵称 <span className="text-mist-500">*</span>
            </label>
            <input
              id="nickname"
              className="input-field"
              placeholder="大家怎么称呼你？"
              maxLength={20}
              {...register('nickname')}
            />
            {errors.nickname && (
              <p className="mt-1.5 text-sm text-red-400">{errors.nickname.message}</p>
            )}
          </div>

          <div>
            <span className="mb-1.5 block text-sm font-medium text-warm-600">选择头像风格</span>
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-5">
              {AVATAR_STYLES.map((style) => {
                const selected = avatarStyle === style.key
                return (
                  <button
                    key={style.key}
                    type="button"
                    onClick={() => setValue('avatarStyle', style.key, { shouldValidate: true })}
                    className={`flex flex-col items-center gap-1 rounded-xl border px-2 py-4 backdrop-blur transition ${
                      selected
                        ? 'border-mist-300 bg-white/90 shadow-glass ring-2 ring-mist-400'
                        : 'border-white/60 bg-white/50 hover:bg-white/75'
                    }`}
                  >
                    <span className="text-2xl">{style.icon}</span>
                    <span className="text-sm font-medium text-warm-800">{style.label}</span>
                    <span className="text-xs text-warm-400">{style.desc}</span>
                  </button>
                )
              })}
            </div>
          </div>

          <div>
            <span className="mb-1.5 block text-sm font-medium text-warm-600">
              选择偏好标签（可多选）
            </span>
            <div className="flex flex-wrap gap-3">
              {PREFERENCE_TAGS.map((tag) => {
                const selected = preferenceTags.includes(tag.key)
                return (
                  <button
                    key={tag.key}
                    type="button"
                    onClick={() => toggleTag(tag.key)}
                    className={`flex items-center gap-1.5 rounded-full border px-4 py-2 text-sm backdrop-blur transition ${
                      selected
                        ? 'border-mist-300 bg-mist-100 text-mist-700 ring-2 ring-mist-300'
                        : 'border-white/60 bg-white/50 text-warm-600 hover:bg-white/75'
                    }`}
                  >
                    <span>{tag.icon}</span>
                    {tag.key}
                  </button>
                )
              })}
            </div>
            {errors.preferenceTags && (
              <p className="mt-1.5 text-sm text-red-400">{errors.preferenceTags.message}</p>
            )}
          </div>

          {/* 供 react-hook-form 注册这两个手动 setValue 的字段 */}
          <input type="hidden" {...register('avatarStyle')} />
          <input type="hidden" {...register('preferenceTags')} />

          {serverError && (
            <p className="rounded-xl bg-red-50 px-4 py-2.5 text-sm text-red-500">{serverError}</p>
          )}

          <button type="submit" disabled={isSubmitting} className="btn-primary w-full text-lg">
            {isSubmitting ? '正在创建你的空间…' : '开启我的 LifeOS'}
          </button>
        </form>
      </div>
    </div>
  )
}
