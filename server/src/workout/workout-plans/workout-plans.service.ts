import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common'
import {
  PlanCreatorType,
  Prisma,
  WorkoutAssignmentStatus,
  WorkoutPlanStatus,
} from '@prisma/client'
import { AuthenticatedUser } from '../../auth/types/jwt-payload.interface'
import { AuditService } from '../../common/audit/audit.service'
import { PrismaService } from '../../prisma/prisma.service'
import { AddPlanDayDto } from './dto/add-plan-day.dto'
import { AddPlanExerciseDto } from './dto/add-plan-exercise.dto'
import { AssignPlanDto } from './dto/assign-plan.dto'
import { CreateWorkoutPlanDto } from './dto/create-workout-plan.dto'
import { UpdatePlanDayDto } from './dto/update-plan-day.dto'
import { UpdateWorkoutPlanDto } from './dto/update-workout-plan.dto'

const PLAN_DETAIL_INCLUDE = {
  days: {
    orderBy: { dayNumber: 'asc' },
    include: {
      exercises: {
        orderBy: { orderIndex: 'asc' },
        include: {
          exercise: true,
        },
      },
    },
  },
} satisfies Prisma.WorkoutPlanInclude

@Injectable()
export class WorkoutPlansService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly audit: AuditService,
  ) {}

  async findAll(user: AuthenticatedUser) {
    const where: Prisma.WorkoutPlanWhereInput = { deletedAt: null }

    if (this.isMemberOnly(user)) {
      const memberId = await this.resolveCallerMemberId(user)
      if (!memberId) {
        throw new ForbiddenException('Khong tim thay member profile')
      }
      where.creatorMemberId = memberId
    } else if (this.isTrainerOnly(user)) {
      const staffId = await this.resolveCallerStaffId(user)
      if (!staffId) {
        throw new ForbiddenException('Khong tim thay staff profile')
      }
      where.creatorStaffId = staffId
    }

    return this.prisma.workoutPlan.findMany({
      where,
      include: PLAN_DETAIL_INCLUDE,
      orderBy: { createdAt: 'desc' },
    })
  }

  async findOne(id: bigint) {
    return this.getPlanOrThrow(id)
  }

  async create(dto: CreateWorkoutPlanDto, user: AuthenticatedUser) {
    const isMemberOnly = this.isMemberOnly(user)
    const creatorType = isMemberOnly ? PlanCreatorType.member : PlanCreatorType.staff
    const creatorStaffId = isMemberOnly ? null : await this.resolveCallerStaffId(user)
    const creatorMemberId = isMemberOnly ? await this.resolveCallerMemberId(user) : null

    if (isMemberOnly && !creatorMemberId) {
      throw new ForbiddenException('Khong tim thay member profile')
    }

    const plan = await this.prisma.workoutPlan.create({
      data: {
        name: dto.name,
        description: dto.description ?? null,
        creatorType,
        creatorStaffId,
        creatorMemberId,
        status: WorkoutPlanStatus.draft,
      },
      include: PLAN_DETAIL_INCLUDE,
    })

    await this.audit.log({
      actorUserId: user.userId,
      action: 'workout_plan.create',
      resourceType: 'workout_plan',
      resourceId: plan.planId.toString(),
      afterData: {
        planId: plan.planId.toString(),
        name: plan.name,
        creatorType: plan.creatorType,
      },
    })

    return plan
  }

  async update(id: bigint, dto: UpdateWorkoutPlanDto, user: AuthenticatedUser) {
    const plan = await this.getPlanOrThrow(id)
    await this.assertCanMutatePlan(plan, user)
    await this.assertPlanHasNoLogs(id)

    if (dto.status) {
      this.assertValidStatusTransition(plan.status, dto.status, plan.planId)
      if (dto.status === WorkoutPlanStatus.active) {
        const dayCount = await this.prisma.workoutPlanDay.count({ where: { planId: id } })
        if (dayCount === 0) {
          throw new BadRequestException('Plan chua co ngay tap nao')
        }
      }
      if (dto.status === WorkoutPlanStatus.archived && plan.status === WorkoutPlanStatus.active) {
        const activeAssignment = await this.prisma.memberWorkoutPlan.findFirst({
          where: { planId: id, status: WorkoutAssignmentStatus.active },
          select: { assignmentId: true },
        })
        if (activeAssignment) {
          throw new ConflictException('Plan dang co assignment active')
        }
      }
    }

    const before = {
      planId: plan.planId.toString(),
      name: plan.name,
      description: plan.description,
      status: plan.status,
    }

    const updated = await this.prisma.workoutPlan.update({
      where: { planId: id },
      data: {
        ...(dto.name !== undefined ? { name: dto.name } : {}),
        ...(dto.description !== undefined ? { description: dto.description ?? null } : {}),
        ...(dto.status !== undefined ? { status: dto.status } : {}),
      },
      include: PLAN_DETAIL_INCLUDE,
    })

    await this.audit.log({
      actorUserId: user.userId,
      action: 'workout_plan.update',
      resourceType: 'workout_plan',
      resourceId: id.toString(),
      beforeData: before,
      afterData: {
        planId: updated.planId.toString(),
        name: updated.name,
        description: updated.description,
        status: updated.status,
      },
    })

    return updated
  }

  async softDelete(id: bigint, user: AuthenticatedUser) {
    const plan = await this.getPlanOrThrow(id)
    await this.assertCanMutatePlan(plan, user)

    const activeAssignment = await this.prisma.memberWorkoutPlan.findFirst({
      where: { planId: id, status: WorkoutAssignmentStatus.active },
      select: { assignmentId: true },
    })
    if (activeAssignment) {
      throw new ConflictException('Plan dang duoc assign active - khong the xoa')
    }

    const deleted = await this.prisma.workoutPlan.update({
      where: { planId: id },
      data: { deletedAt: new Date() },
      include: PLAN_DETAIL_INCLUDE,
    })

    await this.audit.log({
      actorUserId: user.userId,
      action: 'workout_plan.delete',
      resourceType: 'workout_plan',
      resourceId: id.toString(),
      afterData: { planId: id.toString() },
    })

    return deleted
  }

  async addDay(planId: bigint, dto: AddPlanDayDto, user: AuthenticatedUser) {
    const plan = await this.getPlanOrThrow(planId)
    await this.assertCanMutatePlan(plan, user)
    await this.assertPlanHasNoLogs(planId)

    try {
      const day = await this.prisma.workoutPlanDay.create({
        data: {
          planId,
          dayNumber: dto.dayNumber,
          name: dto.name,
          notes: dto.notes ?? null,
        },
      })

      await this.audit.log({
        actorUserId: user.userId,
        action: 'workout_plan.update',
        resourceType: 'workout_plan',
        resourceId: planId.toString(),
        afterData: {
          planId: planId.toString(),
          dayId: day.planDayId.toString(),
          dayNumber: day.dayNumber,
        },
      })

      return day
    } catch (error: any) {
      if (error?.code === 'P2002') {
        throw new ConflictException('dayNumber da ton tai trong plan')
      }
      throw error
    }
  }

  async updateDay(planId: bigint, planDayId: bigint, dto: UpdatePlanDayDto, user: AuthenticatedUser) {
    const day = await this.prisma.workoutPlanDay.findFirst({
      where: { planDayId, planId },
      include: { plan: true },
    })
    if (!day || day.plan.deletedAt) {
      throw new NotFoundException(`WorkoutPlanDay ${planDayId} khong ton tai`)
    }

    await this.assertCanMutatePlan(day.plan, user)
    await this.assertPlanHasNoLogs(planId)

    const updated = await this.prisma.workoutPlanDay.update({
      where: { planDayId },
      data: {
        ...(dto.name !== undefined ? { name: dto.name } : {}),
        ...(dto.notes !== undefined ? { notes: dto.notes ?? null } : {}),
      },
    })

    await this.audit.log({
      actorUserId: user.userId,
      action: 'workout_plan.update',
      resourceType: 'workout_plan',
      resourceId: planId.toString(),
      afterData: {
        planId: planId.toString(),
        dayId: planDayId.toString(),
        changedFields: Object.keys(dto),
      },
    })

    return updated
  }

  async deleteDay(planId: bigint, planDayId: bigint, user: AuthenticatedUser) {
    const day = await this.prisma.workoutPlanDay.findFirst({
      where: { planDayId, planId },
      include: { plan: true },
    })
    if (!day || day.plan.deletedAt) {
      throw new NotFoundException(`WorkoutPlanDay ${planDayId} khong ton tai`)
    }

    await this.assertCanMutatePlan(day.plan, user)
    await this.assertPlanHasNoLogs(planId)

    await this.prisma.workoutPlanDay.delete({ where: { planDayId } })

    await this.audit.log({
      actorUserId: user.userId,
      action: 'workout_plan.update',
      resourceType: 'workout_plan',
      resourceId: planId.toString(),
      afterData: {
        planId: planId.toString(),
        dayId: planDayId.toString(),
        deleted: true,
      },
    })
  }

  async addExercise(planId: bigint, planDayId: bigint, dto: AddPlanExerciseDto, user: AuthenticatedUser) {
    const day = await this.prisma.workoutPlanDay.findFirst({
      where: { planDayId, planId },
      include: { plan: true },
    })
    if (!day || day.plan.deletedAt) {
      throw new NotFoundException(`WorkoutPlanDay ${planDayId} khong ton tai`)
    }

    await this.assertCanMutatePlan(day.plan, user)
    await this.assertPlanHasNoLogs(planId)

    const exercise = await this.prisma.exercise.findFirst({
      where: { exerciseId: BigInt(dto.exerciseId), deletedAt: null },
      select: { exerciseId: true },
    })
    if (!exercise) {
      throw new NotFoundException(`Exercise ${dto.exerciseId} khong ton tai`)
    }

    try {
      const created = await this.prisma.workoutPlanExercise.create({
        data: {
          planDayId,
          exerciseId: exercise.exerciseId,
          orderIndex: dto.orderIndex,
          targetSets: dto.targetSets,
          targetReps: dto.targetReps ?? null,
          targetDurationSec: dto.targetDurationSec ?? null,
          targetWeightKg: dto.targetWeightKg ?? null,
          restSeconds: dto.restSeconds ?? 60,
          notes: dto.notes ?? null,
        },
        include: { exercise: true },
      })

      await this.audit.log({
        actorUserId: user.userId,
        action: 'workout_plan.update',
        resourceType: 'workout_plan',
        resourceId: planId.toString(),
        afterData: {
          planId: planId.toString(),
          dayId: planDayId.toString(),
          planExerciseId: created.planExerciseId.toString(),
        },
      })

      return created
    } catch (error: any) {
      if (error?.code === 'P2002') {
        throw new ConflictException('orderIndex da ton tai trong day')
      }
      throw error
    }
  }

  async removePlanExercise(planId: bigint, planDayId: bigint, planExerciseId: bigint, user: AuthenticatedUser) {
    const pe = await this.prisma.workoutPlanExercise.findFirst({
      where: { planExerciseId, planDayId },
      include: {
        planDay: {
          include: { plan: true },
        },
      },
    })
    if (!pe || pe.planDay.plan.deletedAt || pe.planDay.plan.planId !== planId) {
      throw new NotFoundException(`WorkoutPlanExercise ${planExerciseId} khong ton tai`)
    }

    await this.assertCanMutatePlan(pe.planDay.plan, user)
    await this.assertPlanHasNoLogs(planId)

    try {
      await this.prisma.workoutPlanExercise.delete({ where: { planExerciseId } })
      await this.audit.log({
        actorUserId: user.userId,
        action: 'workout_plan.update',
        resourceType: 'workout_plan',
        resourceId: planId.toString(),
        afterData: {
          planId: planId.toString(),
          dayId: planDayId.toString(),
          planExerciseId: planExerciseId.toString(),
          deleted: true,
        },
      })
    } catch (error: any) {
      if (error?.code === 'P2003') {
        throw new ConflictException('WorkoutPlanExercise dang duoc tham chieu boi workout log')
      }
      throw error
    }
  }

  async listAssignments(
    memberId: bigint,
    params: { status?: string; limit?: number },
    caller: AuthenticatedUser,
  ) {
    const isMemberOnly = this.isMemberOnly(caller)
    if (isMemberOnly) {
      const callerMemberId = await this.resolveCallerMemberId(caller)
      if (callerMemberId !== memberId) {
        throw new ForbiddenException('Khong co quyen xem assignments cua member khac')
      }
    }

    const where: Prisma.MemberWorkoutPlanWhereInput = { memberId }
    if (params.status && this.isAssignmentStatus(params.status)) {
      where.status = params.status as WorkoutAssignmentStatus
    }

    const data = await this.prisma.memberWorkoutPlan.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      take: params.limit ?? 20,
      include: {
        plan: {
          select: {
            planId: true,
            name: true,
            description: true,
            status: true,
            days: {
              select: { planDayId: true, dayNumber: true, name: true },
              orderBy: { dayNumber: 'asc' },
            },
          },
        },
      },
    })

    return {
      data: data.map((a) => ({
        assignmentId: a.assignmentId.toString(),
        memberId: a.memberId.toString(),
        planId: a.planId.toString(),
        assignedByStaffId: a.assignedByStaffId?.toString() ?? null,
        startDate: a.startDate,
        status: a.status,
        endedAt: a.endedAt,
        notes: a.notes,
        createdAt: a.createdAt,
        plan: a.plan
          ? {
              planId: a.plan.planId.toString(),
              name: a.plan.name,
              description: a.plan.description,
              status: a.plan.status,
              days: a.plan.days.map((d) => ({
                planDayId: d.planDayId.toString(),
                dayNumber: d.dayNumber,
                name: d.name,
              })),
            }
          : null,
      })),
    }
  }

  async assignPlan(memberId: bigint, dto: AssignPlanDto, caller: AuthenticatedUser) {
    const member = await this.prisma.member.findFirst({
      where: { memberId, deletedAt: null },
      select: { memberId: true },
    })
    if (!member) {
      throw new NotFoundException('Member khong ton tai')
    }

    const plan = await this.prisma.workoutPlan.findFirst({
      where: { planId: BigInt(dto.planId), deletedAt: null },
      select: { planId: true, status: true },
    })
    if (!plan) {
      throw new NotFoundException('Plan khong ton tai')
    }
    if (plan.status !== WorkoutPlanStatus.active) {
      throw new BadRequestException('PLAN_NOT_ACTIVE')
    }

    const dayCount = await this.prisma.workoutPlanDay.count({ where: { planId: plan.planId } })
    if (dayCount === 0) {
      throw new BadRequestException('Plan chua co ngay tap nao')
    }

    const assignedByStaffId = await this.resolveCallerStaffId(caller)
    const startDate = this.parseDateOnly(dto.startDate)

    const result = await this.prisma.$transaction(async (tx) => {
      const lockedAssignments = await tx.$queryRaw<Array<{ assignmentId: bigint }>>`
        SELECT assignment_id AS "assignmentId"
        FROM member_workout_plans
        WHERE member_id = ${memberId} AND status = 'active'
        FOR UPDATE
      `

      const replacedAssignmentId = lockedAssignments[0]?.assignmentId ?? null
      if (lockedAssignments.length > 0) {
        await tx.memberWorkoutPlan.updateMany({
          where: {
            assignmentId: { in: lockedAssignments.map((row) => row.assignmentId) },
          },
          data: {
            status: WorkoutAssignmentStatus.replaced,
            endedAt: new Date(),
          },
        })
      }

      const assignment = await tx.memberWorkoutPlan.create({
        data: {
          memberId,
          planId: plan.planId,
          assignedByStaffId,
          startDate,
          status: WorkoutAssignmentStatus.active,
          notes: dto.notes ?? null,
        },
      })

      return { assignment, replacedAssignmentId }
    })

    await this.audit.log({
      actorUserId: caller.userId,
      action: 'workout_plan.assign',
      resourceType: 'workout_plan_assignment',
      resourceId: result.assignment.assignmentId.toString(),
      afterData: {
        assignmentId: result.assignment.assignmentId.toString(),
        memberId: memberId.toString(),
        planId: plan.planId.toString(),
        replacedAssignmentId: result.replacedAssignmentId?.toString() ?? null,
      },
    })

    return result.assignment
  }

  private async getPlanOrThrow(id: bigint) {
    const plan = await this.prisma.workoutPlan.findFirst({
      where: { planId: id, deletedAt: null },
      include: PLAN_DETAIL_INCLUDE,
    })
    if (!plan) {
      throw new NotFoundException(`WorkoutPlan ${id} khong ton tai`)
    }
    return plan
  }

  private async assertPlanHasNoLogs(planId: bigint) {
    const hasLog = await this.prisma.workoutLog.findFirst({
      where: { assignment: { planId } },
      select: { logId: true },
    })
    if (hasLog) {
      throw new ConflictException('Plan da co workout log - khong the sua')
    }
  }

  private async assertCanMutatePlan(plan: { creatorType: PlanCreatorType; creatorMemberId: bigint | null }, caller: AuthenticatedUser) {
    if (plan.creatorType === PlanCreatorType.staff) {
      return
    }

    const callerMemberId = await this.resolveCallerMemberId(caller)
    if (!callerMemberId || plan.creatorMemberId !== callerMemberId) {
      throw new ForbiddenException('Khong co quyen sua plan nay')
    }
  }

  private assertValidStatusTransition(
    currentStatus: WorkoutPlanStatus,
    nextStatus: WorkoutPlanStatus,
    planId: bigint,
  ) {
    if (currentStatus === nextStatus) {
      return
    }

    if (currentStatus === WorkoutPlanStatus.archived) {
      throw new BadRequestException('INVALID_TRANSITION')
    }

    if (nextStatus === WorkoutPlanStatus.active) {
      // handled below
    } else if (nextStatus !== WorkoutPlanStatus.archived && nextStatus !== WorkoutPlanStatus.draft) {
      throw new BadRequestException('INVALID_TRANSITION')
    }

    if (currentStatus === WorkoutPlanStatus.draft && nextStatus === WorkoutPlanStatus.active) {
      void planId
      // no-op here, day count checked by caller
      return
    }

    if (currentStatus === WorkoutPlanStatus.active && nextStatus === WorkoutPlanStatus.archived) {
      return
    }

    if (currentStatus === WorkoutPlanStatus.draft && nextStatus === WorkoutPlanStatus.archived) {
      return
    }

    if (currentStatus === WorkoutPlanStatus.active && nextStatus === WorkoutPlanStatus.draft) {
      throw new BadRequestException('INVALID_TRANSITION')
    }

    if (currentStatus === WorkoutPlanStatus.draft && nextStatus === WorkoutPlanStatus.draft) {
      return
    }

    throw new BadRequestException('INVALID_TRANSITION')
  }

  private async resolveCallerStaffId(user: AuthenticatedUser): Promise<bigint | null> {
    if (user.staffId) {
      return user.staffId
    }

    const staff = await this.prisma.staff.findFirst({
      where: { userId: user.userId, deletedAt: null },
      select: { staffId: true },
    })
    return staff?.staffId ?? null
  }

  private async resolveCallerMemberId(user: AuthenticatedUser): Promise<bigint | null> {
    if (user.memberId) {
      return user.memberId
    }

    const member = await this.prisma.member.findFirst({
      where: { userId: user.userId, deletedAt: null },
      select: { memberId: true },
    })
    return member?.memberId ?? null
  }

  private isMemberOnly(user: AuthenticatedUser): boolean {
    return user.roles.includes('member')
      && !user.roles.includes('staff')
      && !user.roles.includes('trainer')
      && !user.roles.includes('owner')
  }

  private isTrainerOnly(user: AuthenticatedUser): boolean {
    return user.roles.includes('trainer')
      && !user.roles.includes('staff')
      && !user.roles.includes('owner')
  }

  private isAssignmentStatus(value: string): value is WorkoutAssignmentStatus {
    return value === WorkoutAssignmentStatus.active
      || value === WorkoutAssignmentStatus.completed
      || value === WorkoutAssignmentStatus.replaced
  }

  private parseDateOnly(value: string): Date {
    return new Date(`${value}T00:00:00+07:00`)
  }
}
