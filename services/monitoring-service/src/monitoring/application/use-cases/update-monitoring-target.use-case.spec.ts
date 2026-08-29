import type { MonitoringTarget } from '../../domain/entities/monitoring-target.entity';
import { MonitoringTarget as MonitoringTargetEntity } from '../../domain/entities/monitoring-target.entity';
import type { AuditEventPublisher } from '../../domain/ports/audit-event-publisher.port';
import type { AssetReader } from '../../domain/ports/asset-reader.port';
import type { MonitoringTargetRepository } from '../../domain/repositories/monitoring-target.repository';
import { MonitoringTargetMetricLifecycleService } from '../services/monitoring-target-metric-lifecycle.service';
import { UpdateMonitoringTargetUseCase } from './update-monitoring-target.use-case';

describe('UpdateMonitoringTargetUseCase', () => {
  const asset = {
    assetId: '85ffffba-fdf7-464e-aad5-1b4a3b82110a',
    name: 'server-01',
    assetType: 'SERVER' as const,
    ipAddress: '192.168.1.10',
    hostname: 'server-01.local',
    endpoint: null,
    status: 'ACTIVATE' as const,
  };

  function createEnabledTarget(): MonitoringTarget {
    const target = MonitoringTargetEntity.create(
      '99cb0d8c-f45d-4d95-bfdd-a3812c734769',
      {
        assetId: asset.assetId,
        monitoringType: 'NODE_EXPORTER',
        addressSource: 'HOSTNAME',
      },
    );
    target.markVerified('fingerprint');
    target.enableMonitoring();
    return target;
  }

  function setup(target = createEnabledTarget()) {
    const repository = {
      findById: jest.fn().mockResolvedValue(target),
      update: jest.fn().mockImplementation((value) => Promise.resolve(value)),
    } as unknown as jest.Mocked<MonitoringTargetRepository>;
    const assetReader = {
      findById: jest.fn().mockResolvedValue(asset),
    } as jest.Mocked<AssetReader>;
    const auditPublisher = {
      publish: jest.fn().mockResolvedValue(undefined),
    } as jest.Mocked<AuditEventPublisher>;
    const metricLifecycle = {
      transition: jest.fn().mockResolvedValue(2),
    } as unknown as jest.Mocked<MonitoringTargetMetricLifecycleService>;

    return {
      useCase: new UpdateMonitoringTargetUseCase(
        repository,
        assetReader,
        auditPublisher,
        metricLifecycle,
      ),
      repository,
      auditPublisher,
      metricLifecycle,
    };
  }

  it('invalidates verification and pauses metric rules when source changes', async () => {
    const { useCase, metricLifecycle, auditPublisher } = setup();

    const updated = await useCase.execute(
      '99cb0d8c-f45d-4d95-bfdd-a3812c734769',
      {
        addressSource: 'IP_ADDRESS',
        actorUserId: 'user-001',
        actorRole: 'ADMIN',
      },
    );

    expect(updated.toObject()).toMatchObject({
      addressSource: 'IP_ADDRESS',
      verificationStatus: 'NOT_VERIFIED',
      monitoringEnabled: false,
    });
    // eslint-disable-next-line @typescript-eslint/unbound-method
    expect(metricLifecycle.transition).toHaveBeenCalledWith(updated, 'PAUSED');
    // eslint-disable-next-line @typescript-eslint/unbound-method
    expect(auditPublisher.publish).toHaveBeenCalledWith(
      expect.objectContaining({
        action: 'MONITORING_TARGET_UPDATED',
        // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
        metadata: expect.objectContaining({
          verificationInvalidated: true,
          monitoringPaused: true,
          affectedEnabledMetricRules: 2,
        }),
      }),
    );
  });

  it('does not invalidate a target when the explicit source is unchanged', async () => {
    const target = createEnabledTarget();
    const { useCase, repository, metricLifecycle } = setup(target);

    const updated = await useCase.execute(target.toObject().targetId, {
      addressSource: 'HOSTNAME',
      actorUserId: 'user-001',
      actorRole: 'ADMIN',
    });

    expect(updated.toObject().monitoringEnabled).toBe(true);
    // eslint-disable-next-line @typescript-eslint/unbound-method
    expect(repository.update).not.toHaveBeenCalled();
    // eslint-disable-next-line @typescript-eslint/unbound-method
    expect(metricLifecycle.transition).not.toHaveBeenCalled();
  });
});
