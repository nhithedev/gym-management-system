/**
 * One-time script: ensure "member" group has all required permissions.
 * Safe to run multiple times (upsert-style — no data is deleted).
 * Run: npx ts-node prisma/fix-member-permissions.ts
 */
import { PrismaClient } from '@prisma/client'

const MEMBER_REQUIRED_PERMISSIONS = [
  'package.read',
  'subscription.read', 'subscription.create', 'subscription.cancel',
  'payment.read', 'payment.create',
  'session.read',
  'attendance.read',
  'progress.read',
  'feedback.read', 'feedback.create',
  'exercise.read',
  'workout_plan.create', 'workout_plan.update', 'workout_plan.delete',
  'workout_log.create', 'workout_log.read', 'workout_log.update',
]

async function main() {
  const prisma = new PrismaClient()

  const group = await prisma.group.findUnique({ where: { name: 'member' } })
  if (!group) { console.error('No group named "member" found'); process.exit(1) }

  const permissions = await prisma.permission.findMany({
    where: { code: { in: MEMBER_REQUIRED_PERMISSIONS } },
  })

  const existing = await prisma.groupPermission.findMany({
    where: { groupId: group.groupId },
    select: { permissionId: true },
  })
  const existingIds = new Set(existing.map(r => r.permissionId.toString()))

  const missing = permissions.filter(p => !existingIds.has(p.permissionId.toString()))
  if (missing.length === 0) {
    console.log('Member group already has all required permissions.')
    await prisma.$disconnect()
    return
  }

  await prisma.groupPermission.createMany({
    data: missing.map(p => ({ groupId: group.groupId, permissionId: p.permissionId })),
    skipDuplicates: true,
  })

  console.log(`Added ${missing.length} missing permission(s) to "member" group:`)
  missing.forEach(p => console.log(`  + ${p.code}`))
  await prisma.$disconnect()
}

main().catch(e => { console.error(e); process.exit(1) })
