import { Module } from '@nestjs/common'
import { StaffController } from './staff.controller'
import { StaffService } from './staff.service'
import { StaffScheduleService } from './staff-schedule.service'
import { AuditService } from '../common/audit/audit.service'

@Module({
  controllers: [StaffController],
  providers: [StaffService, StaffScheduleService, AuditService],
  exports: [StaffService, StaffScheduleService],
})
export class StaffModule {}
