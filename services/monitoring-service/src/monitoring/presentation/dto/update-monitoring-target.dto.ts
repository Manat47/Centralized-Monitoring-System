import { IsIn } from 'class-validator';

import type { MonitoringAddressSource } from '../../domain/entities/monitoring-target.entity';

export class UpdateMonitoringTargetDto {
  @IsIn(['HOSTNAME', 'IP_ADDRESS'])
  addressSource!: MonitoringAddressSource;
}
