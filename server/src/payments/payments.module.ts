import { Module } from '@nestjs/common'
import { PaymentsController } from './payments.controller'
import { PaymentsService } from './payments.service'
import { AuditService } from '../common/audit/audit.service'
import { PaymentAccountsController } from '../payment-accounts/payment-accounts.controller'
import { PaymentAccountsService } from '../payment-accounts/payment-accounts.service'

@Module({
  controllers: [PaymentsController, PaymentAccountsController],
  providers: [PaymentsService, AuditService, PaymentAccountsService],
  exports: [PaymentsService],
})
export class PaymentsModule {}
