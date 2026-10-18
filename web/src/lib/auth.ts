import 'server-only'
import bcrypt from 'bcryptjs'
import { cookies } from 'next/headers'
import { redirect } from 'next/navigation'
import { connection } from 'next/server'
import fs from 'node:fs'
import path from 'node:path'
import { userDb } from './db'
import { decrypt, encrypt, SESSION_COOKIE, SESSION_HOURS } from './session'
import type { SessionUser } from './types'

// Akun awal untuk demo tugas. Ganti password sebelum dipakai di luar lingkungan kelas.
const SEED_USERS: [string, string, SessionUser['role']][] = [
  ['admin', 'admin123', 'admin'],
  ['viewer', 'viewer123', 'viewer'],
]

let ready = false
function ensureUsers() {
  if (ready) return
  fs.mkdirSync(path.join(process.cwd(), 'data'), { recursive: true })
  const db = userDb()
  db.exec(`CREATE TABLE IF NOT EXISTS users (
    user_id INTEGER PRIMARY KEY AUTOINCREMENT,
    username TEXT NOT NULL UNIQUE,
    password_hash TEXT NOT NULL,
    role TEXT NOT NULL CHECK (role IN ('admin', 'viewer')),
    created_at TEXT NOT NULL DEFAULT (datetime('now', 'localtime')))`)
  const insert = db.prepare('INSERT OR IGNORE INTO users (username, password_hash, role) VALUES (?, ?, ?)')
  for (const [username, password, role] of SEED_USERS) {
    if (!db.prepare('SELECT 1 FROM users WHERE username = ?').get(username)) {
      insert.run(username, bcrypt.hashSync(password, 10), role)
    }
  }
  ready = true
}

export async function verifyCredentials(username: string, password: string): Promise<SessionUser | null> {
  ensureUsers()
  const row = userDb().prepare('SELECT username, password_hash, role FROM users WHERE username = ?').get(username)
  if (!row || !(await bcrypt.compare(password, String(row.password_hash)))) return null
  return { username: String(row.username), role: row.role as SessionUser['role'] }
}

export async function createSession(user: SessionUser) {
  const token = await encrypt(user)
  ;(await cookies()).set(SESSION_COOKIE, token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    path: '/',
    maxAge: SESSION_HOURS * 3600,
  })
}

export async function deleteSession() {
  ;(await cookies()).delete(SESSION_COOKIE)
}

/** Data Access Layer: baca user dari cookie; arahkan ke /login bila tidak valid. */
export async function getCurrentUser(): Promise<SessionUser> {
  // Verifikasi JWT memakai waktu sekarang, jadi harus dihitung saat request, bukan saat prerender.
  await connection()
  const user = await decrypt((await cookies()).get(SESSION_COOKIE)?.value)
  if (!user) redirect('/login')
  return user
}

export async function requireAdmin(): Promise<SessionUser> {
  const user = await getCurrentUser()
  if (user.role !== 'admin') redirect('/?akses=ditolak')
  return user
}
