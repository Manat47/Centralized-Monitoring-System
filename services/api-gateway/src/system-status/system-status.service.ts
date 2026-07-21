import { HttpService } from '@nestjs/axios';
import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { AxiosError } from 'axios';
import { firstValueFrom } from 'rxjs';

export type ServiceStatus = 'UP' | 'DOWN';

export interface ServiceHealthResult {
  name: string;
  status: ServiceStatus;
  responseTimeMs: number | null;
  error: string | null;
}

export interface SystemStatusResponse {
  status: 'HEALTHY' | 'DEGRADED';
  checkedAt: string;
  services: ServiceHealthResult[];
}

@Injectable()
export class SystemStatusService {
  constructor(
    private readonly httpService: HttpService,
    private readonly configService: ConfigService,
  ) {}

  async getStatus(): Promise<SystemStatusResponse> {
    const assetServiceUrl =
      this.configService.get<string>('ASSET_SERVICE_URL') ??
      'http://localhost:3000';

    const monitoringServiceUrl =
      this.configService.get<string>('MONITORING_SERVICE_URL') ??
      'http://localhost:3001';

    const alertingServiceUrl =
      this.configService.get<string>('ALERTING_SERVICE_URL') ??
      'http://localhost:3002';

    const notificationServiceUrl =
      this.configService.get<string>('NOTIFICATION_SERVICE_URL') ??
      'http://localhost:3003';

    const services = await Promise.all([
      this.checkService('Asset Service', `${assetServiceUrl}/health`),
      this.checkService(
        'Monitoring Service',
        `${monitoringServiceUrl}/health/ready`,
      ),
      this.checkService('Alerting Service', `${alertingServiceUrl}/health`),
      this.checkService(
        'Notification Service',
        `${notificationServiceUrl}/health`,
      ),
    ]);

    return {
      status: services.every((service) => service.status === 'UP')
        ? 'HEALTHY'
        : 'DEGRADED',

      checkedAt: new Date().toISOString(),
      services,
    };
  }
  private async checkService(
    name: string,
    url: string,
  ): Promise<ServiceHealthResult> {
    const startedAt = Date.now();

    try {
      await firstValueFrom(
        this.httpService.get(url, {
          timeout: 3000,
        }),
      );

      return {
        name,
        status: 'UP',
        responseTimeMs: Date.now() - startedAt,
        error: null,
      };
    } catch (error) {
      return {
        name,
        status: 'DOWN',
        responseTimeMs: null,
        error: this.getErrorMessage(error),
      };
    }
  }

  private getErrorMessage(error: unknown): string {
    if (error instanceof AxiosError) {
      if (error.code === 'ECONNABORTED') {
        return 'Health check timed out';
      }

      if (error.response) {
        return `Health check returned HTTP ${error.response.status}`;
      }

      if (error.code === 'ECONNREFUSED') {
        return 'Connection refused';
      }

      return error.message;
    }

    if (error instanceof Error) {
      return error.message;
    }

    return 'Unknown health check error';
  }
}
