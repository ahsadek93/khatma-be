import { Body, Controller, Post } from '@nestjs/common';
import { AuthService } from './auth.service.js';
import { EmailDto, RefreshTokenDto, VerifyOtpDto } from './auth.dto.js';
import { Public } from './public.decorator.js';

@Public()
@Controller('auth')
export class AuthController {
  constructor(private readonly auth: AuthService) {}

  @Post('otp/request')
  requestCode(@Body() body: EmailDto) {
    return this.auth.requestCode(body.email);
  }

  @Post('otp/verify')
  verifyCode(@Body() body: VerifyOtpDto) {
    return this.auth.verifyCode(body.email, body.token);
  }

  @Post('refresh')
  refresh(@Body() body: RefreshTokenDto) {
    return this.auth.refresh(body.refreshToken);
  }

  @Post('sign-out')
  signOut(@Body() body: RefreshTokenDto) {
    return this.auth.signOut(body.refreshToken);
  }
}
