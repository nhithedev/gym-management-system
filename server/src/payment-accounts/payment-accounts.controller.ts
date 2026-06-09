import {
  Body, Controller, Delete, Get, HttpCode, HttpStatus,
  NotFoundException, Param, ParseIntPipe, Post, UseGuards,
} from '@nestjs/common'
import { PermissionsGuard } from '../common/guards/permissions.guard'
import { CurrentUser } from '../auth/decorators/current-user.decorator'
import { AuthenticatedUser } from '../auth/types/jwt-payload.interface'
import { PaymentAccountsService } from './payment-accounts.service'
import { CreatePaymentAccountDto } from './dto/create-payment-account.dto'

@Controller()
@UseGuards(PermissionsGuard)
export class PaymentAccountsController {
  constructor(private readonly service: PaymentAccountsService) {}

  @Get('members/:memberId/payment-accounts')
  async list(
    @Param('memberId', ParseIntPipe) memberId: number,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    this.assertAccess(memberId, user)
    return this.service.list(BigInt(memberId))
  }

  @Post('members/:memberId/payment-accounts')
  @HttpCode(HttpStatus.CREATED)
  async create(
    @Param('memberId', ParseIntPipe) memberId: number,
    @Body() dto: CreatePaymentAccountDto,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    this.assertAccess(memberId, user)
    return this.service.create(BigInt(memberId), dto)
  }

  @Delete('members/:memberId/payment-accounts/:accountId')
  @HttpCode(HttpStatus.NO_CONTENT)
  async remove(
    @Param('memberId', ParseIntPipe) memberId: number,
    @Param('accountId', ParseIntPipe) accountId: number,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    this.assertAccess(memberId, user)
    return this.service.remove(BigInt(memberId), accountId)
  }

  private assertAccess(memberId: number, user: AuthenticatedUser) {
    const isSelf = user.memberId !== null && Number(user.memberId) === memberId
    const isStaff = user.roles.some(r => r === 'staff' || r === 'owner')
    if (!isSelf && !isStaff) {
      throw new NotFoundException({ success: false, message: 'Không tìm thấy tài khoản' })
    }
  }
}
