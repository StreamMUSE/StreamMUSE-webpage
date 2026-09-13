import { existsSync } from 'node:fs'
import postgres from 'postgres'

export function connect() {
  if (existsSync('.env.local')) process.loadEnvFile('.env.local')
  const url = process.env.DATABASE_URL
  if (!url) throw new Error('Set DATABASE_URL in the environment or an untracked .env.local file.')
  return postgres(url, { max: 1, idle_timeout: 5, connect_timeout: 10, prepare: false })
}
