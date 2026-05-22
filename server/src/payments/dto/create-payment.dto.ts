import { IsEnum, IsOptional, IsPositive, IsString } from 'class-validator'
import { Type } from 'class-transformer'
import { PaymentMethod } from '@prisma/client'

export class CreatePaymentDto {
  @Type(() => Number) @IsPositive() subscriptionId!: number
  @IsEnum(PaymentMethod) method!: PaymentMethod
  @Type(() => Number) @IsPositive() amount!: number
  @IsOptional() @IsString() transactionReference?: string
}
