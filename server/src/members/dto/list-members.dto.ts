import { IsEnum, IsInt, IsOptional, IsString, Max, Min } from 'class-validator'
import { Type } from 'class-transformer'
import { UserStatus } from '@prisma/client'

export class ListMembersDto {
  @IsOptional() @Type(() => Number) @IsInt() @Min(1) page?: number = 1
  @IsOptional() @Type(() => Number) @IsInt() @Min(1) @Max(100) pageSize?: number = 20
  @IsOptional() @IsString() search?: string
  @IsOptional() @IsEnum(UserStatus) status?: UserStatus
  @IsOptional() @IsString() sort?: string
}
