import {
  BadRequestException,
  Inject,
  Injectable,
  NotFoundException,
} from '@nestjs/common';

import {
  METRICS_COLLECTOR,
  type MetricsCollector,
} from '../../domain/ports/metrics-collector.port';
import {
  METRICS_PARSER,
  type MetricsParser,
  type ParsedMetric,
} from '../../domain/ports/metrics-parser.port';
import {
  MONITORING_TARGET_REPOSITORY,
  type MonitoringTargetRepository,
} from '../../domain/repositories/monitoring-target.repository';

const SUPPORTED_METRICS = new Set([
  'node_cpu_seconds_total',

  'node_memory_MemTotal_bytes',
  'node_memory_MemAvailable_bytes',

  'node_filesystem_size_bytes',
  'node_filesystem_avail_bytes',

  'node_network_receive_bytes_total',
  'node_network_transmit_bytes_total',
]);

@Injectable()
export class CollectTargetMetricsUseCase {
  constructor(
    @Inject(MONITORING_TARGET_REPOSITORY)
    private readonly monitoringTargetRepository: MonitoringTargetRepository,

    @Inject(METRICS_COLLECTOR)
    private readonly metricsCollector: MetricsCollector,

    @Inject(METRICS_PARSER)
    private readonly metricsParser: MetricsParser,
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

    const collectionResult = await this.metricsCollector.collect(
      target.getScrapeUrl(),
    );

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

    const supportedMetrics = parsedMetrics.filter((metric) =>
      SUPPORTED_METRICS.has(metric.name),
    );

    target.markCollected();

    await this.monitoringTargetRepository.update(target);

    return supportedMetrics;
  }
}
