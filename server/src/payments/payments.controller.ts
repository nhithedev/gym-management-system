import {
  Body, Controller, Get, HttpCode, HttpStatus,
  Post, Query, UseGuards,
} from '@nestjs/common'
import { PermissionsGuard } from '../common/guards/permissions.guard'
import { RequirePermission } from '../common/decorators/require-permission.decorator'
import { CurrentUser } from '../auth/decorators/current-user.decorator'
import { AuthenticatedUser } from '../auth/types/jwt-payload.interface'
import { PaymentsService } from './payments.service'
import { CreatePaymentDto } from './dto/create-payment.dto'
import { ListPaymentsDto } from './dto/list-payments.dto'

@Controller('payments')
@UseGuards(PermissionsGuard)
export class PaymentsController {
  constructor(private readonly payments: PaymentsService) {}

  @Post()
  @HttpCode(HttpStatus.CREATED)
  @RequirePermission('payment.create')
  async create(@Body() dto: CreatePaymentDto, @CurrentUser() user: AuthenticatedUser) {
    const result = await this.payments.createPayment(dto, user)
    return { success: true, ...result }
  }

  @Get()
  @RequirePermission('payment.read')
  async list(@Query() query: ListPaymentsDto, @CurrentUser() user: AuthenticatedUser) {
    const result = await this.payments.listPayments(query, user)
    return { success: true, ...result }
  }
}
