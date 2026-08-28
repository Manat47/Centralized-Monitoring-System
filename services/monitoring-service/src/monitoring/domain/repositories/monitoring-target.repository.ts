import {
  MonitoringTarget,
  type MonitoringType,
} from '../entities/monitoring-target.entity';

export const MONITORING_TARGET_REPOSITORY = Symbol(
  'MONITORING_TARGET_REPOSITORY',
);

export interface MonitoringTargetRepository {
  create(target: MonitoringTarget): Promise<MonitoringTarget>;

  findAll(includeArchived?: boolean): Promise<MonitoringTarget[]>;

  findById(targetId: string): Promise<MonitoringTarget | null>;

  findAllByAssetId(
    assetId: string,
    includeArchived?: boolean,
  ): Promise<MonitoringTarget[]>;

  findByAssetIdAndMonitoringType(
    assetId: string,
    monitoringType: MonitoringType,
  ): Promise<MonitoringTarget | null>;

  findEnabled(): Promise<MonitoringTarget[]>;

  update(target: MonitoringTarget): Promise<MonitoringTarget>;
}
