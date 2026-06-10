import { BadRequestException, Body, Controller, Delete, Get, HttpCode, HttpStatus, Param, ParseIntPipe, Patch, Post, UseGuards, Query } from '@nestjs/common'
import { PermissionsGuard } from '../common/guards/permissions.guard'
import { RequirePermission } from '../common/decorators/require-permission.decorator'
import { CurrentUser } from '../auth/decorators/current-user.decorator'
import { AuthenticatedUser } from '../auth/types/jwt-payload.interface'
import { StaffService } from './staff.service'
import { CreateStaffDto } from './dto/create-staff.dto'
import { UpdateStaffDto } from './dto/update-staff.dto'
import { CreateScheduleDto } from './dto/create-schedule.dto'

@Controller('staff')
@UseGuards(PermissionsGuard)
export class StaffController {
  constructor(private readonly svc: StaffService) {}

  @Get('me')
  async getMe(@CurrentUser() user: AuthenticatedUser) {
    if (!user.staffId) {
      throw new BadRequestException({ success: false, code: 'STAFF_PROFILE_MISSING', message: 'Tai khoan khong co staff profile' })
    }
    const data = await this.svc.get(user.staffId)
    return { success: true, data }
  }

  @Get()
  @RequirePermission('staff.read')
  async list(@Query() q: any, @CurrentUser() user: AuthenticatedUser) {
    const data = await this.svc.list(q, user)
    return { success: true, data }
  }

  @Post()
  @HttpCode(HttpStatus.CREATED)
  @RequirePermission('staff.create')
  async create(@Body() dto: CreateStaffDto, @CurrentUser() user: AuthenticatedUser) {
    const data = await this.svc.create(dto, user.userId)
    return { success: true, data }
  }

  @Get(':id')
  @RequirePermission('staff.read')
  async get(@Param('id', ParseIntPipe) id: number) {
    const data = await this.svc.get(BigInt(id))
    return { success: true, data }
  }

  @Patch(':id')
  @RequirePermission('staff.update')
  async update(@Param('id', ParseIntPipe) id: number, @Body() dto: UpdateStaffDto, @CurrentUser() user: AuthenticatedUser) {
    const data = await this.svc.update(BigInt(id), dto, user.userId)
    return { success: true, data }
  }

  @Delete(':id')
  @RequirePermission('staff.delete')
  async remove(@Param('id', ParseIntPipe) id: number, @CurrentUser() user: AuthenticatedUser) {
    const data = await this.svc.delete(BigInt(id), user.userId)
    return { success: true, data }
  }

  // schedules
  @Get(':id/schedules')
  @RequirePermission('schedule.read')
  async listSchedules(@Param('id', ParseIntPipe) id: number) {
    const data = await this.svc.listSchedules(BigInt(id))
    return { success: true, data }
  }

  @Post(':id/schedules')
  @HttpCode(HttpStatus.CREATED)
  @RequirePermission('schedule.manage')
  async createSchedule(@Param('id', ParseIntPipe) id: number, @Body() dto: CreateScheduleDto, @CurrentUser() user: AuthenticatedUser) {
    const data = await this.svc.createSchedule(BigInt(id), dto, user.userId)
    return { success: true, data }
  }

  @Delete(':id/schedules/:scheduleId')
  @RequirePermission('schedule.manage')
  async deleteSchedule(@Param('id', ParseIntPipe) _id: number, @Param('scheduleId', ParseIntPipe) scheduleId: number, @CurrentUser() user: AuthenticatedUser) {
    const data = await this.svc.deleteSchedule(BigInt(_id), BigInt(scheduleId), user.userId)
    return { success: true, data }
  }
}
