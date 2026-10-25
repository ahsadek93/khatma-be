import { Transform } from 'class-transformer';
import { IsEmail, IsString, Matches, MaxLength } from 'class-validator';

export class EmailDto {
  @Transform(({ value }) => (typeof value === 'string' ? value.trim().toLowerCase() : value))
  @IsEmail()
  @MaxLength(254)
  email!: string;
}

export class VerifyOtpDto extends EmailDto {
  @IsString()
  @Matches(/^\d{8}$/)
  token!: string;
}

export class RefreshTokenDto {
  @IsString()
  @Matches(/^[A-Za-z0-9_-]{43}$/)
  refreshToken!: string;
}
