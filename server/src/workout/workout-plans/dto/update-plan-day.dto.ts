import { IsOptional, IsString, MaxLength } from 'class-validator'

export class UpdatePlanDayDto {
  @IsOptional()
  @IsString()
  @MaxLength(100)
  name?: string

  @IsOptional()
  @IsString()
  notes?: string
}
