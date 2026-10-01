import { HttpException, ValidationPipe } from '@nestjs/common';
import { NestFactory } from '@nestjs/core';
import type { NextFunction, Request, Response } from 'express';
import express from 'express';
import { AppModule } from './app.module';
import { IngestService } from './ingest.service';
import { LogInfrastructure } from './log.infrastructure';
import { ProcessActivityEventUseCase } from './log-events/application/use-cases/process-activity-event.use-case';
import { randomUUID } from 'node:crypto';

async function bootstrap() {
  const app = await NestFactory.create(AppModule, { bodyParser: false });
  const ingest = app.get(IngestService);
  const infrastructure = app.get(LogInfrastructure);
  const processEvents = app.get(ProcessActivityEventUseCase);
  app.use(
    '/ingest/logs',
    (
      request: Request & {
        projectId?: string;
        tokenId?: string;
        requestId?: string;
        acceptedRecords?: number;
        rejectReason?: string;
      },
      response: Response,
      next: NextFunction,
    ) => {
      if (request.method !== 'POST') return next();
      request.requestId = randomUUID();
      const receivedAt = new Date().toISOString();
      response.on('finish', () => {
        const field =
          response.statusCode === 202
            ? 'accepted_requests'
            : response.statusCode === 400 || response.statusCode === 413
              ? 'rejected_schema'
              : response.statusCode === 429
                ? 'rejected_rate_limit'
                : response.statusCode === 503
                  ? 'rejected_queue_or_service'
                  : response.statusCode === 401
                    ? 'rejected_token'
                    : 'rejected_other';
        void infrastructure
          .recordAggregate(request.projectId ?? null, field)
          .catch(() => undefined);
        void processEvents
          .executeRequest({
            requestId: request.requestId!,
            projectId: request.projectId ?? null,
            tokenId: request.tokenId ?? null,
            receivedAt,
            httpStatus: response.statusCode,
            reason:
              response.statusCode === 202
                ? null
                : (request.rejectReason ?? field),
            acceptedRecords: request.acceptedRecords ?? 0,
          })
          .catch(() => undefined);
      });
      void ingest
        .authenticate(request.headers.authorization)
        .then((identity) => {
          request.projectId = identity.projectId;
          request.tokenId = identity.tokenId;
          next();
        })
        .catch((error: unknown) => {
          if (
            error instanceof HttpException &&
            'projectId' in error &&
            typeof error.projectId === 'string'
          ) {
            request.projectId = error.projectId;
            if ('tokenId' in error && typeof error.tokenId === 'string')
              request.tokenId = error.tokenId;
          }
          request.rejectReason =
            error instanceof Error
              ? error.message
              : 'Authentication unavailable';
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
