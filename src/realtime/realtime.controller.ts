import { Controller, ForbiddenException, Get, NotFoundException, Param, Sse } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import type { Model } from 'mongoose';
import { KhatmaIdParamDto } from '../khatmas/khatmas.dto.js';
import { Khatma } from '../khatmas/khatma.schema.js';
import { CurrentUser } from '../users/current-user.js';
import type { AuthenticatedUser } from '../users/current-user.js';
import { RealtimeService } from './realtime.service.js';

@Controller('realtime/khatmas')
export class RealtimeController {
  constructor(
    @InjectModel(Khatma.name) private readonly khatmas: Model<Khatma>,
    private readonly realtime: RealtimeService,
  ) {}

  @Sse(':id/events')
  async events(@CurrentUser() user: AuthenticatedUser, @Param() params: KhatmaIdParamDto) {
    const khatma = await this.khatmas.findById(params.id).select('_id members.userId').exec();
    if (!khatma) throw new NotFoundException('Khatma not found');
    if (!khatma.members.some((member) => member.userId.toString() === user.id)) {
      throw new ForbiddenException('Only Khatma members can subscribe to updates');
    }
    return this.realtime.subscribe(params.id);
  }
}
