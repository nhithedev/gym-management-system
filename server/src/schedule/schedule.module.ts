import { Module } from '@nestjs/common'
import { ScheduleModule as NestScheduleModule } from '@nestjs/schedule'
import { SubscriptionScheduleService } from './subscription-schedule.service'

@Module({
  imports: [NestScheduleModule.forRoot()],
  providers: [SubscriptionScheduleService],
})
export class ScheduleModule {}
