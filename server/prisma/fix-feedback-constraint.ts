/**
 * One-time script: relax chk_feedback_subject to allow staff/equipment feedback without subject IDs.
 * Members cannot look up staff/equipment IDs (no permissions), so subject fields must be optional.
 *
 * New rule:
 *   - feedback_type='service'   => subject_staff_id IS NULL AND subject_equipment_id IS NULL
 *   - feedback_type='staff'     => subject_equipment_id IS NULL  (subject_staff_id is now optional)
 *   - feedback_type='equipment' => subject_staff_id IS NULL      (subject_equipment_id is now optional)
 *
 * Run: npx ts-node prisma/fix-feedback-constraint.ts
 */
import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

async function main() {
  await prisma.$executeRawUnsafe(`
    ALTER TABLE feedback DROP CONSTRAINT IF EXISTS chk_feedback_subject
  `)

  await prisma.$executeRawUnsafe(`
    ALTER TABLE feedback ADD CONSTRAINT chk_feedback_subject CHECK (
      (feedback_type = 'service'   AND subject_staff_id IS NULL AND subject_equipment_id IS NULL)
      OR (feedback_type = 'staff'     AND subject_equipment_id IS NULL)
      OR (feedback_type = 'equipment' AND subject_staff_id IS NULL)
    )
  `)

  console.log('Done: chk_feedback_subject updated.')
}

main()
  .catch(e => { console.error(e); process.exit(1) })
  .finally(() => prisma.$disconnect())
