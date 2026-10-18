import { jwtVerify, SignJWT } from 'jose'
import type { SessionUser } from './types'

// Dipakai bersama oleh proxy.ts dan server action, jadi tanpa 'server-only'.
export const SESSION_COOKIE = 'iak_session'
export const SESSION_HOURS = 8

const secret = process.env.SESSION_SECRET ?? 'dev-only-secret-ganti-di-.env.local-minimal-32-karakter'
const key = new TextEncoder().encode(secret)

export async function encrypt(user: SessionUser): Promise<string> {
  return new SignJWT({ ...user })
    .setProtectedHeader({ alg: 'HS256' })
    .setIssuedAt()
    .setExpirationTime(`${SESSION_HOURS}h`)
    .sign(key)
}

export async function decrypt(token: string | undefined): Promise<SessionUser | null> {
  if (!token) return null
  try {
    const { payload } = await jwtVerify(token, key, { algorithms: ['HS256'] })
    if (typeof payload.username !== 'string' || (payload.role !== 'admin' && payload.role !== 'viewer')) return null
    return { username: payload.username, role: payload.role }
  } catch {
    return null
  }
}
