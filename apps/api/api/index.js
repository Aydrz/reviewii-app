const { NestFactory } = require('@nestjs/core');
const { ExpressAdapter } = require('@nestjs/platform-express');
const express = require('express');
const bodyParser = require('body-parser');
const helmet = require('helmet');

const server = express();
let app;

function loadServerlessModule() {
  const candidatePaths = [
    '../dist/apps/api/src/app.serverless.module',
    '../dist/src/app.serverless.module',
    '../dist/app.serverless.module',
    '../../dist/apps/api/src/app.serverless.module',
    '../../dist/src/app.serverless.module',
    '../../dist/app.serverless.module',
    './dist/apps/api/src/app.serverless.module',
    './dist/src/app.serverless.module',
    './dist/app.serverless.module',
  ];

  for (const p of candidatePaths) {
    try {
      const mod = require(p);
      if (mod && (mod.AppServerlessModule || mod.AppModule)) {
        return mod.AppServerlessModule || mod.AppModule;
      }
    } catch (e) {
      // try next path
    }
  }
  throw new Error(`Cannot locate compiled NestJS module in any of: ${candidatePaths.join(', ')}`);
}

async function bootstrap() {
  if (!app) {
    const AppServerlessModule = loadServerlessModule();
    const { ValidationPipe } = require('@nestjs/common');

    app = await NestFactory.create(AppServerlessModule, new ExpressAdapter(server), {
      bodyParser: false,
      logger: ['error', 'warn'],
    });

    const helmetFn = typeof helmet === 'function' ? helmet : helmet.default;
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

module.exports = async (req, res) => {
  try {
    await bootstrap();
    server(req, res);
  } catch (err) {
    console.error('Vercel serverless bootstrap error:', err);
    res.status(500).json({
      status: 'error',
      message: 'Serverless Handler Initialization Error',
      details: err && err.message ? err.message : String(err),
    });
  }
};
