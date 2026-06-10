import { IsOptional, IsString, Matches } from 'class-validator'

export class ReportQueryDto {
  @IsString()
  @Matches(/^\d{4}-\d{2}-\d{2}$/, { message: 'from phải có định dạng YYYY-MM-DD' })
  from: string

  @IsString()
  @Matches(/^\d{4}-\d{2}-\d{2}$/, { message: 'to phải có định dạng YYYY-MM-DD' })
  to: string
}

export class StaffPerformanceQueryDto extends ReportQueryDto {
  @IsOptional()
  @IsString()
  staffId?: string
}
