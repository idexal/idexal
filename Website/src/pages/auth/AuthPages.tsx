import { useState, type ReactNode } from 'react'
import { Link } from 'react-router-dom'
import { useT } from '@/lib/useI18n'
import { LangSwitcherInline } from '@/components/dashboard/shared'
import { FaIcon } from '@/components/shared/FaIcon'

export function AuthLayout({ children }: { children: ReactNode }) {
  return (
    <div className="grid-bg flex min-h-screen flex-col">
      <header className="container-x flex h-16 items-center justify-between">
        <Link to="/" className="flex items-center">
          <img src="/logo-full.png" alt="Idexal" className="h-9 w-auto rounded-lg" />
        </Link>
        <LangSwitcherInline />
      </header>
      <main className="flex flex-1 items-start justify-center px-4 pb-16 pt-6">{children}</main>
    </div>
  )
}

function SocialButtons() {
  const t = useT()
  return (
    <>
      <div className="my-5 flex items-center gap-3 text-xs text-muted">
        <span className="h-px flex-1 bg-[var(--border)]" />{t('auth.orContinue')}<span className="h-px flex-1 bg-[var(--border)]" />
      </div>
      <div className="grid grid-cols-2 gap-3">
        <button type="button" className="btn btn-secondary"><FaIcon icon="fa-envelope" className="h-4 w-4" /> Google</button>
        <button type="button" className="btn btn-secondary"><FaIcon icon="fa-github" brand className="h-4 w-4" /> GitHub</button>
      </div>
    </>
  )
}

export function LoginPage() {
  const t = useT()
  return (
    <AuthLayout>
      <div className="card-surface w-full max-w-md p-8 shadow-card">
        <h1 className="text-2xl font-bold tracking-tight">{t('auth.loginTitle')}</h1>
        <p className="mt-1 text-sm text-muted">{t('auth.loginSubtitle')}</p>
        <form className="mt-6 space-y-4" onSubmit={(e) => e.preventDefault()}>
          <label className="block text-sm font-medium">
            {t('auth.email')}
            <input required type="email" className="input mt-1.5" placeholder="ahmed@example.com" dir="ltr" />
          </label>
          <label className="block text-sm font-medium">
            {t('auth.password')}
            <input required type="password" className="input mt-1.5" placeholder="••••••••" dir="ltr" />
          </label>
          <div className="flex items-center justify-between text-sm">
            <label className="flex cursor-pointer items-center gap-2 text-muted">
              <input type="checkbox" className="h-4 w-4 accent-[var(--primary)]" /> {t('auth.remember')}
            </label>
            <Link to="/auth/forgot-password" className="text-primary hover:underline">{t('forgotTitle')}</Link>
          </div>
          <Link to="/dashboard" className="btn btn-primary w-full py-2.5">{t('auth.signIn')}</Link>
        </form>
        <SocialButtons />
        <p className="mt-5 text-center text-sm text-muted">
          {t('auth.noAccount')}{' '}
          <Link to="/auth/register" className="font-semibold text-primary hover:underline">{t('auth.signUp')}</Link>
        </p>
      </div>
    </AuthLayout>
  )
}

export function RegisterPage() {
  const t = useT()
  return (
    <AuthLayout>
      <div className="card-surface w-full max-w-md p-8 shadow-card">
        <h1 className="text-2xl font-bold tracking-tight">{t('auth.registerTitle')}</h1>
        <p className="mt-1 text-sm text-muted">{t('auth.registerSubtitle')}</p>
        <form className="mt-6 space-y-4" onSubmit={(e) => e.preventDefault()}>
          <label className="block text-sm font-medium">
            {t('auth.name')}
            <input required className="input mt-1.5" placeholder="Ahmed Hassan" />
          </label>
          <label className="block text-sm font-medium">
            {t('auth.email')}
            <input required type="email" className="input mt-1.5" placeholder="you@example.com" dir="ltr" />
          </label>
          <label className="block text-sm font-medium">
            {t('auth.password')}
            <input required type="password" minLength={8} className="input mt-1.5" placeholder="••••••••" dir="ltr" />
          </label>
          <Link to="/dashboard" className="btn btn-primary w-full py-2.5">{t('auth.signUp')}</Link>
        </form>
        <SocialButtons />
        <p className="mt-5 text-center text-sm text-muted">
          {t('auth.haveAccount')}{' '}
          <Link to="/auth/login" className="font-semibold text-primary hover:underline">{t('auth.signIn')}</Link>
        </p>
      </div>
    </AuthLayout>
  )
}

export function ForgotPasswordPage() {
  const t = useT()
  const [sent, setSent] = useState(false)
  return (
    <AuthLayout>
      <div className="card-surface w-full max-w-md p-8 shadow-card">
        <h1 className="text-2xl font-bold tracking-tight">{t('auth.forgotTitle')}</h1>
        <p className="mt-1 text-sm text-muted">{t('auth.forgotSubtitle')}</p>
        {sent ? (
          <div className="mt-6 rounded-xl bg-emerald-500/10 p-4 text-sm font-medium text-emerald-500">✓ {t('newsletter.done')}</div>
        ) : (
          <form className="mt-6 space-y-4" onSubmit={(e) => { e.preventDefault(); setSent(true) }}>
            <label className="block text-sm font-medium">
              {t('auth.email')}
              <input required type="email" className="input mt-1.5" placeholder="you@example.com" dir="ltr" />
            </label>
            <button className="btn btn-primary w-full py-2.5">{t('auth.send')}</button>
          </form>
        )}
        <p className="mt-5 text-center text-sm">
          <Link to="/auth/login" className="text-primary hover:underline">← {t('auth.backLogin')}</Link>
        </p>
      </div>
    </AuthLayout>
  )
}

export function VerifyEmailPage() {
  const t = useT()
  const [code, setCode] = useState(['', '', '', '', '', ''])
  const filled = code.every((c) => c !== '')
  return (
    <AuthLayout>
      <div className="card-surface w-full max-w-md p-8 text-center shadow-card">
        <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-gradient-to-br from-blue-500 to-cyan-400 text-2xl">📧</div>
        <h1 className="mt-4 text-2xl font-bold tracking-tight">{t('auth.verifyTitle')}</h1>
        <p className="mt-1 text-sm text-muted">{t('auth.verifySubtitle')}</p>
        <div dir="ltr" className="mt-6 flex justify-center gap-2">
          {code.map((c, i) => (
            <input
              key={i}
              value={c}
              inputMode="numeric"
              maxLength={1}
              onChange={(e) => {
                const v = e.target.value.replace(/\D/g, '')
                setCode((prev) => prev.map((x, j) => (j === i ? v : x)))
                if (v && i < 5) {
                  const next = document.getElementById(`otp-${i + 1}`)
                  next?.focus()
                }
              }}
              id={`otp-${i}`}
              className="input h-12 w-11 text-center text-lg font-bold"
            />
          ))}
        </div>
        <Link to="/dashboard" className={`btn btn-primary mt-6 w-full py-2.5 ${filled ? '' : 'pointer-events-none opacity-60'}`}>
          Verify &amp; continue
        </Link>
        <p className="mt-4 text-xs text-muted">Didn't receive a code? <button className="font-semibold text-primary hover:underline">Resend</button></p>
      </div>
    </AuthLayout>
  )
}
