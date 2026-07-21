import { HttpService } from '@nestjs/axios';
import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { firstValueFrom } from 'rxjs';

interface AssetResponse {
  status: string;
}

interface MonitoringTargetResponse {
  monitoringEnabled: boolean;
}

interface MetricRuleResponse {
  enabled: boolean;
}

interface AlertResponse {
  severity: string;
  status: string;
}

interface AlertListResponse {
  items: AlertResponse[];
  total: number;
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

    const [assetsResponse, targetsResponse, rulesResponse, alertsResponse] =
      await Promise.all([
        firstValueFrom(
          this.httpService.get<AssetResponse[]>(`${assetServiceUrl}/assets`),
        ),
        firstValueFrom(
          this.httpService.get<MonitoringTargetResponse[]>(
            `${monitoringServiceUrl}/monitoring-targets`,
          ),
        ),
        firstValueFrom(
          this.httpService.get<MetricRuleResponse[]>(
            `${monitoringServiceUrl}/metric-rules`,
          ),
        ),
        firstValueFrom(
          this.httpService.get<AlertListResponse>(
            `${alertingServiceUrl}/alerts?page=1&limit=100`,
          ),
        ),
      ]);

    const assets = assetsResponse.data;
    const targets = targetsResponse.data;
    const rules = rulesResponse.data;
    const alerts = alertsResponse.data.items;

    return {
      assets: {
        total: assets.length,
        active: assets.filter((asset) => asset.status === 'ACTIVATE').length,
      },

      monitoringTargets: {
        total: targets.length,
        enabled: targets.filter((target) => target.monitoringEnabled).length,
      },

      metricRules: {
        total: rules.length,
        enabled: rules.filter((rule) => rule.enabled).length,
      },

      alerts: {
        total: alertsResponse.data.total,
        active: alerts.filter(
          (alert) =>
            alert.status === 'TRIGGERED' || alert.status === 'ACKNOWLEDGED',
        ).length,
        critical: alerts.filter((alert) => alert.severity === 'CRITICAL')
          .length,
      },
    };
  }
}
