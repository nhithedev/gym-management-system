import {
  Body, Controller, Get, HttpCode, HttpStatus,
  Param, ParseIntPipe, Patch, Post, UseGuards,
} from '@nestjs/common'
import { PermissionsGuard } from '../common/guards/permissions.guard'
import { RequirePermission } from '../common/decorators/require-permission.decorator'
import { CurrentUser } from '../auth/decorators/current-user.decorator'
import { AuthenticatedUser } from '../auth/types/jwt-payload.interface'
import { SubscriptionsService } from './subscriptions.service'
import { CreateSubscriptionDto } from './dto/create-subscription.dto'

@Controller('subscriptions')
@UseGuards(PermissionsGuard)
export class SubscriptionsController {
  constructor(private readonly subscriptions: SubscriptionsService) {}

  /** UC04A — Tạo subscription (gia hạn) */
  @Post()
  @HttpCode(HttpStatus.CREATED)
  @RequirePermission('subscription.create')
  async create(@Body() dto: CreateSubscriptionDto, @CurrentUser() user: AuthenticatedUser) {
    const result = await this.subscriptions.createSubscription(dto, user.userId)
    return { success: true, ...result }
  }

  /** UC04B — Hủy subscription */
  @Patch(':id/cancel')
  @HttpCode(HttpStatus.OK)
  @RequirePermission('subscription.cancel')
  async cancel(@Param('id', ParseIntPipe) id: number, @CurrentUser() user: AuthenticatedUser) {
    await this.subscriptions.cancelSubscription(BigInt(id), user.userId, user.roles)
    return { success: true, message: 'Hủy gói thành công' }
  }

  @Get(':id')
  @RequirePermission('subscription.read')
  async detail(@Param('id', ParseIntPipe) id: number) {
    const result = await this.subscriptions.getSubscription(BigInt(id))
    return { success: true, ...result }
  }

  @Get('member/:memberId')
  @RequirePermission('subscription.read')
  async listByMember(@Param('memberId', ParseIntPipe) memberId: number) {
    const result = await this.subscriptions.listByMember(BigInt(memberId))
    return { success: true, ...result }
  }
}
