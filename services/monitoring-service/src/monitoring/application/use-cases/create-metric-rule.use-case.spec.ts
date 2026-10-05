import { BadRequestException, ConflictException } from '@nestjs/common';
import { CreateMetricRuleUseCase } from './create-metric-rule.use-case';
import { MetricRuleType } from '../../domain/entities/metric-rule.entity';
import type { MetricRuleRepository } from '../../domain/repositories/metric-rule.repository';
import type { AssetReader } from '../../domain/ports/asset-reader.port';
import type { AuditEventPublisher } from '../../domain/ports/audit-event-publisher.port';
import type { MonitoringTargetRepository } from '../../domain/repositories/monitoring-target.repository';
import { MonitoringTarget } from '../../domain/entities/monitoring-target.entity';

const assetId = '85ffffba-fdf7-464e-aad5-1b4a3b82110a';
const input = {
  assetId,
  metricType: MetricRuleType.CPU_USAGE,
  warningThreshold: 35,
  criticalThreshold: 80,
  actorUserId: 'actor-1',
  actorRole: 'ADMIN' as const,
};

describe('CreateMetricRuleUseCase', () => {
  const repository = {
    findDuplicate: jest.fn(),
    create: jest.fn(),
  } as unknown as jest.Mocked<MetricRuleRepository>;
  const assetReader = {
    findById: jest.fn(),
  } as unknown as jest.Mocked<AssetReader>;
  const auditPublisher = {
    publish: jest.fn(),
  } as unknown as jest.Mocked<AuditEventPublisher>;
  const targetRepository = {
    findByAssetIdAndMonitoringType: jest.fn(),
  } as unknown as jest.Mocked<MonitoringTargetRepository>;
  const useCase = new CreateMetricRuleUseCase(
    repository,
    assetReader,
    auditPublisher,
    targetRepository,
  );

  beforeEach(() => {
    jest.clearAllMocks();
    assetReader.findById.mockResolvedValue({
      assetId,
      name: 'server-01',
      assetType: 'SERVER',
      ipAddress: '10.0.0.1',
      hostname: null,
      endpoint: null,
      status: 'ACTIVATE',
    });
    targetRepository.findByAssetIdAndMonitoringType.mockResolvedValue(
      MonitoringTarget.restore({
        targetId: 'target-1',
        assetId,
        monitoringType: 'NODE_EXPORTER',
        addressSource: 'IP_ADDRESS',
        protocol: 'HTTP',
        port: 9100,
        path: '/metrics',
        scrapeIntervalSeconds: 15,
        verificationStatus: 'VERIFIED',
        verifiedConfigFingerprint: 'fingerprint',
        monitoringEnabled: true,
        archivedAt: null,
        lastVerifiedAt: new Date(),
        lastAttemptedAt: new Date(),
        lastCollectedAt: new Date(),
        lastError: null,
        createdAt: new Date(),
        updatedAt: new Date(),
      }),
    );
  });

  it('rejects another current rule for the same asset and metric with 409', async () => {
    repository.findDuplicate.mockResolvedValue(
      {} as Awaited<ReturnType<MetricRuleRepository['findDuplicate']>>,
    );
    await expect(useCase.execute(input)).rejects.toBeInstanceOf(
      ConflictException,
    );
    expect(repository.create.mock.calls).toHaveLength(0);
  });

  it('rejects an inverted dual-threshold input with 400', async () => {
    await expect(
      useCase.execute({
        ...input,
        warningThreshold: 85,
        criticalThreshold: 70,
      }),
    ).rejects.toBeInstanceOf(BadRequestException);
    expect(repository.create.mock.calls).toHaveLength(0);
  });

  it('maps a concurrent unique-index violation to 409', async () => {
    repository.findDuplicate.mockResolvedValue(null);
    repository.create.mockRejectedValue({ code: '23505' });
    await expect(useCase.execute(input)).rejects.toBeInstanceOf(
      ConflictException,
    );
  });
});
