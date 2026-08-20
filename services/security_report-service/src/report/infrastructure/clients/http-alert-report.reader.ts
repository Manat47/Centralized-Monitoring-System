import { HttpService } from '@nestjs/axios';
import { Injectable, ServiceUnavailableException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { AxiosError } from 'axios';
import { firstValueFrom } from 'rxjs';

import type {
  AlertReportReader,
  AlertReportSummary,
} from '../../domain/ports/alert-report-reader.port';

@Injectable()
export class HttpAlertReportReader implements AlertReportReader {
  private readonly alertingServiceUrl: string;

  constructor(
    private readonly httpService: HttpService,
    private readonly configService: ConfigService,
  ) {
    const alertingServiceUrl = this.configService.get<string>(
      'ALERTING_SERVICE_URL',
    );

    if (!alertingServiceUrl) {
      throw new Error('ALERTING_SERVICE_URL is not defined');
    }

    this.alertingServiceUrl = alertingServiceUrl.replace(/\/$/, '');
  }

  async querySummary(input: {
    assetId?: string;
    from: Date;
    to: Date;
  }): Promise<AlertReportSummary> {
    try {
      const response = await firstValueFrom(
        this.httpService.get<AlertReportSummary>(
          `${this.alertingServiceUrl}/alerts/report-summary`,
          {
            params: {
              assetId: input.assetId,
              from: input.from.toISOString(),
              to: input.to.toISOString(),
            },
            timeout: 5000,
          },
        ),
      );

      return response.data;
    } catch (error) {
      this.handleError(error);
    }
  }

  private handleError(error: unknown): never {
    if (error instanceof AxiosError) {
      if (error.code === 'ECONNABORTED') {
        throw new ServiceUnavailableException(
          'Alerting Service request timed out',
        );
      }

      if (!error.response) {
        throw new ServiceUnavailableException(
          'Alerting Service is unavailable',
        );
      }

      throw new ServiceUnavailableException(
        `Alerting Service returned HTTP ${error.response.status}`,
      );
    }

    throw error;
  }
}
