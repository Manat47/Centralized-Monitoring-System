import { HttpService } from '@nestjs/axios';
import {
  BadGatewayException,
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { isAxiosError } from 'axios';
import { firstValueFrom } from 'rxjs';

export type LifecycleAction = 'ACTIVATE' | 'INACTIVATE' | 'DEACTIVATE';
export type ResourceEffect = 'NONE' | 'RESUME' | 'PAUSE' | 'STOP';
export type AlertEffect = 'UNCHANGED' | 'RETAIN' | 'RESOLVE';

interface AssetResponse {
  assetId: string;
  name: string;
  status: LifecycleAction;
}

interface ResourceCount {
  configured: number;
  enabled: number;
}

interface MonitoringImpactResponse {
  monitoringTargets: ResourceCount;
  healthChecks: ResourceCount;
  metricRules: ResourceCount;
}

interface AlertImpactResponse {
  triggered: number;
  acknowledged: number;
  total: number;
}

export interface AssetLifecycleImpactResponse {
  assetId: string;
  assetName: string;
  currentStatus: LifecycleAction;
  targetStatus: LifecycleAction;
  terminal: boolean;
  readOnlyAfter: boolean;
  resources: {
    monitoringTargets: ResourceCount & { effect: ResourceEffect };
    healthChecks: ResourceCount & { effect: ResourceEffect };
    metricRules: ResourceCount & { effect: ResourceEffect };
  };
  alerts: AlertImpactResponse & {
    effect: AlertEffect;
    resolutionIsAsynchronous: boolean;
  };
  historyPreserved: true;
}

@Injectable()
export class AssetLifecycleImpactService {
  constructor(
    private readonly httpService: HttpService,
    private readonly configService: ConfigService,
  ) {}

  async getImpact(
    assetId: string,
    action: string,
  ): Promise<AssetLifecycleImpactResponse> {
    const targetStatus = this.parseAction(action);
    const assetServiceUrl = this.getServiceUrl(
      'ASSET_SERVICE_URL',
      'http://localhost:3000',
    );
    const monitoringServiceUrl = this.getServiceUrl(
      'MONITORING_SERVICE_URL',
      'http://localhost:3001',
    );
    const alertingServiceUrl = this.getServiceUrl(
      'ALERTING_SERVICE_URL',
      'http://localhost:3002',
    );
    const asset = await this.getAsset(`${assetServiceUrl}/assets/${assetId}`);

    this.validateTransition(asset.status, targetStatus);

    const [monitoring, alerts] = await Promise.all([
      this.get<MonitoringImpactResponse>(
        `${monitoringServiceUrl}/asset-lifecycle-impact/${assetId}`,
      ),
      this.get<AlertImpactResponse>(
        `${alertingServiceUrl}/alerts/asset/${assetId}/lifecycle-impact`,
      ),
    ]);
    const resourceEffect = this.getResourceEffect(targetStatus);
    const withEffect = (resource: ResourceCount) => ({
      ...resource,
      effect: resource.enabled > 0 ? resourceEffect : ('NONE' as const),
    });

    return {
      assetId: asset.assetId,
      assetName: asset.name,
      currentStatus: asset.status,
      targetStatus,
      terminal: targetStatus === 'DEACTIVATE',
      readOnlyAfter: targetStatus === 'DEACTIVATE',
      resources: {
        monitoringTargets: withEffect(monitoring.monitoringTargets),
        healthChecks: withEffect(monitoring.healthChecks),
        metricRules: withEffect(monitoring.metricRules),
      },
      alerts: {
        ...alerts,
        effect:
          targetStatus === 'DEACTIVATE' && alerts.total > 0
            ? 'RESOLVE'
            : targetStatus === 'INACTIVATE'
              ? 'RETAIN'
              : 'UNCHANGED',
        resolutionIsAsynchronous:
          targetStatus === 'DEACTIVATE' && alerts.total > 0,
      },
      historyPreserved: true,
    };
  }

  private parseAction(action: string): LifecycleAction {
    if (
      action !== 'ACTIVATE' &&
      action !== 'INACTIVATE' &&
      action !== 'DEACTIVATE'
    ) {
      throw new BadRequestException('Invalid asset lifecycle action');
    }

    return action;
  }

  private validateTransition(
    currentStatus: LifecycleAction,
    targetStatus: LifecycleAction,
  ): void {
    const allowed =
      (currentStatus === 'ACTIVATE' &&
        (targetStatus === 'INACTIVATE' || targetStatus === 'DEACTIVATE')) ||
      (currentStatus === 'INACTIVATE' &&
        (targetStatus === 'ACTIVATE' || targetStatus === 'DEACTIVATE'));

    if (!allowed) {
      throw new BadRequestException(
        `Asset cannot transition from ${currentStatus} to ${targetStatus}`,
      );
    }
  }

  private getResourceEffect(action: LifecycleAction): ResourceEffect {
    if (action === 'ACTIVATE') {
      return 'RESUME';
    }

    if (action === 'INACTIVATE') {
      return 'PAUSE';
    }

    return 'STOP';
  }

  private getServiceUrl(key: string, fallback: string): string {
    return this.configService.get<string>(key) ?? fallback;
  }

  private async getAsset(url: string): Promise<AssetResponse> {
    try {
      const response = await firstValueFrom(
        this.httpService.get<AssetResponse>(url),
      );
      return response.data;
    } catch (error) {
      if (isAxiosError(error) && error.response?.status === 404) {
        throw new NotFoundException('Asset not found');
      }

      throw new BadGatewayException('Failed to load asset lifecycle');
    }
  }

  private async get<T>(url: string): Promise<T> {
    try {
      const response = await firstValueFrom(this.httpService.get<T>(url));
      return response.data;
    } catch (error) {
      if (
        error instanceof BadRequestException ||
        error instanceof NotFoundException
      ) {
        throw error;
      }

      throw new BadGatewayException('Failed to load lifecycle impact');
    }
  }
}
