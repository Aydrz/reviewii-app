const { NestFactory } = require('@nestjs/core');
const { ExpressAdapter } = require('@nestjs/platform-express');
const express = require('express');
const bodyParser = require('body-parser');
const helmet = require('helmet');

const server = express();
let app;

async function bootstrap() {
  if (!app) {
    // Import compiled NestJS serverless module from dist
    let modulePath;
    try {
      modulePath = require.resolve('../dist/apps/api/src/app.serverless.module');
    } catch {
      modulePath = require.resolve('../dist/app.serverless.module');
    }

    const { AppServerlessModule } = require(modulePath);
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
    console.error('Vercel serverless error:', err);
    res.status(500).json({
      status: 'error',
      message: 'Serverless Handler Initialization Error',
      details: err && err.message ? err.message : String(err),
    });
  }
};
