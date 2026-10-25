import { Controller, Get } from '@nestjs/common';
import { Public } from '../auth/public.decorator.js';

@Public()
@Controller('health')
export class HealthController {
  @Get()
  getHealth() {
    return { status: 'ok' };
  }
}
