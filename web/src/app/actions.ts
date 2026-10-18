'use server'

import { redirect } from 'next/navigation'
import { createSession, deleteSession, verifyCredentials } from '@/lib/auth'

export type LoginState = { error?: string; username?: string } | undefined

export async function login(_prev: LoginState, formData: FormData): Promise<LoginState> {
  const username = String(formData.get('username') ?? '').trim()
  const password = String(formData.get('password') ?? '')
  if (!username || !password) return { error: 'Isi username dan password.', username }

  const user = await verifyCredentials(username, password)
  if (!user) return { error: 'Username atau password salah.', username }

  await createSession(user)
  const next = String(formData.get('next') ?? '/dashboard')
  redirect(next.startsWith('/') && !next.startsWith('//') ? next : '/dashboard')
}

export async function logout() {
  await deleteSession()
  redirect('/')
}
