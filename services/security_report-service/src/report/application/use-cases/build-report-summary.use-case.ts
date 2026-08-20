import { Inject, Injectable, NotFoundException } from '@nestjs/common';
import type { ReportSummary } from '../../domain/models/report-summary.model';

import {
  ASSET_REPORT_READER,
  type AssetReportReader,
  type AssetReportSnapshot,
} from '../../domain/ports/asset-report-reader.port';

import {
  MONITORING_REPORT_READER,
  type MonitoringReportReader,
} from '../../domain/ports/monitoring-report-reader.port';

import {
  ALERT_REPORT_READER,
  type AlertReportReader,
} from '../../domain/ports/alert-report-reader.port';

import { QueryAuditReportSummaryUseCase } from '../../../audit/application/use-cases/query-audit-report-summary.use-case';

export interface BuildReportSummaryInput {
  assetId?: string | null;
  periodStart: Date;
  periodEnd: Date;
}

@Injectable()
export class BuildReportSummaryUseCase {
  constructor(
    @Inject(ASSET_REPORT_READER)
    private readonly assetReportReader: AssetReportReader,

    @Inject(MONITORING_REPORT_READER)
    private readonly monitoringReportReader: MonitoringReportReader,

    @Inject(ALERT_REPORT_READER)
    private readonly alertReportReader: AlertReportReader,

    private readonly queryAuditReportSummaryUseCase: QueryAuditReportSummaryUseCase,
  ) {}

  async execute(input: BuildReportSummaryInput): Promise<ReportSummary> {
    if (input.periodStart >= input.periodEnd) {
      throw new Error('Report start time must be before end time');
    }

    const assets = await this.resolveAssets(input.assetId);

    const healthTargets =
      await this.monitoringReportReader.findHealthCheckTargets();

    const assetSummaries = await Promise.all(
      assets.map(async (asset) => {
        const targets = healthTargets.filter(
          (target) => target.assetId === asset.assetId,
        );

        const [metrics, health] = await Promise.all([
          this.monitoringReportReader.queryMetricsSummary({
            assetId: asset.assetId,
            start: input.periodStart,
            end: input.periodEnd,
          }),

          Promise.all(
            targets.map(async (target) => ({
              target,
              summary: await this.monitoringReportReader.queryHealthSummary({
                healthCheckTargetId: target.healthCheckTargetId,
                start: input.periodStart,
                end: input.periodEnd,
              }),
            })),
          ),
        ]);

        return {
          asset,
          metrics,
          health,
        };
      }),
    );

    const [alerts, audit] = await Promise.all([
      this.alertReportReader.querySummary({
        assetId: input.assetId ?? undefined,
        from: input.periodStart,
        to: input.periodEnd,
      }),

      this.queryAuditReportSummaryUseCase.execute({
        from: input.periodStart,
        to: input.periodEnd,
      }),
    ]);

    return {
      scope: {
        type: input.assetId ? 'ASSET' : 'ALL_ASSETS',
        assetId: input.assetId ?? null,
      },

      period: {
        start: input.periodStart.toISOString(),
        end: input.periodEnd.toISOString(),
      },

      assets: assetSummaries,

      alerts,

      audit: {
        scope: 'SYSTEM_WIDE',
        summary: audit,
      },
    };
  }

  private async resolveAssets(
    assetId?: string | null,
  ): Promise<AssetReportSnapshot[]> {
    if (!assetId) {
      return this.assetReportReader.findAll();
    }

    const asset = await this.assetReportReader.findById(assetId);

    if (!asset) {
      throw new NotFoundException(`Asset ${assetId} was not found`);
    }

    return [asset];
  }
}
