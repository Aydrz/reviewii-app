import { NestFactory } from '@nestjs/core';
import { AppModule } from '../src/app.module';
import { ValidationPipe } from '@nestjs/common';

let expressApp: any;

async function bootstrap() {
  const app = await NestFactory.create(AppModule, {
    logger: ['error', 'warn', 'log'],
  });

  const frontendUrl = process.env.FRONTEND_URL || 'http://localhost:3000';
  app.enableCors({
    origin: [frontendUrl, 'http://localhost:3000', 'https://*.vercel.app', 'https://*.netlify.app'],
    credentials: true,
    methods: ['GET', 'POST', 'PATCH', 'PUT', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With'],
  });

  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      transform: true,
      forbidUnknownValues: false,
    }),
  );

  await app.init();
  expressApp = app.getHttpAdapter().getInstance();
}

export default async function handler(req: any, res: any) {
  try {
    if (!expressApp) {
      await bootstrap();
    }
    return expressApp(req, res);
  } catch (err: any) {
    console.error('Vercel Handler Error:', err);
    res.status(500).json({
      status: 'error',
      message: 'Serverless Handler Initialization Error',
      details: err && err.stack ? err.stack : (err && err.message ? err.message : String(err)),
    });
  }
}
