import { NestFactory } from '@nestjs/core';
import { ExpressAdapter } from '@nestjs/platform-express';
import express from 'express';
import bodyParser from 'body-parser';
import helmet from 'helmet';
import { AppServerlessModule } from '../src/app.serverless.module';
import { ValidationPipe } from '@nestjs/common';

const server = express();
let app: any;

async function bootstrap() {
  if (!app) {
    app = await NestFactory.create(AppServerlessModule, new ExpressAdapter(server), {
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

    await app.init();
  }
}

export default async function handler(req: any, res: any) {
  try {
    await bootstrap();
    server(req, res);
  } catch (err: any) {
    console.error('Vercel serverless error:', err);
    res.status(500).json({
      status: 'error',
      message: 'Serverless Handler Initialization Error',
      details: err && err.stack ? err.stack : (err && err.message ? err.message : String(err)),
    });
  }
}
