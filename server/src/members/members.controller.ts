import {
  Body, Controller, Delete, Get, HttpCode, HttpStatus, NotFoundException,
  Param, ParseIntPipe, Patch, Post, Query, UseGuards,
} from '@nestjs/common'
import { PermissionsGuard } from '../common/guards/permissions.guard'
import { RequirePermission } from '../common/decorators/require-permission.decorator'
import { CurrentUser } from '../auth/decorators/current-user.decorator'
import { AuthenticatedUser } from '../auth/types/jwt-payload.interface'
import { Public } from '../auth/decorators/public.decorator'
import { MembersService } from './members.service'
import { CreateMemberDto } from './dto/create-member.dto'
import { SelfRegisterDto } from './dto/self-register.dto'
import { ListMembersDto } from './dto/list-members.dto'
import { UpdateMemberDto } from './dto/update-member.dto'
import { AssignTrainerDto } from './dto/assign-trainer.dto'

@Controller('members')
@UseGuards(PermissionsGuard)
export class MembersController {
  constructor(private readonly members: MembersService) {}

  /** Member xem profile của chính mình — không cần permission đặc biệt */
  @Get('me')
  async getMe(@CurrentUser() user: AuthenticatedUser) {
    if (!user.memberId) throw new NotFoundException('Tài khoản này không gắn với hội viên nào')
    const result = await this.members.getMember(user.memberId)
    return { success: true, ...result }
  }

  /** Member cập nhật profile của chính mình */
  @Patch('me')
  async updateMe(@Body() dto: UpdateMemberDto, @CurrentUser() user: AuthenticatedUser) {
    if (!user.memberId) throw new NotFoundException('Tài khoản này không gắn với hội viên nào')
    const result = await this.members.updateMember(user.memberId, dto, user.userId)
    return { success: true, ...result }
  }

  /** UC03A — Staff tạo hội viên tại quầy */
  @Post()
  @HttpCode(HttpStatus.CREATED)
  @RequirePermission('member.create')
  async create(@Body() dto: CreateMemberDto, @CurrentUser() user: AuthenticatedUser) {
    const result = await this.members.createMember(dto, user.userId)
    return { success: true, ...result }
  }

  /** UC03B — Member tự đăng ký online (public endpoint) */
  @Post('self-register')
  @HttpCode(HttpStatus.CREATED)
  @Public()
  async selfRegister(@Body() dto: SelfRegisterDto) {
    const result = await this.members.selfRegister(dto)
    return { success: true, ...result }
  }

  @Get()
  @RequirePermission('member.read')
  async list(@Query() query: ListMembersDto) {
    const result = await this.members.listMembers(query)
    return { success: true, ...result }
  }

  @Get(':id')
  @RequirePermission('member.read')
  async detail(@Param('id', ParseIntPipe) id: number) {
    const result = await this.members.getMember(BigInt(id))
    return { success: true, ...result }
  }

  @Patch(':id')
  @RequirePermission('member.update')
  async update(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: UpdateMemberDto,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    const result = await this.members.updateMember(BigInt(id), dto, user.userId)
    return { success: true, ...result }
  }

  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  @RequirePermission('member.delete')
  async delete(@Param('id', ParseIntPipe) id: number, @CurrentUser() user: AuthenticatedUser) {
    await this.members.deleteMember(BigInt(id), user.userId)
  }

  @Patch(':id/assign-trainer')
  @RequirePermission('member.update')
  async assignTrainer(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: AssignTrainerDto,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    const result = await this.members.assignTrainer(BigInt(id), dto.trainerId, user.userId)
    return { success: true, ...result }
  }
}
