import { Body, Controller, Get, Param, Post, Query } from '@nestjs/common';
import { CurrentUser } from '../users/current-user.js';
import type { AuthenticatedUser } from '../users/current-user.js';
import { CreateKhatmaDto, JoinKhatmaDto, KhatmaIdParamDto, ListKhatmasQueryDto } from './khatmas.dto.js';
import { KhatmasService } from './khatmas.service.js';

@Controller('khatmas')
export class KhatmasController {
  constructor(private readonly khatmas: KhatmasService) {}
  @Post()
  create(@CurrentUser() user: AuthenticatedUser, @Body() body: CreateKhatmaDto) {
    return this.khatmas.create(user.id, body.name);
  }
  @Post('join')
  join(@CurrentUser() user: AuthenticatedUser, @Body() body: JoinKhatmaDto) {
    return this.khatmas.join(user.id, body.code);
  }
  @Get()
  list(@CurrentUser() user: AuthenticatedUser, @Query() query: ListKhatmasQueryDto) {
    return this.khatmas.list(user.id, query.status, query.type);
  }
  @Get(':id/members')
  members(@CurrentUser() user: AuthenticatedUser, @Param() params: KhatmaIdParamDto) {
    return this.khatmas.members(user.id, params.id);
  }
  @Get(':id/invite')
  invite(@CurrentUser() user: AuthenticatedUser, @Param() params: KhatmaIdParamDto) {
    return this.khatmas.invite(user.id, params.id);
  }
}
