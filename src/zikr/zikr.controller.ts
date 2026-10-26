import { Body, Controller, Get, Param, Patch, Post } from '@nestjs/common';
import { KhatmaIdParamDto } from '../khatmas/khatmas.dto.js';
import { KhatmasService } from '../khatmas/khatmas.service.js';
import { CurrentUser } from '../users/current-user.js';
import type { AuthenticatedUser } from '../users/current-user.js';
import { CreateZikrKhatmaDto, ZikrClaimDto, ZikrSettingsDto } from './zikr.dto.js';
import { ZikrService } from './zikr.service.js';

@Controller('zikr/khatmas')
export class ZikrController {
  constructor(private readonly zikr: ZikrService, private readonly khatmas: KhatmasService) {}

  @Post()
  create(@CurrentUser() user: AuthenticatedUser, @Body() body: CreateZikrKhatmaDto) {
    return this.khatmas.createZikr(user.id, body.name, body.phrase, body.goalCount);
  }

  @Get(':id/progress')
  getProgress(@CurrentUser() user: AuthenticatedUser, @Param() params: KhatmaIdParamDto) {
    return this.zikr.getProgress(user.id, params.id);
  }

  @Post(':id/claim')
  setClaim(@CurrentUser() user: AuthenticatedUser, @Param() params: KhatmaIdParamDto, @Body() body: ZikrClaimDto) {
    return this.zikr.setClaim(user.id, params.id, body.amount);
  }

  @Post(':id/release')
  releaseClaim(@CurrentUser() user: AuthenticatedUser, @Param() params: KhatmaIdParamDto) {
    return this.zikr.releaseClaim(user.id, params.id);
  }

  @Post(':id/complete')
  completeClaim(@CurrentUser() user: AuthenticatedUser, @Param() params: KhatmaIdParamDto) {
    return this.zikr.completeClaim(user.id, params.id);
  }

  @Patch(':id/settings')
  updateSettings(@CurrentUser() user: AuthenticatedUser, @Param() params: KhatmaIdParamDto, @Body() body: ZikrSettingsDto) {
    return this.zikr.updateSettings(user.id, params.id, body.phrase, body.goalCount);
  }
}
