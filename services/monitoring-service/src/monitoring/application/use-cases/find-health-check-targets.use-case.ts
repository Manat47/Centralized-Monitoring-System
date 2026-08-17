import { Inject, Injectable } from '@nestjs/common';

import {
  HEALTH_CHECK_TARGET_REPOSITORY,
  type HealthCheckTargetRepository,
} from '../../domain/repositories/health-check-target.repository';

@Injectable()
export class FindHealthCheckTargetsUseCase {
  constructor(
    @Inject(HEALTH_CHECK_TARGET_REPOSITORY)
    private readonly repository: HealthCheckTargetRepository,
  ) {}

  async execute() {
    return this.repository.findAll();
  }
}
