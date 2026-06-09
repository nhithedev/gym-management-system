import { IsEmail, IsNotEmpty, IsOptional, IsString, Length, IsDateString } from 'class-validator'

/** UC03B — Member tự đăng ký online: tạo user(pending_verification) + subscription(pending) */
export class SelfRegisterDto {
  @IsEmail() email!: string
  @IsString() @IsNotEmpty() @Length(8, 100) password!: string
  @IsString() @IsNotEmpty() @Length(2, 100) fullName!: string
  @IsOptional() @IsString() phone?: string
  @IsDateString() dateOfBirth!: string
  @IsOptional() @IsString() @Length(0, 200) address?: string
}
