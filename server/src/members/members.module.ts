import { Module } from '@nestjs/common'
import { MembersController } from './members.controller'
import { MembersService } from './members.service'
import { AuditService } from '../common/audit/audit.service'

@Module({
  controllers: [MembersController],
  providers: [MembersService, AuditService],
  exports: [MembersService],
})
export class MembersModule {}
