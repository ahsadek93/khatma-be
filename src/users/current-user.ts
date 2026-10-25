import { createParamDecorator, ExecutionContext } from '@nestjs/common';
import type { Request } from 'express';

export type AuthenticatedUser = { id: string; email: string };
type AuthenticatedRequest = Request & { user: AuthenticatedUser };

export const CurrentUser = createParamDecorator(
  (_: unknown, context: ExecutionContext) => context.switchToHttp().getRequest<AuthenticatedRequest>().user,
);
