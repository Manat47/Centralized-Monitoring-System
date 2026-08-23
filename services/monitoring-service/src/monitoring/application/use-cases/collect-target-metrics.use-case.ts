import {
  BadRequestException,
  Inject,
  Injectable,
  NotFoundException,
} from '@nestjs/common';

import {
  METRICS_COLLECTOR_RESOLVER,
  type MetricsCollectorResolver,
} from '../../domain/ports/metrics-collector-resolver.port';
import {
  METRICS_PARSER,
  type MetricsParser,
  type ParsedMetric,
} from '../../domain/ports/metrics-parser.port';
import {
  MONITORING_TARGET_REPOSITORY,
  type MonitoringTargetRepository,
} from '../../domain/repositories/monitoring-target.repository';
import {
  METRICS_STORAGE,
  type MetricsStorage,
} from '../../domain/ports/metrics-storage.port';
import { MonitoringEndpointResolver } from '../services/monitoring-endpoint-resolver.service';
import { MonitoringConfigFingerprintService } from '../services/monitoring-config-fingerprint.service';
import { MonitoringVerificationRequiredException } from '../errors/monitoring-verification-required.exception';

const NODE_EXPORTER_SUPPORTED_METRICS = new Set([
  'node_cpu_seconds_total',

  'node_memory_MemTotal_bytes',
  'node_memory_MemAvailable_bytes',

  'node_filesystem_size_bytes',
  'node_filesystem_avail_bytes',

  'node_network_receive_bytes_total',
  'node_network_transmit_bytes_total',
]);

const APPLICATION_SUPPORTED_METRICS = new Set(['http_requests_total']);

@Injectable()
export class CollectTargetMetricsUseCase {
  constructor(
    @Inject(MONITORING_TARGET_REPOSITORY)
    private readonly monitoringTargetRepository: MonitoringTargetRepository,

    @Inject(METRICS_COLLECTOR_RESOLVER)
    private readonly metricsCollectorResolver: MetricsCollectorResolver,

    @Inject(METRICS_PARSER)
    private readonly metricsParser: MetricsParser,

    @Inject(METRICS_STORAGE)
    private readonly metricsStorage: MetricsStorage,

    private readonly monitoringEndpointResolver: MonitoringEndpointResolver,

    private readonly monitoringConfigFingerprintService: MonitoringConfigFingerprintService,
  ) {}

  async execute(targetId: string): Promise<ParsedMetric[]> {
    const target = await this.monitoringTargetRepository.findById(targetId);

    if (!target) {
      throw new NotFoundException(
        `Monitoring target with ID ${targetId} not found`,
      );
    }

    const targetData = target.toObject();

    if (!targetData.monitoringEnabled) {
      throw new BadRequestException('Monitoring target is not enabled');
    }

    const collector = this.metricsCollectorResolver.resolve(
      target.getMonitoringType(),
    );

    const scrapeUrl = await this.monitoringEndpointResolver.resolve(target, {
      requireOperational: true,
    });

    const currentFingerprint = this.monitoringConfigFingerprintService.create(
      target,
      scrapeUrl,
    );

    if (
      targetData.verificationStatus !== 'VERIFIED' ||
      !targetData.verifiedConfigFingerprint
    ) {
      throw new BadRequestException(
        'Monitoring target must be verified before collecting metrics',
      );
    }

    if (targetData.verifiedConfigFingerprint !== currentFingerprint) {
      target.invalidateVerification();

      await this.monitoringTargetRepository.update(target);

      throw new MonitoringVerificationRequiredException();
    }

    const collectionResult = await collector.collect(scrapeUrl);

    if (!collectionResult.success || !collectionResult.rawMetrics) {
      target.markCollectionFailed(
        collectionResult.errorMessage ?? 'Metrics collection failed',
      );

      await this.monitoringTargetRepository.update(target);

      throw new BadRequestException(
        collectionResult.errorMessage ?? 'Metrics collection failed',
      );
    }

    const parsedMetrics = this.metricsParser.parse(
      collectionResult.rawMetrics,
      collectionResult.collectedAt,
    );

    const supportedMetricNames =
      targetData.monitoringType === 'NODE_EXPORTER'
        ? NODE_EXPORTER_SUPPORTED_METRICS
        : APPLICATION_SUPPORTED_METRICS;

    const supportedMetrics = parsedMetrics.filter((metric) =>
      supportedMetricNames.has(metric.name),
    );

    await this.metricsStorage.writeMetrics({
      targetId: targetData.targetId,
      assetId: targetData.assetId,
      metrics: supportedMetrics,
    });

    target.markCollected();

    await this.monitoringTargetRepository.update(target);

    return supportedMetrics;
  }
}
