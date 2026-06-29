import { MonitoringTarget } from '../entities/monitoring-target.entity';

export const MONITORING_TARGET_REPOSITORY = Symbol(
  'MONITORING_TARGET_REPOSITORY',
);

export interface MonitoringTargetRepository {
  create(target: MonitoringTarget): Promise<MonitoringTarget>;

  findAll(): Promise<MonitoringTarget[]>;

  findById(targetId: string): Promise<MonitoringTarget | null>;

  findByAssetId(assetId: string): Promise<MonitoringTarget | null>;

  findEnabled(): Promise<MonitoringTarget[]>;

  update(target: MonitoringTarget): Promise<MonitoringTarget>;
}
