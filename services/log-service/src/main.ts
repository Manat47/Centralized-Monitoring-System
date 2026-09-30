import { HttpException, ValidationPipe } from '@nestjs/common';
import { NestFactory } from '@nestjs/core';
import type { NextFunction, Request, Response } from 'express';
import express from 'express';
import { AppModule } from './app.module';
import { IngestService } from './ingest.service';

async function bootstrap() {
  const app = await NestFactory.create(AppModule, { bodyParser: false });
  const ingest = app.get(IngestService);
  app.use(
    '/ingest/logs',
    (
      request: Request & { projectId?: string },
      response: Response,
      next: NextFunction,
    ) => {
      if (request.method !== 'POST') return next();
      void ingest
        .authenticate(request.headers.authorization)
        .then((projectId) => {
          request.projectId = projectId;
          next();
        })
        .catch((error: unknown) => {
          const status =
            error instanceof HttpException ? error.getStatus() : 503;
          response.status(status).json({
            statusCode: status,
            message:
              error instanceof HttpException
                ? error.message
                : 'Ingestion unavailable',
          });
        });
    },
  );
  app.use(express.json({ limit: '1mb' }));
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
    }),
  );
  await app.listen(process.env.PORT ?? 3007);
}
void bootstrap();
