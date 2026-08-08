import { NestFactory } from '@nestjs/core';
import { AppServerlessModule } from '../src/app.serverless.module';
import { ValidationPipe } from '@nestjs/common';
import { NestExpressApplication } from '@nestjs/platform-express';
import helmet from 'helmet';

let expressApp: any;

async function bootstrap() {
  const app = await NestFactory.create<NestExpressApplication>(AppServerlessModule, {
    bodyParser: false,
    logger: ['error', 'warn'],
  });

  app.use(
    helmet({
      contentSecurityPolicy: false,
      crossOriginResourcePolicy: { policy: 'cross-origin' },
      crossOriginEmbedderPolicy: false,
    }),
  );

  const bodyParser = require('body-parser');
  app.use(bodyParser.json({ limit: '50mb' }));
  app.use(bodyParser.urlencoded({ extended: true, limit: '50mb' }));

  const frontendUrl = process.env.FRONTEND_URL || 'http://localhost:3000';
  app.enableCors({
    origin: true,
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
  } catch (err) {
    console.error('Serverless handler error:', err);
    res.status(500).json({ message: 'Internal server error', error: String(err) });
  }
}
