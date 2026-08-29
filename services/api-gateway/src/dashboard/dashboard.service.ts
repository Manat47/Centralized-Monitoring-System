import { HttpService } from '@nestjs/axios';
import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { firstValueFrom } from 'rxjs';

import {
  type AlertResponse,
  type AssetResponse,
  buildDashboardOverview,
  type HealthCheckTargetResponse,
  type LatestMetricsSummaryResponse,
  type MonitoringTargetResponse,
} from './dashboard-overview';

interface AlertListResponse {
  items: AlertResponse[];
  totalPages: number;
}

@Injectable()
export class DashboardService {
  constructor(
    private readonly httpService: HttpService,
    private readonly configService: ConfigService,
  ) {}

  async getSummary() {
    const assetServiceUrl =
      this.configService.get<string>('ASSET_SERVICE_URL') ??
      'http://localhost:3000';
    const monitoringServiceUrl =
      this.configService.get<string>('MONITORING_SERVICE_URL') ??
      'http://localhost:3001';
    const alertingServiceUrl =
      this.configService.get<string>('ALERTING_SERVICE_URL') ??
      'http://localhost:3002';

    const [assets, targets, healthTargets, metrics, triggered, acknowledged] =
      await Promise.all([
        this.get<AssetResponse[]>(`${assetServiceUrl}/assets`),
        this.get<MonitoringTargetResponse[]>(
          `${monitoringServiceUrl}/monitoring-targets`,
        ),
        this.get<HealthCheckTargetResponse[]>(
          `${monitoringServiceUrl}/health-check-targets`,
        ),
        this.get<LatestMetricsSummaryResponse[]>(
          `${monitoringServiceUrl}/monitoring-targets/metrics/latest-summaries`,
        ),
        this.getAllAlerts(alertingServiceUrl, 'TRIGGERED'),
        this.getAllAlerts(alertingServiceUrl, 'ACKNOWLEDGED'),
      ]);

    return buildDashboardOverview({
      assets,
      monitoringTargets: targets,
      healthCheckTargets: healthTargets,
      alerts: [...triggered, ...acknowledged],
      metrics,
    });
  }

  private async get<T>(url: string): Promise<T> {
    const response = await firstValueFrom(this.httpService.get<T>(url));
    return response.data;
  }

  private async getAllAlerts(
    alertingServiceUrl: string,
    status: 'TRIGGERED' | 'ACKNOWLEDGED',
  ): Promise<AlertResponse[]> {
    const firstPage = await this.get<AlertListResponse>(
      `${alertingServiceUrl}/alerts?status=${status}&page=1&limit=100`,
    );

    if (firstPage.totalPages <= 1) {
      return firstPage.items;
    }

    const remainingPages = await Promise.all(
      Array.from({ length: firstPage.totalPages - 1 }, (_, index) =>
        this.get<AlertListResponse>(
          `${alertingServiceUrl}/alerts?status=${status}&page=${index + 2}&limit=100`,
        ),
      ),
    );

    return [
      ...firstPage.items,
      ...remainingPages.flatMap((page) => page.items),
    ];
  }
}
