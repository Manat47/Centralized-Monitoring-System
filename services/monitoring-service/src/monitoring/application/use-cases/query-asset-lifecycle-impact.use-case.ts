import { Inject, Injectable } from '@nestjs/common';

import {
  HEALTH_CHECK_TARGET_REPOSITORY,
  type HealthCheckTargetRepository,
} from '../../domain/repositories/health-check-target.repository';
import {
  METRIC_RULE_REPOSITORY,
  type MetricRuleRepository,
} from '../../domain/repositories/metric-rule.repository';
import {
  MONITORING_TARGET_REPOSITORY,
  type MonitoringTargetRepository,
} from '../../domain/repositories/monitoring-target.repository';

export interface LifecycleResourceCount {
  configured: number;
  enabled: number;
}

export interface AssetMonitoringLifecycleImpact {
  monitoringTargets: LifecycleResourceCount;
  healthChecks: LifecycleResourceCount;
  metricRules: LifecycleResourceCount;
}

@Injectable()
export class QueryAssetLifecycleImpactUseCase {
  constructor(
    @Inject(MONITORING_TARGET_REPOSITORY)
    private readonly monitoringTargetRepository: MonitoringTargetRepository,
    @Inject(HEALTH_CHECK_TARGET_REPOSITORY)
    private readonly healthCheckTargetRepository: HealthCheckTargetRepository,
    @Inject(METRIC_RULE_REPOSITORY)
    private readonly metricRuleRepository: MetricRuleRepository,
  ) {}

  async execute(assetId: string): Promise<AssetMonitoringLifecycleImpact> {
    const [monitoringTargets, allHealthChecks, metricRuleItems] =
      await Promise.all([
        this.monitoringTargetRepository.findAllByAssetId(assetId),
        this.healthCheckTargetRepository.findAllByAssetId(assetId),
        this.metricRuleRepository.findByAssetId(assetId),
      ]);

    const healthChecks = allHealthChecks.filter(
      (target) => !target.toObject().archivedAt,
    );

    return {
      monitoringTargets: {
        configured: monitoringTargets.length,
        enabled: monitoringTargets.filter(
          (target) => target.toObject().monitoringEnabled,
        ).length,
      },
      healthChecks: {
        configured: healthChecks.length,
        enabled: healthChecks.filter((target) => target.toObject().enabled)
          .length,
      },
      metricRules: {
        configured: metricRuleItems.length,
        enabled: metricRuleItems.filter((item) => item.rule.enabled).length,
      },
    };
  }
}
