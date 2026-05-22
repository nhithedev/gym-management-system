import { IsEmail, IsEnum, IsNotEmpty, IsOptional, IsPositive, IsString, Length, IsDateString } from 'class-validator'
import { Type } from 'class-transformer'
import { PaymentMethod } from '@prisma/client'

/** UC03A — Staff tạo hội viên tại quầy: tạo luôn subscription active + payment success */
export class CreateMemberDto {
  @IsEmail() email!: string
  @IsString() @IsNotEmpty() @Length(8, 100) password!: string
  @IsString() @IsNotEmpty() @Length(2, 100) fullName!: string
  @IsOptional() @IsString() phone?: string
  @IsDateString() dateOfBirth!: string
  @IsOptional() @IsString() @Length(0, 200) address?: string

  @Type(() => Number) @IsPositive() packageId!: number
  @IsEnum(PaymentMethod) paymentMethod!: PaymentMethod
  @IsOptional() @IsString() transactionReference?: string
}
