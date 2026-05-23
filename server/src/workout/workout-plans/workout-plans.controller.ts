import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  ParseIntPipe,
  Patch,
  Post,
  UseGuards,
} from '@nestjs/common'
import { PermissionsGuard } from '../../common/guards/permissions.guard'
import { RequirePermission } from '../../common/decorators/require-permission.decorator'
import { CurrentUser } from '../../auth/decorators/current-user.decorator'
import { AuthenticatedUser } from '../../auth/types/jwt-payload.interface'
import { WorkoutPlansService } from './workout-plans.service'
import { CreateWorkoutPlanDto } from './dto/create-workout-plan.dto'
import { UpdateWorkoutPlanDto } from './dto/update-workout-plan.dto'
import { AddPlanDayDto } from './dto/add-plan-day.dto'
import { UpdatePlanDayDto } from './dto/update-plan-day.dto'
import { AddPlanExerciseDto } from './dto/add-plan-exercise.dto'
import { AssignPlanDto } from './dto/assign-plan.dto'

@Controller('workout-plans')
@UseGuards(PermissionsGuard)
export class WorkoutPlansController {
  constructor(private readonly plans: WorkoutPlansService) {}

  @Get()
  @RequirePermission('workout_plan.create')
  async list(@CurrentUser() user: AuthenticatedUser) {
    const data = await this.plans.findAll(user)
    return { success: true, data }
  }

  @Get(':id')
  @RequirePermission('workout_plan.create')
  async findOne(@Param('id', ParseIntPipe) id: number) {
    const data = await this.plans.findOne(BigInt(id))
    return { success: true, data }
  }

  @Post()
  @HttpCode(HttpStatus.CREATED)
  @RequirePermission('workout_plan.create')
  async create(@Body() dto: CreateWorkoutPlanDto, @CurrentUser() user: AuthenticatedUser) {
    const data = await this.plans.create(dto, user)
    return { success: true, data }
  }

  @Patch(':id')
  @RequirePermission('workout_plan.update')
  async update(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: UpdateWorkoutPlanDto,
  ) {
    const data = await this.plans.update(BigInt(id), dto)
    return { success: true, data }
  }

  @Delete(':id')
  @RequirePermission('workout_plan.delete')
  async remove(@Param('id', ParseIntPipe) id: number) {
    await this.plans.softDelete(BigInt(id))
    return { success: true }
  }

  @Post(':id/days')
  @HttpCode(HttpStatus.CREATED)
  @RequirePermission('workout_plan.update')
  async addDay(@Param('id', ParseIntPipe) id: number, @Body() dto: AddPlanDayDto) {
    const data = await this.plans.addDay(BigInt(id), dto)
    return { success: true, data }
  }

  @Patch(':id/days/:dayId')
  @RequirePermission('workout_plan.update')
  async updateDay(
    @Param('id', ParseIntPipe) _id: number,
    @Param('dayId', ParseIntPipe) dayId: number,
    @Body() dto: UpdatePlanDayDto,
  ) {
    const data = await this.plans.updateDay(BigInt(dayId), dto)
    return { success: true, data }
  }

  @Delete(':id/days/:dayId')
  @RequirePermission('workout_plan.update')
  async deleteDay(
    @Param('id', ParseIntPipe) _id: number,
    @Param('dayId', ParseIntPipe) dayId: number,
  ) {
    await this.plans.deleteDay(BigInt(dayId))
    return { success: true }
  }

  @Post(':id/days/:dayId/exercises')
  @HttpCode(HttpStatus.CREATED)
  @RequirePermission('workout_plan.update')
  async addExercise(
    @Param('id', ParseIntPipe) _id: number,
    @Param('dayId', ParseIntPipe) dayId: number,
    @Body() dto: AddPlanExerciseDto,
  ) {
    const data = await this.plans.addExercise(BigInt(dayId), dto)
    return { success: true, data }
  }

  @Delete(':id/days/:dayId/exercises/:peId')
  @RequirePermission('workout_plan.update')
  async removePlanExercise(
    @Param('id', ParseIntPipe) _id: number,
    @Param('dayId', ParseIntPipe) _dayId: number,
    @Param('peId', ParseIntPipe) peId: number,
  ) {
    await this.plans.removePlanExercise(BigInt(peId))
    return { success: true }
  }

  @Post('members/:memberId/assign')
  @HttpCode(HttpStatus.CREATED)
  @RequirePermission('workout_plan.assign')
  async assign(
    @Param('memberId', ParseIntPipe) memberId: number,
    @Body() dto: AssignPlanDto,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    const staff = await this.resolveStaffId(user)
    const data = await this.plans.assignPlan(BigInt(memberId), dto, staff)
    return { success: true, data }
  }

  private async resolveStaffId(user: AuthenticatedUser): Promise<bigint | null> {
    const isStaff =
      user.roles.includes('staff') || user.roles.includes('trainer') || user.roles.includes('owner')
    if (!isStaff) return null
    // staffId resolved inside service when needed; returning null is safe for audit purposes
    return null
  }
}
