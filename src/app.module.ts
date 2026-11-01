import { Module, ValidationPipe } from '@nestjs/common';
import { APP_PIPE } from '@nestjs/core';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { MongooseModule } from '@nestjs/mongoose';
import { AuthModule } from './auth/auth.module.js';
import { validateConfig } from './config/configuration.js';
import type { AppConfig } from './config/configuration.js';
import { HealthModule } from './health/health.module.js';
import { KhatmasModule } from './khatmas/khatmas.module.js';
import { QuranModule } from './quran/quran.module.js';
import { RealtimeModule } from './realtime/realtime.module.js';
import { UsersModule } from './users/users.module.js';
import { ZikrModule } from './zikr/zikr.module.js';

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true, validate: validateConfig }),
    MongooseModule.forRootAsync({
      inject: [ConfigService],
      useFactory: (config: ConfigService<AppConfig, true>) => ({
        uri: config.get('MONGODB_URI', { infer: true }),
      }),
    }),
    AuthModule,
    UsersModule,
    KhatmasModule,
    QuranModule,
    ZikrModule,
    RealtimeModule,
    HealthModule,
  ],
  providers: [
    {
      provide: APP_PIPE,
      useValue: new ValidationPipe({
        whitelist: true,
        forbidNonWhitelisted: true,
        transform: true,
      }),
    },
  ],
})
export class AppModule {}
