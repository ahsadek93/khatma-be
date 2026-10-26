import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { User, UserSchema } from '../users/user.schema.js';
import { RealtimeModule } from '../realtime/realtime.module.js';
import { Khatma, KhatmaSchema } from './khatma.schema.js';
import { KhatmasController } from './khatmas.controller.js';
import { KhatmasService } from './khatmas.service.js';

@Module({
  imports: [RealtimeModule, MongooseModule.forFeature([{ name: Khatma.name, schema: KhatmaSchema }, { name: User.name, schema: UserSchema }])],
  controllers: [KhatmasController],
  providers: [KhatmasService],
  exports: [KhatmasService],
})
export class KhatmasModule {}
