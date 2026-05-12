import 'dotenv/config'
import bcrypt from 'bcryptjs'
import { db } from '../config/db'
import logger from '../utils/logger'

async function seedAdminUser(): Promise<void> {
  const email = process.env.SEED_ADMIN_EMAIL ?? 'admin@gym.local'
  const password = process.env.SEED_ADMIN_PASSWORD ?? 'ChangeMe123!'
  const fullName = process.env.SEED_ADMIN_NAME ?? 'System Admin'

  const passwordHash = await bcrypt.hash(password, 10)

  await db.query(
    `
    INSERT INTO users (email, password_hash, full_name, role, status)
    VALUES ($1, $2, $3, 'admin', 'active')
    ON CONFLICT (email) DO NOTHING
    `,
    [email, passwordHash, fullName]
  )

  logger.info(`Seed admin user ensured: ${email}`)
}

async function main(): Promise<void> {
  try {
    await seedAdminUser()
    logger.info('Seeding completed successfully')
  } catch (err) {
    logger.error('Seeding failed', err)
    process.exitCode = 1
  } finally {
    await db.end()
  }
}

void main()
