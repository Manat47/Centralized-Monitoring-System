import { HttpService } from '@nestjs/axios';
import { Injectable, ServiceUnavailableException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { AxiosError } from 'axios';
import { firstValueFrom } from 'rxjs';

import type {
  HealthCheckTargetSnapshot,
  HealthReportSummary,
  MetricsReportSummary,
  MonitoringReportReader,
} from '../../domain/ports/monitoring-report-reader.port';

@Injectable()
export class HttpMonitoringReportReader implements MonitoringReportReader {
  private readonly monitoringServiceUrl: string;

  constructor(
    private readonly httpService: HttpService,
    private readonly configService: ConfigService,
  ) {
    const monitoringServiceUrl = this.configService.get<string>(
      'MONITORING_SERVICE_URL',
    );

    if (!monitoringServiceUrl) {
      throw new Error('MONITORING_SERVICE_URL is not defined');
    }

    this.monitoringServiceUrl = monitoringServiceUrl.replace(/\/$/, '');
  }

  async queryMetricsSummary(input: {
    assetId: string;
    start: Date;
    end: Date;
  }): Promise<MetricsReportSummary> {
    try {
      const response = await firstValueFrom(
        this.httpService.get<MetricsReportSummary>(
          `${this.monitoringServiceUrl}/monitoring-targets/${input.assetId}/metrics/report-summary`,
          {
            params: {
              start: input.start.toISOString(),
              end: input.end.toISOString(),
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

  async findHealthCheckTargets(): Promise<HealthCheckTargetSnapshot[]> {
    try {
      const response = await firstValueFrom(
        this.httpService.get<HealthCheckTargetSnapshot[]>(
          `${this.monitoringServiceUrl}/health-check-targets`,
          {
            timeout: 5000,
          },
        ),
      );

      return response.data;
    } catch (error) {
      this.handleError(error);
    }
  }

  async queryHealthSummary(input: {
    healthCheckTargetId: string;
    start: Date;
    end: Date;
  }): Promise<HealthReportSummary> {
    try {
      const response = await firstValueFrom(
        this.httpService.get<HealthReportSummary>(
          `${this.monitoringServiceUrl}/health-check-targets/${input.healthCheckTargetId}/report-summary`,
          {
            params: {
              start: input.start.toISOString(),
              end: input.end.toISOString(),
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
          'Monitoring Service request timed out',
        );
      }

      if (!error.response) {
        throw new ServiceUnavailableException(
          'Monitoring Service is unavailable',
        );
      }

      throw new ServiceUnavailableException(
        `Monitoring Service returned HTTP ${error.response.status}`,
      );
    }

    throw error;
  }
}
