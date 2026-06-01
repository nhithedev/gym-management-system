import { Module } from '@nestjs/common'
import { TrainingController, DeviceController } from './training.controller'
import { TrainingService } from './training.service'
import { DeviceApiKeyGuard } from './guards/device-api-key.guard'
import { AuditService } from '../common/audit/audit.service'

@Module({
  controllers: [TrainingController, DeviceController],
  providers: [TrainingService, DeviceApiKeyGuard, AuditService],
  exports: [TrainingService],
})
export class TrainingModule {}
