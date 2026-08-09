import { Controller, Get } from '@nestjs/common';

@Controller()
export class AppController {
  @Get()
  getRoot() {
    const rawUrl = process.env.DATABASE_URL || '';
    const hostMatch = rawUrl.match(/@([^:\/]+)/);
    const dbHost = hostMatch ? hostMatch[1] : 'not-found';

    return {
      status: 'online',
      name: 'Reviewii NestJS API',
      version: '1.0.0',
      dbHost,
      timestamp: new Date().toISOString(),
    };
  }
}
