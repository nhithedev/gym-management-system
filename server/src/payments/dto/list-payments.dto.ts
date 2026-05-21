import { IsEnum, IsInt, IsOptional, IsString, Max, Min } from 'class-validator'
import { Type } from 'class-transformer'
import { PaymentStatus } from '@prisma/client'

export class ListPaymentsDto {
  @IsOptional() @Type(() => Number) @IsInt() @Min(1) page?: number = 1
  @IsOptional() @Type(() => Number) @IsInt() @Min(1) @Max(100) pageSize?: number = 20
  @IsOptional() @Type(() => Number) @IsInt() memberId?: number
  @IsOptional() @Type(() => Number) @IsInt() subscriptionId?: number
  @IsOptional() @IsEnum(PaymentStatus) status?: PaymentStatus
  @IsOptional() @IsString() dateFrom?: string
  @IsOptional() @IsString() dateTo?: string
}
