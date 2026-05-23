import { ConflictException, Injectable, NotFoundException } from '@nestjs/common'
import { PrismaService } from '../../prisma/prisma.service'
import { CreateExerciseDto } from './dto/create-exercise.dto'
import { UpdateExerciseDto } from './dto/update-exercise.dto'

@Injectable()
export class ExercisesService {
  constructor(private readonly prisma: PrismaService) {}

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

  async create(dto: CreateExerciseDto, staffId: bigint) {
    return this.prisma.exercise.create({
      data: {
        name: dto.name,
        category: dto.category,
        muscleGroup: dto.muscleGroup ?? null,
        equipmentNeeded: dto.equipmentNeeded ?? null,
        description: dto.description ?? null,
        createdByStaffId: staffId,
      },
    })
  }

  async update(id: bigint, dto: UpdateExerciseDto) {
    await this.findOneOrThrow(id)
    return this.prisma.exercise.update({ where: { exerciseId: id }, data: dto })
  }

  async softDelete(id: bigint) {
    await this.findOneOrThrow(id)
    const activeRef = await this.prisma.workoutPlanExercise.findFirst({
      where: {
        exerciseId: id,
        planDay: { plan: { assignments: { some: { status: 'active' } } } },
      },
    })
    if (activeRef) {
      throw new ConflictException('Exercise dang duoc dung trong plan active — khong the xoa')
    }
    return this.prisma.exercise.update({
      where: { exerciseId: id },
      data: { deletedAt: new Date() },
    })
  }

  private async findOneOrThrow(id: bigint) {
    const ex = await this.prisma.exercise.findFirst({ where: { exerciseId: id, deletedAt: null } })
    if (!ex) throw new NotFoundException(`Exercise ${id} khong ton tai`)
    return ex
  }
}
