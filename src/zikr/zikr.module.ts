import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { Khatma, KhatmaSchema } from '../khatmas/khatma.schema.js';
import { RealtimeModule } from '../realtime/realtime.module.js';
import { KhatmasModule } from '../khatmas/khatmas.module.js';
import { ZikrController } from './zikr.controller.js';
import { ZikrService } from './zikr.service.js';

@Module({
  imports: [KhatmasModule, RealtimeModule, MongooseModule.forFeature([{ name: Khatma.name, schema: KhatmaSchema }])],
  controllers: [ZikrController],
  providers: [ZikrService],
})
export class ZikrModule {}
