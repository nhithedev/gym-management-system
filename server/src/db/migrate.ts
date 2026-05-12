import 'dotenv/config'
import fs from 'node:fs'
import path from 'node:path'
import { db } from '../config/db'
import logger from '../utils/logger'

const MIGRATIONS_DIR = path.resolve(__dirname, 'migrations')

async function ensureMigrationsTable(): Promise<void> {
  await db.query(`
    CREATE TABLE IF NOT EXISTS schema_migrations (
      filename TEXT PRIMARY KEY,
      applied_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    )
  `)
}

async function getAppliedMigrations(): Promise<Set<string>> {
  const result = await db.query<{ filename: string }>(
    'SELECT filename FROM schema_migrations'
  )
  return new Set(result.rows.map((r) => r.filename))
}

function listMigrationFiles(): string[] {
  if (!fs.existsSync(MIGRATIONS_DIR)) return []
  return fs
    .readdirSync(MIGRATIONS_DIR)
    .filter((f) => f.endsWith('.sql'))
    .sort()
}

async function applyMigration(filename: string): Promise<void> {
  const fullPath = path.join(MIGRATIONS_DIR, filename)
  const sql = fs.readFileSync(fullPath, 'utf8')

  const client = await db.connect()
  try {
    await client.query('BEGIN')
    await client.query(sql)
    await client.query(
      'INSERT INTO schema_migrations (filename) VALUES ($1)',
      [filename]
    )
    await client.query('COMMIT')
    logger.info(`Applied migration: ${filename}`)
  } catch (err) {
    await client.query('ROLLBACK')
    throw err
  } finally {
    client.release()
  }
}

async function main(): Promise<void> {
  try {
    await ensureMigrationsTable()
    const applied = await getAppliedMigrations()
    const files = listMigrationFiles()

    if (files.length === 0) {
      logger.info('No migration files found')
      return
    }

    const pending = files.filter((f) => !applied.has(f))
    if (pending.length === 0) {
      logger.info('All migrations are already applied')
      return
    }

    for (const file of pending) {
      await applyMigration(file)
    }

    logger.info(`Applied ${pending.length} migration(s) successfully`)
  } catch (err) {
    logger.error('Migration failed', err)
    process.exitCode = 1
  } finally {
    await db.end()
  }
}

void main()
