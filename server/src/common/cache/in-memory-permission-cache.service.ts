import { Injectable } from '@nestjs/common'
import type { IPermissionCacheProvider } from '../interfaces/permission-cache.interface'

@Injectable()
export class InMemoryPermissionCacheService implements IPermissionCacheProvider {
  private readonly store = new Map<string, { codes: Set<string>; exp: number }>()
  private readonly pendingQueries = new Map<string, Promise<Set<string>>>()

  async get(userId: string): Promise<Set<string> | null> {
    const entry = this.store.get(userId)
    if (!entry || Date.now() > entry.exp) {
      this.store.delete(userId)
      return null
    }
    return entry.codes
  }

  async set(userId: string, codes: Set<string>, ttlMs: number): Promise<void> {
    this.store.set(userId, { codes, exp: Date.now() + ttlMs })
  }

  async delete(userId: string): Promise<void> {
    this.store.delete(userId)
  }

  getPending(userId: string): Promise<Set<string>> | undefined {
    return this.pendingQueries.get(userId)
  }

  setPending(userId: string, promise: Promise<Set<string>>): void {
    this.pendingQueries.set(userId, promise)
    void promise.finally(() => this.pendingQueries.delete(userId))
  }
}
