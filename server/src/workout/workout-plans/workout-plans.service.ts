import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common'
import { PrismaService } from '../../prisma/prisma.service'
import { AuthenticatedUser } from '../../auth/types/jwt-payload.interface'
import { CreateWorkoutPlanDto } from './dto/create-workout-plan.dto'
import { UpdateWorkoutPlanDto } from './dto/update-workout-plan.dto'
import { AddPlanDayDto } from './dto/add-plan-day.dto'
import { UpdatePlanDayDto } from './dto/update-plan-day.dto'
import { AddPlanExerciseDto } from './dto/add-plan-exercise.dto'
import { AssignPlanDto } from './dto/assign-plan.dto'

@Injectable()
export class WorkoutPlansService {
  constructor(private readonly prisma: PrismaService) {}

  async findAll(user: AuthenticatedUser) {
    const where: Record<string, unknown> = { deletedAt: null }
    const isTrainer = user.roles.includes('trainer')
    const isMember = user.roles.includes('member') && !user.roles.includes('staff') && !isTrainer

    if (isTrainer) {
      const staff = await this.prisma.staff.findFirst({ where: { userId: user.userId } })
      if (staff) where.creatorStaffId = staff.staffId
    } else if (isMember) {
      const member = await this.prisma.member.findFirst({
        where: { userId: user.userId, deletedAt: null },
      })
      if (member) where.creatorMemberId = member.memberId
    }

    return this.prisma.workoutPlan.findMany({
      where,
      include: {
        days: { include: { exercises: true }, orderBy: { dayNumber: 'asc' } },
      },
      orderBy: { createdAt: 'desc' },
    })
  }

  async create(dto: CreateWorkoutPlanDto, user: AuthenticatedUser) {
    const isStaffOrTrainer =
      user.roles.includes('staff') || user.roles.includes('trainer') || user.roles.includes('owner')

    let creatorStaffId: bigint | null = null
    let creatorMemberId: bigint | null = null

    if (isStaffOrTrainer) {
      const staff = await this.prisma.staff.findFirst({ where: { userId: user.userId } })
      if (staff) creatorStaffId = staff.staffId
    } else {
      const member = await this.prisma.member.findFirst({
        where: { userId: user.userId, deletedAt: null },
      })
      if (!member) throw new ForbiddenException('Khong tim thay member profile')
      creatorMemberId = member.memberId
    }

    return this.prisma.workoutPlan.create({
      data: {
        name: dto.name,
        description: dto.description ?? null,
        creatorType: isStaffOrTrainer ? 'staff' : 'member',
        creatorStaffId,
        creatorMemberId,
        status: 'draft',
      },
    })
  }

  async findOne(id: bigint) {
    const plan = await this.prisma.workoutPlan.findFirst({
      where: { planId: id, deletedAt: null },
      include: {
        days: {
          orderBy: { dayNumber: 'asc' },
          include: {
            exercises: {
              orderBy: { orderIndex: 'asc' },
              include: { exercise: true },
            },
          },
        },
      },
    })
    if (!plan) throw new NotFoundException(`WorkoutPlan ${id} khong ton tai`)
    return plan
  }

  async update(id: bigint, dto: UpdateWorkoutPlanDto) {
    await this.findOne(id)
    const hasLogs = await this.prisma.workoutLog.findFirst({
      where: { assignment: { planId: id } },
    })
    if (hasLogs) throw new ConflictException('Plan da co workout log — khong the sua template')
    return this.prisma.workoutPlan.update({ where: { planId: id }, data: dto })
  }

  async softDelete(id: bigint) {
    await this.findOne(id)
    const activeAssignment = await this.prisma.memberWorkoutPlan.findFirst({
      where: { planId: id, status: 'active' },
    })
    if (activeAssignment) {
      throw new ConflictException('Plan dang duoc assign active — khong the xoa')
    }
    return this.prisma.workoutPlan.update({
      where: { planId: id },
      data: { deletedAt: new Date() },
    })
  }

  async addDay(planId: bigint, dto: AddPlanDayDto) {
    await this.findOne(planId)
    return this.prisma.workoutPlanDay.create({
      data: {
        planId,
        dayNumber: dto.dayNumber,
        name: dto.name,
        notes: dto.notes ?? null,
      },
    })
  }

  async updateDay(planDayId: bigint, dto: UpdatePlanDayDto) {
    const day = await this.prisma.workoutPlanDay.findUnique({ where: { planDayId } })
    if (!day) throw new NotFoundException(`WorkoutPlanDay ${planDayId} khong ton tai`)
    return this.prisma.workoutPlanDay.update({ where: { planDayId }, data: dto })
  }

  async deleteDay(planDayId: bigint) {
    const day = await this.prisma.workoutPlanDay.findUnique({ where: { planDayId } })
    if (!day) throw new NotFoundException(`WorkoutPlanDay ${planDayId} khong ton tai`)
    await this.prisma.workoutPlanDay.delete({ where: { planDayId } })
  }

  async addExercise(planDayId: bigint, dto: AddPlanExerciseDto) {
    const day = await this.prisma.workoutPlanDay.findUnique({ where: { planDayId } })
    if (!day) throw new NotFoundException(`WorkoutPlanDay ${planDayId} khong ton tai`)
    return this.prisma.workoutPlanExercise.create({
      data: {
        planDayId,
        exerciseId: BigInt(dto.exerciseId),
        orderIndex: dto.orderIndex,
        targetSets: dto.targetSets,
        targetReps: dto.targetReps ?? null,
        targetDurationSec: dto.targetDurationSec ?? null,
        targetWeightKg: dto.targetWeightKg ?? null,
        restSeconds: dto.restSeconds ?? 60,
        notes: dto.notes ?? null,
      },
    })
  }

  async removePlanExercise(planExerciseId: bigint) {
    const pe = await this.prisma.workoutPlanExercise.findUnique({ where: { planExerciseId } })
    if (!pe) throw new NotFoundException(`WorkoutPlanExercise ${planExerciseId} khong ton tai`)
    await this.prisma.workoutPlanExercise.delete({ where: { planExerciseId } })
  }

  async assignPlan(memberId: bigint, dto: AssignPlanDto, actorStaffId: bigint | null) {
    const plan = await this.prisma.workoutPlan.findFirst({
      where: { planId: BigInt(dto.planId), deletedAt: null },
    })
    if (!plan) throw new NotFoundException('Plan khong ton tai')

    const dayCount = await this.prisma.workoutPlanDay.count({ where: { planId: plan.planId } })
    if (dayCount === 0) throw new BadRequestException('Plan chua co ngay tap nao')

    return this.prisma.$transaction(async (tx) => {
      await tx.memberWorkoutPlan.updateMany({
        where: { memberId, status: 'active' },
        data: { status: 'replaced', endedAt: new Date() },
      })
      return tx.memberWorkoutPlan.create({
        data: {
          memberId,
          planId: plan.planId,
          assignedByStaffId: actorStaffId,
          startDate: new Date(dto.startDate),
          status: 'active',
          notes: dto.notes ?? null,
        },
      })
    })
  }
}
