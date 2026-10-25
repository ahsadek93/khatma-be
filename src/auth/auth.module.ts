import { Module } from '@nestjs/common';
import { APP_GUARD } from '@nestjs/core';
import { JwtModule } from '@nestjs/jwt';
import { MongooseModule } from '@nestjs/mongoose';
import { UsersModule } from '../users/users.module.js';
import { AuthController } from './auth.controller.js';
import { AuthMailerService } from './auth-mailer.service.js';
import { AuthSession, AuthSessionSchema, OtpChallenge, OtpChallengeSchema } from './auth.schemas.js';
import { AuthService } from './auth.service.js';
import { JwtAuthGuard } from './jwt-auth.guard.js';

const jwtSecret = process.env.JWT_SECRET;
if (!jwtSecret || Buffer.byteLength(jwtSecret) < 32) {
  throw new Error('JWT_SECRET must contain at least 32 bytes');
}

@Module({
  imports: [
    UsersModule,
    MongooseModule.forFeature([
      { name: OtpChallenge.name, schema: OtpChallengeSchema },
      { name: AuthSession.name, schema: AuthSessionSchema },
    ]),
    JwtModule.register({
      secret: jwtSecret,
      signOptions: { expiresIn: '15m', issuer: 'khatma-api', audience: 'khatma-mobile' },
    }),
  ],
  controllers: [AuthController],
  providers: [
    AuthService,
    AuthMailerService,
    { provide: APP_GUARD, useClass: JwtAuthGuard },
  ],
  exports: [JwtModule],
})
export class AuthModule {}
