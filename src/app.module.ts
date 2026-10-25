import { Module, ValidationPipe } from '@nestjs/common';
import { APP_PIPE } from '@nestjs/core';
import { MongooseModule } from '@nestjs/mongoose';
import { databaseUri } from './config/configuration.js';
import { AuthModule } from './auth/auth.module.js';
import { HealthModule } from './health/health.module.js';
import { KhatmasModule } from './khatmas/khatmas.module.js';
import { QuranModule } from './quran/quran.module.js';
import { RealtimeModule } from './realtime/realtime.module.js';
import { UsersModule } from './users/users.module.js';
import { ZikrModule } from './zikr/zikr.module.js';

@Module({
  imports: [
    MongooseModule.forRoot(databaseUri),
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
