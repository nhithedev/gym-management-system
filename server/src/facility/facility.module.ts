import { Module } from '@nestjs/common'
import { AuditService } from '../common/audit/audit.service'
import { EquipmentService } from './equipment.service'
import { FacilityController } from './facility.controller'
import { FacilityService } from './facility.service'

@Module({
  controllers: [FacilityController],
  providers: [FacilityService, EquipmentService, AuditService],
  exports: [FacilityService, EquipmentService],
})
export class FacilityModule {}