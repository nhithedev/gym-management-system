import { Module } from '@nestjs/common'
import { PackagesController } from './packages.controller'
import { PackagesService } from './packages.service'
import { AuditService } from '../common/audit/audit.service'

@Module({
  controllers: [PackagesController],
  providers: [PackagesService, AuditService],
  exports: [PackagesService],
})
export class PackagesModule {}
