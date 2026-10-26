import { Body, Controller, Get, Param, Post } from '@nestjs/common';
import { KhatmaIdParamDto } from '../khatmas/khatmas.dto.js';
import { CurrentUser } from '../users/current-user.js';
import type { AuthenticatedUser } from '../users/current-user.js';
import { JuzActionDto } from './quran.dto.js';
import { QuranService } from './quran.service.js';

@Controller('quran/khatmas/:id')
export class QuranController {
  constructor(private readonly quran: QuranService) {}

  @Get('juz')
  getJuz(@CurrentUser() user: AuthenticatedUser, @Param() params: KhatmaIdParamDto) {
    return this.quran.getJuz(user.id, params.id);
  }

  @Get('progress')
  getProgress(@CurrentUser() user: AuthenticatedUser, @Param() params: KhatmaIdParamDto) {
    return this.quran.getProgress(user.id, params.id);
  }

  @Post('claim')
  claim(@CurrentUser() user: AuthenticatedUser, @Param() params: KhatmaIdParamDto, @Body() body: JuzActionDto) {
    return this.quran.claim(user.id, params.id, body.juzNumber);
  }

  @Post('release')
  release(@CurrentUser() user: AuthenticatedUser, @Param() params: KhatmaIdParamDto, @Body() body: JuzActionDto) {
    return this.quran.release(user.id, params.id, body.juzNumber);
  }

  @Post('complete')
  complete(@CurrentUser() user: AuthenticatedUser, @Param() params: KhatmaIdParamDto, @Body() body: JuzActionDto) {
    return this.quran.complete(user.id, params.id, body.juzNumber);
  }
}
