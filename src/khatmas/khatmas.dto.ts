import { Transform } from 'class-transformer';
import { IsIn, IsMongoId, IsOptional, IsString, Length, Matches, MaxLength } from 'class-validator';

export class CreateKhatmaDto {
  @Transform(({ value }) => (typeof value === 'string' ? value.trim() : value))
  @IsString()
  @Length(1, 100)
  name!: string;
}

export class JoinKhatmaDto {
  @Transform(({ value }) => (typeof value === 'string' ? value.trim().toUpperCase() : value))
  @IsString()
  @MaxLength(24)
  @Matches(/^[A-Z0-9]+$/)
  code!: string;
}

export class ListKhatmasQueryDto {
  @IsOptional()
  @IsIn(['active', 'completed'])
  status: 'active' | 'completed' = 'active';
  @IsOptional()
  @IsIn(['quran', 'zikr'])
  type: 'quran' | 'zikr' = 'quran';
}

export class KhatmaIdParamDto {
  @IsMongoId()
  id!: string;
}
