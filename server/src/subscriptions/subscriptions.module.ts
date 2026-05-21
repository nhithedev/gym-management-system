import { Module } from '@nestjs/common'
import { SubscriptionsController } from './subscriptions.controller'
import { SubscriptionsService } from './subscriptions.service'
import { AuditService } from '../common/audit/audit.service'

@Module({
  controllers: [SubscriptionsController],
  providers: [SubscriptionsService, AuditService],
  exports: [SubscriptionsService],
})
export class SubscriptionsModule {}
