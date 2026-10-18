'use client'

import { useSearchParams } from 'next/navigation'
import { useActionState } from 'react'
import { login } from '@/app/actions'

export function LoginForm() {
  const next = useSearchParams().get('next') ?? '/'
  const [state, action, pending] = useActionState(login, undefined)

  return (
    <form action={action} className="flex w-full max-w-[360px] flex-col gap-4">
      <div>
        <h2 className="text-xl font-bold">Masuk</h2>
        <p className="mt-1 text-sm text-ink-2">Gunakan akun yang diberikan admin.</p>
      </div>
      {state?.error && (
        <p role="alert" className="rounded-lg bg-critical/12 px-3 py-2 text-[13px] text-critical">{state.error}</p>
      )}
      <input type="hidden" name="next" value={next} />
      <label className="flex flex-col gap-1.5 text-[13px] font-medium text-ink-2">
        Username
        <input name="username" autoComplete="username" required defaultValue={state?.username}
          className="rounded-lg border border-line bg-surface px-3 py-2.5 text-sm text-ink" />
      </label>
      <label className="flex flex-col gap-1.5 text-[13px] font-medium text-ink-2">
        Password
        <input name="password" type="password" autoComplete="current-password" required
          className="rounded-lg border border-line bg-surface px-3 py-2.5 text-sm text-ink" />
      </label>
      <button disabled={pending}
        className="mt-1 rounded-lg bg-accent py-2.5 text-sm font-semibold text-accent-ink transition hover:brightness-105 disabled:opacity-60">
        {pending ? 'Memeriksa…' : 'Masuk'}
      </button>
      <p className="text-xs text-ink-3">Akun demo: <b>admin</b> / admin123 (akses penuh) · <b>viewer</b> / viewer123</p>
    </form>
  )
}
