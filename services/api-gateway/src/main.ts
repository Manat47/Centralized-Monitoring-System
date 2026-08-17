import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import { NestFactory } from '@nestjs/core';
import { createProxyMiddleware } from 'http-proxy-middleware';

import { AppModule } from './app.module';
import { createGatewayAuthMiddleware } from './auth/gateway-auth.middleware';
import { gatewayAuthorizationMiddleware } from './auth/gateway-authorization.middleware';
import { HttpMetricsMiddleware } from './metrics/http-metrics.middleware';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);

  const configService = app.get(ConfigService);
  const jwtService = app.get(JwtService);
  const httpMetricsMiddleware = app.get(HttpMetricsMiddleware);

  app.enableCors({
    origin: process.env.FRONTEND_URL ?? 'http://localhost:3010',
    credentials: true,
  });

  app.use('/api', httpMetricsMiddleware.use.bind(httpMetricsMiddleware));

  app.use('/api', createGatewayAuthMiddleware(jwtService, configService));

  app.use('/api', gatewayAuthorizationMiddleware);

  const alertingServiceUrl =
    process.env.ALERTING_SERVICE_URL ?? 'http://localhost:3002';

  const assetServiceUrl =
    process.env.ASSET_SERVICE_URL ?? 'http://localhost:3000';

  const monitoringServiceUrl =
    process.env.MONITORING_SERVICE_URL ?? 'http://localhost:3001';

  const authServiceUrl =
    process.env.AUTH_SERVICE_URL ?? 'http://localhost:3004';

  app.use(
    '/api/auth',
    createProxyMiddleware({
      target: `${authServiceUrl}/auth`,
      changeOrigin: true,
    }),
  );

  app.use(
    '/api/users',
    createProxyMiddleware({
      target: `${authServiceUrl}/users`,
      changeOrigin: true,
    }),
  );

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
        '/api/health-check-targets',
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
