import { NestFactory } from '@nestjs/core';
import { AppModule } from '../src/app.module';
import { ValidationPipe } from '@nestjs/common';
import { NestExpressApplication } from '@nestjs/platform-express';
import helmet from 'helmet';
import * as path from 'path';
import * as fs from 'fs';
import * as os from 'os';
import { AllExceptionsFilter } from '../src/common/all-exceptions.filter';

let expressApp: any;

async function bootstrap() {
  const app = await NestFactory.create<NestExpressApplication>(AppModule, {
    bodyParser: false,
    logger: ['error', 'warn'],
  });

  const helmetFn = typeof helmet === 'function' ? helmet : (helmet as any).default;
  if (typeof helmetFn === 'function') {
    app.use(
      helmetFn({
        contentSecurityPolicy: false,
        crossOriginResourcePolicy: { policy: 'cross-origin' },
        crossOriginEmbedderPolicy: false,
      }),
    );
  }

  const bodyParser = require('body-parser');
  app.use(bodyParser.json({ limit: '50mb' }));
  app.use(bodyParser.urlencoded({ extended: true, limit: '50mb' }));

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

  app.useGlobalFilters(new AllExceptionsFilter());

  const uploadsDir = path.join(os.tmpdir(), 'uploads');
  try {
    if (!fs.existsSync(uploadsDir)) {
      fs.mkdirSync(uploadsDir, { recursive: true });
    }
    app.useStaticAssets(uploadsDir, {
      prefix: '/uploads/',
    });
  } catch (err) {}

  await app.init();
  expressApp = app.getHttpAdapter().getInstance();
}

export default async function handler(req: any, res: any) {
  if (!expressApp) {
    await bootstrap();
  }
  return expressApp(req, res);
}
