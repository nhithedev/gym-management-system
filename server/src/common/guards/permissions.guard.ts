import { CanActivate, ExecutionContext, ForbiddenException, Injectable } from '@nestjs/common'
import { Reflector } from '@nestjs/core'
import { PrismaService } from '../../prisma/prisma.service'
import { AuthenticatedUser } from '../../auth/types/jwt-payload.interface'
import { PERMISSION_KEY } from '../decorators/require-permission.decorator'

/** Cache user permissions 60s de tranh DB lookup moi request. */
const permCache = new Map<string, { codes: Set<string>; exp: number }>()
/** Single-flight: neu co query dang chay cho user nay, dung chung promise thay vi tao query moi. */
const pendingQueries = new Map<string, Promise<Set<string>>>()
const CACHE_TTL_MS = 60_000

@Injectable()
export class PermissionsGuard implements CanActivate {
  constructor(
    private readonly reflector: Reflector,
    private readonly prisma: PrismaService
  ) {}

  async canActivate(ctx: ExecutionContext): Promise<boolean> {
    const required = this.reflector.getAllAndOverride<string | undefined>(PERMISSION_KEY, [
      ctx.getHandler(),
      ctx.getClass(),
    ])
    if (!required) return true

    const req = ctx.switchToHttp().getRequest<{ user: AuthenticatedUser }>()
    const user = req.user
    if (!user) return false

    const codes = await this.getUserPermissions(user.userId)
    if (!codes.has(required))
      throw new ForbiddenException({
        success: false,
        code: 'FORBIDDEN',
        message: `Cần quyền: ${required}`,
      })
    return true
  }

  private async getUserPermissions(userId: bigint): Promise<Set<string>> {
    const key = userId.toString()
    const cached = permCache.get(key)
    if (cached && cached.exp > Date.now()) return cached.codes

    // Neu da co query dang in-flight cho user nay, doi ket qua cua no
    const pending = pendingQueries.get(key)
    if (pending) return pending

    const promise = this.fetchPermissions(userId, key)
    pendingQueries.set(key, promise)
    try {
      return await promise
    } finally {
      pendingQueries.delete(key)
    }
  }

  private async fetchPermissions(userId: bigint, key: string): Promise<Set<string>> {
    const rows = await this.prisma.userGroup.findMany({
      where: { userId },
      include: {
        group: {
          include: { permissions: { include: { permission: true } } },
        },
      },
    })

    const codes = new Set<string>()
    for (const ug of rows) {
      for (const gp of ug.group.permissions) {
        codes.add(gp.permission.code)
      }
    }

    permCache.set(key, { codes, exp: Date.now() + CACHE_TTL_MS })
    return codes
  }
}

/** Xoa cache cua 1 user khi quyen duoc thay doi. */
export function invalidatePermCache(userId: bigint) {
  permCache.delete(userId.toString())
}
