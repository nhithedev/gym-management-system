import { IsEmail, IsNotEmpty, IsOptional, IsString, Length } from 'class-validator'

export class CreateStaffDto {
  @IsEmail()
  email!: string

  @IsOptional()
  @IsString()
  @Length(0, 20)
  phone?: string

  @IsString()
  @IsNotEmpty()
  @Length(2, 200)
  fullName!: string

  @IsString()
  @IsNotEmpty()
  position!: string

  @IsOptional()
  groupIds?: string[]
}
