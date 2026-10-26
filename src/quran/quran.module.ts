import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { Khatma, KhatmaSchema } from '../khatmas/khatma.schema.js';
import { User, UserSchema } from '../users/user.schema.js';
import { QuranController } from './quran.controller.js';
import { QuranService } from './quran.service.js';

@Module({
  imports: [MongooseModule.forFeature([{ name: Khatma.name, schema: KhatmaSchema }, { name: User.name, schema: UserSchema }])],
  controllers: [QuranController],
  providers: [QuranService],
})
export class QuranModule {}
