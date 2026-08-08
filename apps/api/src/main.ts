import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { ValidationPipe } from '@nestjs/common';
import { NestExpressApplication } from '@nestjs/platform-express';
import helmet from 'helmet';
import * as path from 'path';
import * as fs from 'fs';

async function bootstrap() {
  const app = await NestFactory.create<NestExpressApplication>(AppModule, {
    bodyParser: false,
  });

  // Security Headers via Helmet
  app.use(
    helmet({
      contentSecurityPolicy: false, // Disabled for static media streaming & cross-origin canvas
      crossOriginResourcePolicy: { policy: 'cross-origin' },
      crossOriginEmbedderPolicy: false,
    }),
  );

  // Body parser limit (10MB for JSON, video streaming handled via Multer)
  const bodyParser = require('body-parser');
  app.use(bodyParser.json({ limit: '10mb' }));
  app.use(bodyParser.urlencoded({ extended: true, limit: '10mb' }));

  // CORS Configuration
  const frontendUrl = process.env.FRONTEND_URL || 'http://localhost:3000';
  app.enableCors({
    origin: [frontendUrl, 'http://localhost:3000', 'https://*.vercel.app', 'https://*.netlify.app'],
    credentials: true,
    methods: ['GET', 'POST', 'PATCH', 'PUT', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With'],
  });

  // Global Input Validation & Sanitization Pipe
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      transform: true,
      forbidUnknownValues: false,
    }),
  );

  // Serve static uploads
  const uploadsDir = path.join(process.cwd(), 'uploads');
  if (!fs.existsSync(uploadsDir)) {
    fs.mkdirSync(uploadsDir, { recursive: true });
  }
  app.useStaticAssets(uploadsDir, {
    prefix: '/uploads/',
  });

  await app.init();
  expressApp = app.getHttpAdapter().getInstance();

  if (!process.env.VERCEL) {
    const port = process.env.PORT || 3001;
    await app.listen(port);
    console.log(`🚀 Reviewii NestJS API server running on http://localhost:${port}`);
  }
}

bootstrap();

export default async function handler(req: any, res: any) {
  if (!expressApp) {
    await bootstrap();
  }
  return expressApp(req, res);
}
