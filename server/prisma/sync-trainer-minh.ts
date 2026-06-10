import {
  PlanCreatorType,
  PrismaClient,
  TrainingSessionStatus,
  WorkoutPlanStatus,
} from '@prisma/client'
import { getRuntimeDatabaseUrl } from '../src/prisma/database-url'
import {
  EXERCISE_LIBRARY,
  TRAINER_MINH_FOUR_WEEK_PLAN,
} from './trainer-minh-content'

const prisma = new PrismaClient({ datasourceUrl: getRuntimeDatabaseUrl() })

async function syncExerciseLibrary() {
  for (const definition of EXERCISE_LIBRARY) {
    const existing = await prisma.exercise.findFirst({
      where: { name: definition.name, deletedAt: null },
      select: { exerciseId: true },
    })

    if (existing) {
      await prisma.exercise.update({
        where: { exerciseId: existing.exerciseId },
        data: definition,
      })
    } else {
      await prisma.exercise.create({ data: definition })
    }
  }
}

async function assignStudentsAndSessions(trainerStaffId: bigint) {
  await prisma.member.updateMany({
    where: { primaryTrainerId: null, deletedAt: null },
    data: { primaryTrainerId: trainerStaffId },
  })

  const students = await prisma.member.findMany({
    where: { primaryTrainerId: trainerStaffId, deletedAt: null },
    select: { memberId: true, memberCode: true },
    orderBy: { memberCode: 'asc' },
  })
  const room = await prisma.gymRoom.findFirst({
    orderBy: { roomId: 'asc' },
    select: { roomId: true },
  })

  if (!room) return students

  const slots = [
    '2026-06-11T07:00:00+07:00',
    '2026-06-11T17:30:00+07:00',
    '2026-06-12T08:00:00+07:00',
    '2026-06-12T18:00:00+07:00',
    '2026-06-13T09:00:00+07:00',
    '2026-06-15T07:00:00+07:00',
    '2026-06-15T17:30:00+07:00',
    '2026-06-16T08:00:00+07:00',
    '2026-06-16T18:00:00+07:00',
    '2026-06-17T09:00:00+07:00',
    '2026-06-18T07:00:00+07:00',
    '2026-06-18T17:30:00+07:00',
  ]

  for (const [index, student] of students.entries()) {
    const startTime = new Date(slots[index % slots.length])
    const endTime = new Date(startTime.getTime() + 60 * 60 * 1000)
    const exists = await prisma.trainingSession.findFirst({
      where: {
        memberId: student.memberId,
        trainerStaffId,
        startTime,
        deletedAt: null,
      },
      select: { sessionId: true },
    })
    if (exists) continue

    await prisma.trainingSession.create({
      data: {
        memberId: student.memberId,
        trainerStaffId,
        roomId: room.roomId,
        startTime,
        endTime,
        status: TrainingSessionStatus.scheduled,
      },
    })
  }

  return students
}

async function syncPlan(trainerStaffId: bigint) {
  const plan = await prisma.workoutPlan.findUnique({
    where: { planId: 1n },
    select: { planId: true },
  })
  if (!plan) {
    throw new Error('Khong tim thay workout plan 1 de dong bo')
  }

  const logCount = await prisma.workoutLog.count({
    where: { assignment: { planId: plan.planId } },
  })
  if (logCount > 0) {
    throw new Error('Workout plan 1 da co workout log, khong the ghi de cau truc')
  }

  const exercises = await prisma.exercise.findMany({
    where: {
      name: {
        in: [...new Set(
          TRAINER_MINH_FOUR_WEEK_PLAN.flatMap((day) =>
            day.exercises.map((exercise) => exercise.name),
          ),
        )],
      },
      deletedAt: null,
    },
    select: { exerciseId: true, name: true },
  })
  const exerciseMap = new Map(exercises.map((exercise) => [exercise.name, exercise.exerciseId]))

  await prisma.$transaction(async (tx) => {
    await tx.workoutPlan.update({
      where: { planId: plan.planId },
      data: {
        creatorStaffId: trainerStaffId,
        creatorMemberId: null,
        creatorType: PlanCreatorType.staff,
        name: 'Giáo án nền tảng 4 tuần',
        description:
          'Lịch 3 buổi mỗi tuần, tăng tải có kiểm soát. Mỗi bài ghi rõ set, rep, thời gian tập và thời gian nghỉ.',
        status: WorkoutPlanStatus.draft,
        deletedAt: null,
      },
    })

    await tx.workoutPlanDay.deleteMany({ where: { planId: plan.planId } })

    for (const dayDefinition of TRAINER_MINH_FOUR_WEEK_PLAN) {
      const day = await tx.workoutPlanDay.create({
        data: {
          planId: plan.planId,
          weekNumber: dayDefinition.weekNumber,
          dayOfWeek: dayDefinition.dayOfWeek,
          dayNumber: dayDefinition.dayNumber,
          name: dayDefinition.name,
          notes: dayDefinition.notes,
        },
      })

      await tx.workoutPlanExercise.createMany({
        data: dayDefinition.exercises.map((exercise, index) => {
          const exerciseId = exerciseMap.get(exercise.name)
          if (!exerciseId) {
            throw new Error(`Khong tim thay exercise: ${exercise.name}`)
          }
          return {
            planDayId: day.planDayId,
            exerciseId,
            orderIndex: index + 1,
            targetSets: exercise.sets,
            targetReps: exercise.reps ?? null,
            targetDurationSec: exercise.durationSec,
            targetWeightKg: exercise.weightKg ?? null,
            restSeconds: exercise.restSec,
            notes: exercise.notes,
          }
        }),
      })
    }

    await tx.workoutPlan.update({
      where: { planId: plan.planId },
      data: { status: WorkoutPlanStatus.active },
    })
  })
}

async function main() {
  const trainer = await prisma.user.findUnique({
    where: { email: 'trainer.minh@gym.local' },
    include: { staff: true },
  })
  if (!trainer?.staff) {
    throw new Error('Khong tim thay staff profile cua trainer.minh@gym.local')
  }

  await syncExerciseLibrary()
  const students = await assignStudentsAndSessions(trainer.staff.staffId)
  await syncPlan(trainer.staff.staffId)

  const [sessionCount, exerciseCount, plan] = await Promise.all([
    prisma.trainingSession.count({
      where: { trainerStaffId: trainer.staff.staffId, deletedAt: null },
    }),
    prisma.exercise.count({ where: { deletedAt: null } }),
    prisma.workoutPlan.findUnique({
      where: { planId: 1n },
      select: {
        planId: true,
        days: {
          select: { planDayId: true, exercises: { select: { planExerciseId: true } } },
        },
      },
    }),
  ])

  console.log({
    trainer: trainer.email,
    students: students.length,
    sessions: sessionCount,
    exercises: exerciseCount,
    planDays: plan?.days.length ?? 0,
    planExercises:
      plan?.days.reduce((total, day) => total + day.exercises.length, 0) ?? 0,
  })
}

main()
  .catch((error) => {
    console.error(error)
    process.exitCode = 1
  })
  .finally(async () => {
    await prisma.$disconnect()
  })
