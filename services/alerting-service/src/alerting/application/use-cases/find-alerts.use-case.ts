import { Inject, Injectable } from '@nestjs/common';

import type { AlertProps } from '../../domain/entities/alert.entity';
import {
  ALERT_REPOSITORY,
  type AlertRepository,
  type FindAlertsFilters,
} from '../../domain/repositories/alert.repository';

export interface FindAlertsResponse {
  items: AlertProps[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

@Injectable()
export class FindAlertsUseCase {
  constructor(
    @Inject(ALERT_REPOSITORY)
    private readonly alertRepository: AlertRepository,
  ) {}

  async execute(filters?: FindAlertsFilters): Promise<FindAlertsResponse> {
    const page = filters?.page ?? 1;
    const limit = filters?.limit ?? 20;

    const result = await this.alertRepository.findAll({
      ...filters,
      page,
      limit,
    });

    return {
      items: result.items.map((alert) => alert.toObject()),
      total: result.total,
      page,
      limit,
      totalPages: Math.ceil(result.total / limit),
    };
  }
}
