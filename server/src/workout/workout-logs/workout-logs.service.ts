import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common'
import { PrismaService } from '../../prisma/prisma.service'
import { AuthenticatedUser } from '../../auth/types/jwt-payload.interface'
import { CreateWorkoutLogDto } from './dto/create-workout-log.dto'
import { UpdateWorkoutLogDto } from './dto/update-workout-log.dto'

@Injectable()
export class WorkoutLogsService {
  constructor(private readonly prisma: PrismaService) {}

  async create(dto: CreateWorkoutLogDto, user: AuthenticatedUser) {
    const member = await this.prisma.member.findFirst({
      where: { userId: user.userId, deletedAt: null },
    })
    if (!member) throw new ForbiddenException('Khong tim thay member profile')

    const assignment = await this.prisma.memberWorkoutPlan.findFirst({
      where: {
        assignmentId: BigInt(dto.assignmentId),
        memberId: member.memberId,
        status: 'active',
      },
    })
    if (!assignment) {
      throw new BadRequestException('Assignment khong active hoac khong thuoc member nay')
    }

    return this.prisma.$transaction(async (tx) => {
      const log = await tx.workoutLog.create({
        data: {
          memberId: member.memberId,
          assignmentId: BigInt(dto.assignmentId),
          planDayId: BigInt(dto.planDayId),
          loggedAt: new Date(dto.loggedAt),
          durationMin: dto.durationMin ?? null,
          notes: dto.notes ?? null,
        },
      })

      if (dto.sets?.length) {
        await tx.workoutLogSet.createMany({
          data: dto.sets.map((s) => ({
            logId: log.logId,
            planExerciseId: BigInt(s.planExerciseId),
            setNumber: s.setNumber,
            actualReps: s.actualReps ?? null,
            actualWeightKg: s.actualWeightKg ?? null,
            actualDurationSec: s.actualDurationSec ?? null,
            completed: s.completed ?? true,
          })),
        })
      }

      return tx.workoutLog.findUnique({
        where: { logId: log.logId },
        include: { sets: true },
      })
    })
  }

  async findAll(user: AuthenticatedUser) {
    const member = await this.prisma.member.findFirst({
      where: { userId: user.userId, deletedAt: null },
    })
    const where: Record<string, unknown> = {}
    if (member) where.memberId = member.memberId

    return this.prisma.workoutLog.findMany({
      where,
      include: {
        planDay: true,
        sets: {
          include: { planExercise: { include: { exercise: true } } },
        },
      },
      orderBy: { loggedAt: 'desc' },
      take: 50,
    })
  }

  async update(id: bigint, dto: UpdateWorkoutLogDto, user: AuthenticatedUser) {
    const log = await this.prisma.workoutLog.findUnique({ where: { logId: id } })
    if (!log) throw new NotFoundException('Workout log khong ton tai')

    const cutoff = new Date(Date.now() - 24 * 60 * 60 * 1000)
    if (log.loggedAt < cutoff) {
      throw new ForbiddenException('Chi duoc sua workout log trong vong 24 gio')
    }

    const member = await this.prisma.member.findFirst({
      where: { userId: user.userId, deletedAt: null },
    })
    if (!member || log.memberId !== member.memberId) {
      throw new ForbiddenException('Khong co quyen sua workout log nay')
    }

    return this.prisma.workoutLog.update({ where: { logId: id }, data: dto })
  }
}
