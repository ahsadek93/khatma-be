import { Module } from '@nestjs/common';
import { APP_GUARD } from '@nestjs/core';
import { ConfigService } from '@nestjs/config';
import { JwtModule } from '@nestjs/jwt';
import { MongooseModule } from '@nestjs/mongoose';
import { UsersModule } from '../users/users.module.js';
import { AuthController } from './auth.controller.js';
import { AuthMailerService } from './auth-mailer.service.js';
import { AuthSession, AuthSessionSchema, OtpChallenge, OtpChallengeSchema } from './auth.schemas.js';
import { AuthService } from './auth.service.js';
import { JwtAuthGuard } from './jwt-auth.guard.js';
import type { AppConfig } from '../config/configuration.js';

@Module({
  imports: [
    UsersModule,
    MongooseModule.forFeature([
      { name: OtpChallenge.name, schema: OtpChallengeSchema },
      { name: AuthSession.name, schema: AuthSessionSchema },
    ]),
    JwtModule.registerAsync({
      inject: [ConfigService],
      useFactory: (config: ConfigService<AppConfig, true>) => ({
        secret: config.get('JWT_SECRET', { infer: true }),
        signOptions: {
          algorithm: 'HS256' as const,
          expiresIn: '15m' as const,
          issuer: 'khatma-api',
          audience: 'khatma-mobile',
        },
        verifyOptions: { algorithms: ['HS256'] },
      }),
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
