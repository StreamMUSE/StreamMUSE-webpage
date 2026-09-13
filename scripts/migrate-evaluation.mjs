import { readdir, readFile } from 'node:fs/promises'
import { createHash } from 'node:crypto'
import { fileURLToPath } from 'node:url'
import { connect } from './evaluation-db.mjs'

const sql = connect()
try {
  const directory = fileURLToPath(new URL('../db/migrations/', import.meta.url))
  await sql.begin(async tx => {
    await tx`SELECT pg_advisory_xact_lock(20260907, 1)`
    await tx`CREATE TABLE IF NOT EXISTS evaluation_schema_migrations (name text PRIMARY KEY, sha256 text NOT NULL, applied_at timestamptz NOT NULL DEFAULT now())`
    for (const name of (await readdir(directory)).filter(file => /^\d+.*\.sql$/.test(file)).sort()) {
      const body = await readFile(`${directory}/${name}`, 'utf8')
      const sha256 = createHash('sha256').update(body).digest('hex')
      const existing = await tx`SELECT sha256 FROM evaluation_schema_migrations WHERE name = ${name}`
      if (existing.length) {
        if (existing[0].sha256 !== sha256) throw new Error(`Applied migration changed: ${name}. Create a new migration instead.`)
        console.log(`Already applied: ${name}`)
        continue
      }
      await tx.unsafe(body)
      await tx`INSERT INTO evaluation_schema_migrations (name, sha256) VALUES (${name}, ${sha256})`
      console.log(`Applied: ${name}`)
    }
  })
} catch (error) {
  console.error('Migration failed:', error.code || error.name)
  process.exitCode = 1
} finally { await sql.end() }
