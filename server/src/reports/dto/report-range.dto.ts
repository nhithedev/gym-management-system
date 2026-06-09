import { IsOptional, IsString } from 'class-validator'

export class ReportRangeDto {
  @IsString() from!: string
  @IsString() to!: string
}

export class StaffPerformanceQueryDto extends ReportRangeDto {
  @IsOptional() @IsString() staffId?: string
}
