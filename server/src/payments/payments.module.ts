import { Module } from '@nestjs/common'
import { PaymentsController } from './payments.controller'
import { PaymentsService } from './payments.service'
import { AuditService } from '../common/audit/audit.service'

@Module({
  controllers: [PaymentsController],
  providers: [PaymentsService, AuditService],
  exports: [PaymentsService],
})
export class PaymentsModule {}
