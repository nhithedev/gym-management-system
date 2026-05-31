import { IsDateString, IsEnum, IsNotEmpty } from 'class-validator'
import { StaffShift } from '@prisma/client'

export class CreateScheduleDto {
  @IsEnum(StaffShift)
  shift!: StaffShift

  @IsDateString()
  workDate!: string // YYYY-MM-DD
}
