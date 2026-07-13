import { Alert } from '../entities/alert.entity';

export const ALERT_REPOSITORY = Symbol('ALERT_REPOSITORY');

export interface AlertRepository {
  create(alert: Alert): Promise<Alert>;

  findActiveByRuleId(ruleId: string): Promise<Alert | null>;

  findAll(): Promise<Alert[]>;

  findById(alertId: string): Promise<Alert | null>;

  update(alert: Alert): Promise<Alert>;
}
