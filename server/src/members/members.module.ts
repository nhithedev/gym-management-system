import { Module } from '@nestjs/common'
import { MembersController } from './members.controller'
import { MembersService } from './members.service'
import { TrainerAssignmentService } from './trainer-assignment.service'
import { AuditService } from '../common/audit/audit.service'

@Module({
  controllers: [MembersController],
  providers: [MembersService, TrainerAssignmentService, AuditService],
  exports: [MembersService, TrainerAssignmentService],
})
export class MembersModule {}
