import { Controller, Get } from '@nestjs/common';

@Controller()
export class AppController {
  @Get()
  getRoot() {
    return {
      status: 'online',
      name: 'Reviewii NestJS API',
      version: '1.0.0',
      timestamp: new Date().toISOString(),
    };
  }
}
