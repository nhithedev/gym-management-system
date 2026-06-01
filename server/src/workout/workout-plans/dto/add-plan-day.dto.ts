import { Type } from 'class-transformer'
import { IsInt, IsOptional, IsString, MaxLength, Min, MinLength } from 'class-validator'

export class AddPlanDayDto {
  @Type(() => Number)
  @IsInt()
  @Min(1)
  dayNumber: number

  @IsString()
  @MinLength(1)
  @MaxLength(100)
  name: string

  @IsOptional()
  @IsString()
  notes?: string
}
