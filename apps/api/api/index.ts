import { NestFactory } from '@nestjs/core';
import { AppModule } from '../src/app.module';
import { ExpressAdapter } from '@nestjs/platform-express';
import express from 'express';

const server = express();
let isAppInitialized = false;
let initError: any = null;

async function bootstrap() {
  if (isAppInitialized || initError) return;
  try {
    const app = await NestFactory.create(AppModule, new ExpressAdapter(server), {
      logger: ['error', 'warn'],
    });
    app.enableCors({ origin: '*' });
    await app.init();
    isAppInitialized = true;
  } catch (err: any) {
    initError = err;
    console.error('NestJS Bootstrap Error:', err);
  }
}

export default async function handler(req: any, res: any) {
  try {
    await bootstrap();
    if (initError) {
      return res.status(500).json({
        status: 'error',
        message: 'NestJS Bootstrap Error Caught',
        error: String(initError && initError.message ? initError.message : initError),
        stack: String(initError && initError.stack ? initError.stack : ''),
      });
    }
    return server(req, res);
  } catch (err: any) {
    return res.status(500).json({
      status: 'error',
      message: 'Vercel Handler Exception',
      error: String(err && err.message ? err.message : err),
      stack: String(err && err.stack ? err.stack : ''),
    });
  }
}
