import { Transform } from 'class-transformer';
import { IsInt, IsString, Length, Max, Min } from 'class-validator';

export class CreateZikrKhatmaDto {
  @Transform(({ value }) => (typeof value === 'string' ? value.trim() : value))
  @IsString()
  @Length(1, 100)
  name!: string;
  @Transform(({ value }) => (typeof value === 'string' ? value.trim() : value))
  @IsString()
  @Length(1, 500)
  phrase!: string;
  @IsInt()
  @Min(1)
  @Max(Number.MAX_SAFE_INTEGER)
  goalCount!: number;
}

export class ZikrClaimDto {
  @IsInt()
  @Min(1)
  @Max(Number.MAX_SAFE_INTEGER)
  amount!: number;
}

export class ZikrSettingsDto {
  @Transform(({ value }) => (typeof value === 'string' ? value.trim() : value))
  @IsString()
  @Length(1, 500)
  phrase!: string;
  @IsInt()
  @Min(1)
  @Max(Number.MAX_SAFE_INTEGER)
  goalCount!: number;
}
