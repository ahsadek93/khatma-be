import { Body, Controller, Get, Patch } from '@nestjs/common';
import { UpdateDisplayNameDto } from './users.dto.js';
import { CurrentUser } from './current-user.js';
import type { AuthenticatedUser } from './current-user.js';
import { UsersService } from './users.service.js';

@Controller('users')
export class UsersController {
  constructor(private readonly users: UsersService) {}

  @Get('me')
  getMe(@CurrentUser() user: AuthenticatedUser) {
    return this.users.getProfile(user.id);
  }

  @Patch('me')
  updateMe(@CurrentUser() user: AuthenticatedUser, @Body() body: UpdateDisplayNameDto) {
    return this.users.updateDisplayName(user.id, body.displayName);
  }
}
