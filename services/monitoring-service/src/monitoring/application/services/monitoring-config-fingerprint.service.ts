import { Injectable } from '@nestjs/common';
import { createHash } from 'node:crypto';

import { MonitoringTarget } from '../../domain/entities/monitoring-target.entity';

@Injectable()
export class MonitoringConfigFingerprintService {
  create(target: MonitoringTarget, resolvedUrl: string): string {
    const value = [target.getMonitoringType(), resolvedUrl].join('|');

    return createHash('sha256').update(value).digest('hex');
  }
}
