import 'server-only'
import path from 'node:path'
import { DatabaseSync } from 'node:sqlite'

// Data warehouse hasil ETL Pentaho (hanya dibaca).
const DW_PATH = process.env.DW_PATH ?? path.join(process.cwd(), '..', 'pentaho_sederhana', 'manufaktur.sqlite')
// Akun login dashboard.
const USER_DB_PATH = process.env.USER_DB_PATH ?? path.join(process.cwd(), 'data', 'users.sqlite')

let dw: DatabaseSync | undefined
let users: DatabaseSync | undefined

export function warehouse(): DatabaseSync {
  dw ??= new DatabaseSync(DW_PATH, { readOnly: true })
  return dw
}

export function userDb(): DatabaseSync {
  users ??= new DatabaseSync(USER_DB_PATH)
  return users
}
