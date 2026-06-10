import { Module } from '@nestjs/common'
import { ConfigModule } from '@nestjs/config'
import { AuthModule } from './auth/auth.module'
import { validateConfig } from './config/configuration'
import { HealthModule } from './health/health.module'
import { PrismaModule } from './prisma/prisma.module'
import { UsersModule } from './users/users.module'
import { RbacModule } from './rbac/rbac.module'
import { PackagesModule } from './packages/packages.module'
import { MembersModule } from './members/members.module'
import { SubscriptionsModule } from './subscriptions/subscriptions.module'
import { PaymentsModule } from './payments/payments.module'
import { ScheduleModule } from './schedule/schedule.module'
import { TrainingModule } from './training/training.module'
import { FeedbackModule } from './feedback/feedback.module'
import { WorkoutModule } from './workout/workout.module'
import { StaffModule } from './staff/staff.module'
import { FacilityModule } from './facility/facility.module'
import { ReportsModule } from './reports/reports.module'

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath: ['.env.local', '.env'],
      validate: (raw) => validateConfig(raw),
    }),
    PrismaModule,
    UsersModule,
    AuthModule,
    HealthModule,
    RbacModule,
    PackagesModule,
    MembersModule,
    SubscriptionsModule,
    PaymentsModule,
    ScheduleModule,
    TrainingModule,
    FeedbackModule,
    WorkoutModule,
    StaffModule,
    FacilityModule,
    ReportsModule,
  ],
})
export class AppModule {}
