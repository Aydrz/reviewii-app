import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { ValidationPipe } from '@nestjs/common';
import { NestExpressApplication } from '@nestjs/platform-express';
import helmet from 'helmet';
import * as path from 'path';
import * as fs from 'fs';
import * as os from 'os';

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

  const uploadsDir = process.env.VERCEL
    ? path.join(os.tmpdir(), 'uploads')
    : path.join(process.cwd(), 'uploads');

  try {
    if (!fs.existsSync(uploadsDir)) {
      fs.mkdirSync(uploadsDir, { recursive: true });
    }
    app.useStaticAssets(uploadsDir, {
      prefix: '/uploads/',
    });
  } catch (err) {
    // Ignore static assets errors on read-only serverless environment
  }

  await app.init();
  expressApp = app.getHttpAdapter().getInstance();

  if (!process.env.VERCEL) {
    const port = process.env.PORT || 3001;
    await app.listen(port);
  }
}

if (!process.env.VERCEL) {
  bootstrap();
}

export default async function handler(req: any, res: any) {
  try {
    if (!expressApp) {
      await bootstrap();
    }
    return expressApp(req, res);
  } catch (err: any) {
    console.error('Vercel serverless main handler error:', err);
    return res.status(500).json({
      status: 'error',
      message: 'Serverless Handler Execution Error',
      error: String(err && err.message ? err.message : err),
      stack: String(err && err.stack ? err.stack : ''),
    });
  }
}
