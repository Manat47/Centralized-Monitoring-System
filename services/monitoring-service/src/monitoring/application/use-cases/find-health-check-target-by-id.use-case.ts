import { Inject, Injectable, NotFoundException } from '@nestjs/common';

import {
  HEALTH_CHECK_TARGET_REPOSITORY,
  type HealthCheckTargetRepository,
} from '../../domain/repositories/health-check-target.repository';

@Injectable()
export class FindHealthCheckTargetByIdUseCase {
  constructor(
    @Inject(HEALTH_CHECK_TARGET_REPOSITORY)
    private readonly repository: HealthCheckTargetRepository,
  ) {}

  async execute(id: string) {
    const target = await this.repository.findById(id);

    if (!target) {
      throw new NotFoundException(
        `Health check target with ID ${id} not found`,
      );
    }

    return target;
  }
}
