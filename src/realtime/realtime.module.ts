import { Global, Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { Khatma, KhatmaSchema } from '../khatmas/khatma.schema.js';
import { RealtimeController } from './realtime.controller.js';
import { RealtimeService } from './realtime.service.js';

@Global()
@Module({
  imports: [MongooseModule.forFeature([{ name: Khatma.name, schema: KhatmaSchema }])],
  controllers: [RealtimeController],
  providers: [RealtimeService],
  exports: [RealtimeService],
})
export class RealtimeModule {}
