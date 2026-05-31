import { IsOptional, IsString, Length } from 'class-validator'

export class UpdateStaffDto {
  @IsOptional() @IsString() @Length(2, 200)
  fullName?: string | null

  @IsOptional() @IsString() @Length(0, 20)
  phone?: string | null

  @IsOptional() @IsString()
  position?: string | null
}
