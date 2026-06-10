import { Injectable, Logger, OnModuleDestroy, OnModuleInit } from '@nestjs/common'
import { Prisma, PrismaClient } from '@prisma/client'
import { getRuntimeDatabaseUrl } from './database-url'

/**
 * Khong goi $connect trong constructor de server van bind duoc port
 * khi PostgreSQL tam thoi khong san sang (health tra ve db: down).
 * Prisma tu dong ket noi khi co query dau tien.
 *
 * onModuleInit chay probe SELECT 1 de phat hien credentials sai som.
 * P1000 (sai credentials) -> fail fast, exit process.
 * P1001/P1002 (network/timeout) -> log warning, tiep tuc (transient).
 */
@Injectable()
export class PrismaService extends PrismaClient implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(PrismaService.name)

  constructor() {
    super({
      datasourceUrl: getRuntimeDatabaseUrl(),
      log:
        process.env.NODE_ENV === 'production'
          ? ['error']
          : ['warn', 'error'],
    })
  }

  async onModuleInit(): Promise<void> {
    try {
      await this.$queryRaw`SELECT 1`
      this.logger.log('Database connection verified')
    } catch (err) {
      const isAuthFailure =
        (err instanceof Prisma.PrismaClientKnownRequestError && err.code === 'P1000') ||
        (err instanceof Prisma.PrismaClientInitializationError &&
          err.message.includes('Authentication failed'))

      if (isAuthFailure) {
        this.logger.error(
          'DATABASE_AUTH_FAILED: Invalid database credentials. Check DATABASE_URL in .env. Exiting.',
        )
        process.exit(1)
      }

      // P1001/P1002/P1008 va cac loi transient khac: log warning, van cho server chay
      const code = err instanceof Prisma.PrismaClientKnownRequestError ? err.code : 'UNKNOWN'
      this.logger.warn(
        `Database probe failed (${code}): server will continue but DB may be unavailable`,
      )
    }
  }

  async onModuleDestroy(): Promise<void> {
    await this.$disconnect()
  }
}
