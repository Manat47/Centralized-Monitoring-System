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
  async ingest(
    @Req()
    request: Request & {
      projectId?: string;
      tokenId?: string;
      requestId?: string;
      acceptedRecords?: number;
      rejectReason?: string;
    },
    @Headers('idempotency-key') idempotencyKey: string | undefined,
    @Body() body: unknown,
    @Query() query: Record<string, unknown>,
  ) {
    try {
      const result = await this.ingestService.ingest(
        request.projectId!,
        body,
        idempotencyKey,
        query,
        request.tokenId,
        request.requestId,
      );
      request.acceptedRecords = result.duplicate ? 0 : result.acceptedRecords;
      return result;
    } catch (error) {
      request.rejectReason =
        error instanceof Error ? error.message : 'Ingestion unavailable';
      throw error;
    }
  }
}
