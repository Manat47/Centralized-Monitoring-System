import {
  Body,
  Controller,
  Headers,
  HttpCode,
  Post,
  Query,
  Req,
} from '@nestjs/common';
import type { Request } from 'express';
import { IngestService } from './ingest.service';

@Controller('ingest')
export class IngestController {
  constructor(private readonly ingestService: IngestService) {}

  @Post('logs')
  @HttpCode(202)
  ingest(
    @Req() request: Request & { projectId?: string },
    @Headers('idempotency-key') idempotencyKey: string | undefined,
    @Body() body: unknown,
    @Query() query: Record<string, unknown>,
  ) {
    return this.ingestService.ingest(
      request.projectId!,
      body,
      idempotencyKey,
      query,
    );
  }
}
