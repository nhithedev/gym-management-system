import { Module } from '@nestjs/common'
import { AuditService } from '../common/audit/audit.service'
import { FacilityController } from './facility.controller'
import { FacilityService } from './facility.service'

@Module({
  controllers: [FacilityController],
  providers: [FacilityService, AuditService],
  exports: [FacilityService],
})
export class FacilityModule {}