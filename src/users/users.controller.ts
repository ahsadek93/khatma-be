import { Controller, Get } from '@nestjs/common';
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
}
