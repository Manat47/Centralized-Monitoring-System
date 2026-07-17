import { NestFactory } from '@nestjs/core';
import { createProxyMiddleware } from 'http-proxy-middleware';

import { AppModule } from './app.module';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);

  app.enableCors({
    origin: process.env.FRONTEND_URL ?? 'http://localhost:3010',
    credentials: true,
  });

  const alertingServiceUrl =
    process.env.ALERTING_SERVICE_URL ?? 'http://localhost:3002';

  const assetServiceUrl =
    process.env.ASSET_SERVICE_URL ?? 'http://localhost:3000';

  const monitoringServiceUrl =
    process.env.MONITORING_SERVICE_URL ?? 'http://localhost:3001';

  app.use(
    '/api/alerts',
    createProxyMiddleware({
      target: `${alertingServiceUrl}/alerts`,
      changeOrigin: true,
    }),
  );
  app.use(
    '/api/assets',
    createProxyMiddleware({
      target: `${assetServiceUrl}/assets`,
      changeOrigin: true,
    }),
  );
  app.use(
    createProxyMiddleware({
      target: monitoringServiceUrl,
      changeOrigin: true,

      pathFilter: [
        '/api/monitoring-targets',
        '/api/metric-rules',
        '/api/metrics',
      ],

      pathRewrite: {
        '^/api': '',
      },
    }),
  );

  app.setGlobalPrefix('api');

  await app.listen(Number(process.env.PORT ?? 3005));
}

void bootstrap();
