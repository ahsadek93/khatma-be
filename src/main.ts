import { existsSync } from 'node:fs';
import { NestFactory } from '@nestjs/core';

if (existsSync('.env')) process.loadEnvFile('.env');

async function bootstrap() {
  const { AppModule } = await import('./app.module.js');
  const app = await NestFactory.create(AppModule);
  await app.listen(process.env.PORT ?? 3000);
}
await bootstrap();
