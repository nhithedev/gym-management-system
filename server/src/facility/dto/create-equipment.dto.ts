import { Type } from 'class-transformer'
import { IsDateString, IsInt, IsOptional, IsString, Matches, MaxLength, Min, MinLength } from 'class-validator'

export class CreateEquipmentDto {
  @IsOptional()
  @IsString()
  @Matches(/^EQ-[0-9]{6}$/, { message: 'equipmentCode phải có dạng EQ-XXXXXX' })
  equipmentCode?: string

  @Type(() => Number)
  @IsInt()
  @Min(1)
  roomId!: number

  @IsString()
  @MinLength(1)
  @MaxLength(100)
  name!: string

  @IsDateString()
  importDate!: string

  @IsOptional()
  @IsDateString()
  warrantyUntil?: string
}