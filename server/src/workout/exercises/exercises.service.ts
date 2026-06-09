import { ConflictException, Injectable, NotFoundException } from '@nestjs/common'
import { AuthenticatedUser } from '../../auth/types/jwt-payload.interface'
import { AuditService } from '../../common/audit/audit.service'
import { PrismaService } from '../../prisma/prisma.service'
import { CreateExerciseDto } from './dto/create-exercise.dto'
import { UpdateExerciseDto } from './dto/update-exercise.dto'

@Injectable()
export class ExercisesService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly audit: AuditService,
  ) {}

  async findAll(filters: { category?: string; muscleGroup?: string }) {
    return this.prisma.exercise.findMany({
      where: {
        deletedAt: null,
        ...(filters.category && { category: filters.category as any }),
        ...(filters.muscleGroup && {
          muscleGroup: { contains: filters.muscleGroup, mode: 'insensitive' },
        }),
      },
      orderBy: [{ category: 'asc' }, { name: 'asc' }],
    })
  }

  async create(dto: CreateExerciseDto, user: AuthenticatedUser) {
    const exercise = await this.prisma.exercise.create({
      data: {
        name: dto.name,
        category: dto.category,
        muscleGroup: dto.muscleGroup ?? null,
        equipmentNeeded: dto.equipmentNeeded ?? null,
        description: dto.description ?? null,
        createdByStaffId: user.staffId ?? null,
      },
    })

    await this.audit.log({
      actorUserId: user.userId,
      action: 'exercise.create',
      resourceType: 'exercise',
      resourceId: exercise.exerciseId.toString(),
      afterData: {
        exerciseId: exercise.exerciseId.toString(),
        name: exercise.name,
        category: exercise.category,
      },
    })

    return exercise
  }

  async update(id: bigint, dto: UpdateExerciseDto, user: AuthenticatedUser) {
    const before = await this.findOneOrThrow(id)
    const exercise = await this.prisma.exercise.update({ where: { exerciseId: id }, data: dto })

    await this.audit.log({
      actorUserId: user.userId,
      action: 'exercise.update',
      resourceType: 'exercise',
      resourceId: id.toString(),
      beforeData: {
        exerciseId: before.exerciseId.toString(),
        name: before.name,
        category: before.category,
      },
      afterData: {
        exerciseId: exercise.exerciseId.toString(),
        name: exercise.name,
        category: exercise.category,
      },
    })

    return exercise
  }

  async softDelete(id: bigint, user: AuthenticatedUser) {
    await this.findOneOrThrow(id)
    const activeRef = await this.prisma.workoutPlanExercise.findFirst({
      where: {
        exerciseId: id,
        planDay: { plan: { assignments: { some: { status: 'active' } } } },
      },
    })
    if (activeRef) {
      throw new ConflictException('Exercise dang duoc dung trong plan active - khong the xoa')
    }

    const exercise = await this.prisma.exercise.update({
      where: { exerciseId: id },
      data: { deletedAt: new Date() },
    })

    await this.audit.log({
      actorUserId: user.userId,
      action: 'exercise.delete',
      resourceType: 'exercise',
      resourceId: id.toString(),
      afterData: { exerciseId: id.toString() },
    })

    return exercise
  }

  private async findOneOrThrow(id: bigint) {
    const ex = await this.prisma.exercise.findFirst({ where: { exerciseId: id, deletedAt: null } })
    if (!ex) throw new NotFoundException(`Exercise ${id} khong ton tai`)
    return ex
  }
}
